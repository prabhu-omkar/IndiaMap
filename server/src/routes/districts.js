import express from 'express';
import prisma from '../lib/prisma.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// ═══ DAILY CHEST — open today's chest (get 3 random available districts) ═══
router.get('/chest', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const today = new Date().toISOString().slice(0, 10); // "2026-05-20"

    // Check if chest already opened today
    let chest = await prisma.dailyChest.findUnique({
      where: { userId_date: { userId, date: today } },
      include: {
        district1: { include: { state: { select: { name: true, code: true } } } },
        district2: { include: { state: { select: { name: true, code: true } } } },
        district3: { include: { state: { select: { name: true, code: true } } } },
        purchased: true,
      }
    });

    if (chest) {
      return res.json({ chest, alreadyOpened: true });
    }

    // Get all unowned districts not on auction
    const activeAuctionDistrictIds = (await prisma.auction.findMany({
      where: { status: 'active' },
      select: { districtId: true }
    })).map(a => a.districtId);

    const available = await prisma.district.findMany({
      where: {
        ownerId: null,
        id: { notIn: activeAuctionDistrictIds }
      },
      include: { state: { select: { name: true, code: true } } }
    });

    if (available.length < 3) {
      return res.status(400).json({ error: 'Not enough available districts. Try again later.' });
    }

    // Pick 3 random
    const shuffled = available.sort(() => Math.random() - 0.5);
    const picks = shuffled.slice(0, 3);

    chest = await prisma.dailyChest.create({
      data: {
        userId,
        date: today,
        district1Id: picks[0].id,
        district2Id: picks[1].id,
        district3Id: picks[2].id,
      },
      include: {
        district1: { include: { state: { select: { name: true, code: true } } } },
        district2: { include: { state: { select: { name: true, code: true } } } },
        district3: { include: { state: { select: { name: true, code: true } } } },
      }
    });

    res.json({ chest, alreadyOpened: false });
  } catch (err) {
    console.error('Chest error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ═══ BUY FROM CHEST — buy one of the 3 chest districts ═══
router.post('/chest/buy', authMiddleware, async (req, res) => {
  try {
    const { districtId } = req.body;
    const userId = req.userId;
    const io = req.app.get('io');
    const today = new Date().toISOString().slice(0, 10);

    const chest = await prisma.dailyChest.findUnique({
      where: { userId_date: { userId, date: today } }
    });

    if (!chest) return res.status(400).json({ error: 'Open your daily chest first!' });
    if (chest.purchasedId) return res.status(400).json({ error: 'You already bought a property today.' });

    const validIds = [chest.district1Id, chest.district2Id, chest.district3Id];
    if (!validIds.includes(districtId)) {
      return res.status(400).json({ error: 'This district is not in your chest.' });
    }

    const [user, district] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.district.findUnique({ where: { id: districtId }, include: { state: true } })
    ]);

    if (!user || !district) return res.status(404).json({ error: 'Not found' });
    if (district.ownerId) return res.status(400).json({ error: 'This district was already claimed.' });
    if (user.walletBalance < district.basePrice) {
      return res.status(400).json({ error: `Need ₹${district.basePrice.toLocaleString()} Cr` });
    }

    await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { walletBalance: { decrement: district.basePrice } } }),
      prisma.district.update({ where: { id: districtId }, data: { ownerId: userId } }),
      prisma.dailyChest.update({ where: { id: chest.id }, data: { purchasedId: districtId } }),
      prisma.transaction.create({
        data: { type: 'purchase', amount: district.basePrice, districtId, userId }
      }),
    ]);

    await recalcIncome(userId);
    io.emit('district_update', { districtId, stateCode: district.state.code });
    res.json({ success: true, message: `Bought ${district.name} for ₹${district.basePrice.toLocaleString()} Cr` });
  } catch (err) {
    console.error('Chest buy error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ═══ SELL TO BANK — get half the base price ═══
router.post('/sell-to-bank', authMiddleware, async (req, res) => {
  try {
    const { districtId } = req.body;
    const userId = req.userId;
    const io = req.app.get('io');

    const district = await prisma.district.findUnique({ where: { id: districtId }, include: { state: true } });
    if (!district) return res.status(404).json({ error: 'District not found' });
    if (district.ownerId !== userId) return res.status(403).json({ error: 'You do not own this district' });

    // Check not on auction
    const activeAuction = await prisma.auction.findFirst({
      where: { districtId, status: 'active' }
    });
    if (activeAuction) return res.status(400).json({ error: 'Cancel the auction first.' });

    const halfPrice = Math.floor(district.basePrice / 2);

    await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { walletBalance: { increment: halfPrice } } }),
      prisma.district.update({ where: { id: districtId }, data: { ownerId: null, isForSale: false, salePrice: null } }),
      prisma.transaction.create({
        data: { type: 'sale', amount: halfPrice, districtId, userId }
      }),
    ]);

    await recalcIncome(userId);
    io.emit('district_update', { districtId, stateCode: district.state.code });
    res.json({ success: true, message: `Sold ${district.name} to bank for ₹${halfPrice.toLocaleString()} Cr` });
  } catch (err) {
    console.error('Sell to bank error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ═══ AUCTIONS ═══

// Create auction (24 hours)
router.post('/auction/create', authMiddleware, async (req, res) => {
  try {
    const { districtId, startPrice } = req.body;
    const userId = req.userId;
    const io = req.app.get('io');

    const district = await prisma.district.findUnique({ where: { id: districtId }, include: { state: true } });
    if (!district) return res.status(404).json({ error: 'District not found' });
    if (district.ownerId !== userId) return res.status(403).json({ error: 'You do not own this district' });

    const existing = await prisma.auction.findFirst({ where: { districtId, status: 'active' } });
    if (existing) return res.status(400).json({ error: 'Already on auction' });

    const price = startPrice || district.basePrice;
    const endsAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const auction = await prisma.auction.create({
      data: { districtId, sellerId: userId, startPrice: price, endsAt }
    });

    io.emit('auction_update', { auctionId: auction.id });
    res.json({ success: true, message: `${district.name} listed for auction starting at ₹${price.toLocaleString()} Cr`, auction });
  } catch (err) {
    console.error('Auction create error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Place bid
router.post('/auction/bid', authMiddleware, async (req, res) => {
  try {
    const { auctionId, amount } = req.body;
    const userId = req.userId;
    const io = req.app.get('io');

    const auction = await prisma.auction.findUnique({
      where: { id: auctionId },
      include: { district: { include: { state: true } } }
    });

    if (!auction) return res.status(404).json({ error: 'Auction not found' });
    if (auction.status !== 'active') return res.status(400).json({ error: 'Auction is not active' });
    if (new Date() > auction.endsAt) return res.status(400).json({ error: 'Auction has ended' });
    if (auction.sellerId === userId) return res.status(400).json({ error: 'Cannot bid on your own auction' });

    const minBid = auction.currentBid ? auction.currentBid + Math.max(1000, auction.currentBid * 0.05) : auction.startPrice;
    if (amount < minBid) return res.status(400).json({ error: `Minimum bid: ₹${Math.ceil(minBid).toLocaleString()} Cr` });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user.walletBalance < amount) return res.status(400).json({ error: 'Insufficient balance' });

    await prisma.auction.update({
      where: { id: auctionId },
      data: { currentBid: amount, bidderId: userId }
    });

    io.emit('auction_update', { auctionId });
    res.json({ success: true, message: `Bid ₹${amount.toLocaleString()} Cr placed!` });
  } catch (err) {
    console.error('Auction bid error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Cancel auction (only if no bids)
router.post('/auction/cancel', authMiddleware, async (req, res) => {
  try {
    const { auctionId } = req.body;
    const userId = req.userId;
    const io = req.app.get('io');

    const auction = await prisma.auction.findUnique({ where: { id: auctionId } });
    if (!auction) return res.status(404).json({ error: 'Auction not found' });
    if (auction.sellerId !== userId) return res.status(403).json({ error: 'Not your auction' });
    if (auction.currentBid) return res.status(400).json({ error: 'Cannot cancel — bids already placed' });

    await prisma.auction.update({ where: { id: auctionId }, data: { status: 'cancelled' } });
    io.emit('auction_update', { auctionId });
    res.json({ success: true, message: 'Auction cancelled' });
  } catch (err) {
    console.error('Auction cancel error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// List active auctions
router.get('/auctions', async (req, res) => {
  try {
    const auctions = await prisma.auction.findMany({
      where: { status: 'active' },
      include: {
        district: { include: { state: { select: { name: true, code: true } } } },
        seller: { select: { id: true, username: true, color: true } },
        bidder: { select: { id: true, username: true, color: true } },
      },
      orderBy: { endsAt: 'asc' }
    });
    res.json(auctions);
  } catch (err) {
    console.error('Auctions list error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ═══ TRADES ═══

// Send trade (offer money for a district)
router.post('/trade/send', authMiddleware, async (req, res) => {
  try {
    const { receiverId, districtId, offeredMoney } = req.body;
    const senderId = req.userId;
    const io = req.app.get('io');

    if (senderId === receiverId) return res.status(400).json({ error: 'Cannot trade with yourself' });

    const district = await prisma.district.findUnique({ where: { id: districtId } });
    if (!district) return res.status(404).json({ error: 'District not found' });
    if (district.ownerId !== receiverId) return res.status(400).json({ error: 'They do not own this district' });

    const sender = await prisma.user.findUnique({ where: { id: senderId } });
    if (sender.walletBalance < offeredMoney) return res.status(400).json({ error: 'Insufficient balance' });

    // Check no pending trade for same district from same sender
    const existing = await prisma.trade.findFirst({
      where: { senderId, requestedDistrictId: districtId, status: 'pending' }
    });
    if (existing) return res.status(400).json({ error: 'You already have a pending trade for this district' });

    const trade = await prisma.trade.create({
      data: { senderId, receiverId, requestedDistrictId: districtId, offeredMoney }
    });

    io.emit('trade_update', { tradeId: trade.id, receiverId });
    res.json({ success: true, message: 'Trade offer sent!', trade });
  } catch (err) {
    console.error('Trade send error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Respond to trade (accept / decline / counter)
router.post('/trade/respond', authMiddleware, async (req, res) => {
  try {
    const { tradeId, action, counterMoney } = req.body; // action: "accept" | "decline" | "counter"
    const userId = req.userId;
    const io = req.app.get('io');

    const trade = await prisma.trade.findUnique({
      where: { id: tradeId },
      include: { district: { include: { state: true } } }
    });

    if (!trade) return res.status(404).json({ error: 'Trade not found' });
    if (trade.receiverId !== userId) return res.status(403).json({ error: 'Not your trade to respond to' });
    if (trade.status !== 'pending') return res.status(400).json({ error: 'Trade is no longer pending' });

    if (action === 'decline') {
      await prisma.trade.update({ where: { id: tradeId }, data: { status: 'declined' } });
      io.emit('trade_update', { tradeId, senderId: trade.senderId });
      return res.json({ success: true, message: 'Trade declined' });
    }

    if (action === 'counter') {
      if (!counterMoney || counterMoney <= 0) return res.status(400).json({ error: 'Counter amount required' });
      // Swap sender/receiver — counter becomes a new offer back
      await prisma.trade.update({ where: { id: tradeId }, data: { status: 'countered', counterMoney } });
      // Create reverse trade
      await prisma.trade.create({
        data: {
          senderId: userId,
          receiverId: trade.senderId,
          requestedDistrictId: trade.requestedDistrictId,
          offeredMoney: counterMoney,
          status: 'pending',
        }
      });
      io.emit('trade_update', { tradeId, senderId: trade.senderId });
      return res.json({ success: true, message: `Counter offer of ₹${counterMoney.toLocaleString()} Cr sent!` });
    }

    if (action === 'accept') {
      const money = trade.offeredMoney;
      const sender = await prisma.user.findUnique({ where: { id: trade.senderId } });
      if (!sender || sender.walletBalance < money) {
        return res.status(400).json({ error: 'Buyer has insufficient balance' });
      }

      const district = trade.district;
      if (district.ownerId !== userId) {
        return res.status(400).json({ error: 'You no longer own this district' });
      }

      await prisma.$transaction([
        prisma.user.update({ where: { id: trade.senderId }, data: { walletBalance: { decrement: money } } }),
        prisma.user.update({ where: { id: userId }, data: { walletBalance: { increment: money } } }),
        prisma.district.update({ where: { id: district.id }, data: { ownerId: trade.senderId, isForSale: false, salePrice: null } }),
        prisma.trade.update({ where: { id: tradeId }, data: { status: 'accepted' } }),
        prisma.transaction.create({
          data: { type: 'trade', amount: money, districtId: district.id, userId: trade.senderId, sellerId: userId }
        }),
      ]);

      await recalcIncome(trade.senderId);
      await recalcIncome(userId);
      io.emit('district_update', { districtId: district.id, stateCode: district.state.code });
      io.emit('trade_update', { tradeId, senderId: trade.senderId });
      return res.json({ success: true, message: `Trade accepted! ${district.name} sold for ₹${money.toLocaleString()} Cr` });
    }

    res.status(400).json({ error: 'Invalid action' });
  } catch (err) {
    console.error('Trade respond error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// My trades (sent + received)
router.get('/trades', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const trades = await prisma.trade.findMany({
      where: {
        OR: [{ senderId: userId }, { receiverId: userId }],
        status: 'pending',
      },
      include: {
        sender: { select: { id: true, username: true, color: true } },
        receiver: { select: { id: true, username: true, color: true } },
        district: { include: { state: { select: { name: true, code: true } } } },
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(trades);
  } catch (err) {
    console.error('Trades list error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Helper: recalculate daily income with x5 bonus for full-state ownership
async function recalcIncome(userId) {
  const districts = await prisma.district.findMany({
    where: { ownerId: userId },
    include: { state: true }
  });

  // Group by state to check full ownership
  const stateGroups = {};
  for (const d of districts) {
    if (!stateGroups[d.stateId]) stateGroups[d.stateId] = { districts: [], totalInState: d.state.totalDistricts };
    stateGroups[d.stateId].districts.push(d);
  }

  let totalIncome = 0;
  for (const stateId of Object.keys(stateGroups)) {
    const group = stateGroups[stateId];
    const stateGdp = group.districts.reduce((sum, d) => sum + d.gdp, 0);
    // x5 bonus if all districts owned
    const multiplier = (group.districts.length >= group.totalInState && group.totalInState > 0) ? 5 : 1;
    totalIncome += stateGdp * multiplier;
  }

  await prisma.user.update({
    where: { id: userId },
    data: { dailyIncome: totalIncome }
  });
}

export { recalcIncome };
export default router;
