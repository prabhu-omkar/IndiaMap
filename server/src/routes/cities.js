import express from 'express';
import prisma from '../lib/prisma.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// ═══ DAILY CHEST — open today's chest (get 3 random available Citys) ═══
router.get('/chest', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const today = new Date().toISOString().slice(0, 10); // "2026-05-20"

    // Check if chest already opened today
    let chest = await prisma.dailyChest.findUnique({
      where: { userId_date: { userId, date: today } },
      include: {
        city1: { include: { state: { select: { name: true, code: true } } } },
        city2: { include: { state: { select: { name: true, code: true } } } },
        city3: { include: { state: { select: { name: true, code: true } } } },
        purchased: true,
      }
    });

    if (chest) {
      return res.json({ chest, alreadyOpened: true });
    }

    // Get all unowned Citys not on auction
    const activeAuctioncityIds = (await prisma.auction.findMany({
      where: { status: 'active' },
      select: { cityId: true }
    })).map(a => a.cityId);

    const available = await prisma.city.findMany({
      where: {
        ownerId: null,
        id: { notIn: activeAuctioncityIds }
      },
      include: { state: { select: { name: true, code: true } } }
    });

    if (available.length < 3) {
      return res.status(400).json({ error: 'Not enough available Citys. Try again later.' });
    }

    // Pick 3 random
    const shuffled = available.sort(() => Math.random() - 0.5);
    const picks = shuffled.slice(0, 3);

    chest = await prisma.dailyChest.create({
      data: {
        userId,
        date: today,
        city1Id: picks[0].id,
        city2Id: picks[1].id,
        city3Id: picks[2].id,
      },
      include: {
        city1: { include: { state: { select: { name: true, code: true } } } },
        city2: { include: { state: { select: { name: true, code: true } } } },
        city3: { include: { state: { select: { name: true, code: true } } } },
      }
    });

    res.json({ chest, alreadyOpened: false });
  } catch (err) {
    console.error('Chest error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ═══ BUY FROM CHEST — buy one of the 3 chest Citys ═══
router.post('/chest/buy', authMiddleware, async (req, res) => {
  try {
    const { cityId } = req.body;
    const userId = req.userId;
    const io = req.app.get('io');
    const today = new Date().toISOString().slice(0, 10);

    const chest = await prisma.dailyChest.findUnique({
      where: { userId_date: { userId, date: today } }
    });

    if (!chest) return res.status(400).json({ error: 'Open your daily chest first!' });
    if (chest.purchasedId) return res.status(400).json({ error: 'You already bought a property today.' });

    const validIds = [chest.city1Id, chest.city2Id, chest.city3Id];
    if (!validIds.includes(cityId)) {
      return res.status(400).json({ error: 'This City is not in your chest.' });
    }

    const [user, city] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.city.findUnique({ where: { id: cityId }, include: { state: true } })
    ]);

    if (!user || !city) return res.status(404).json({ error: 'Not found' });
    if (city.ownerId) return res.status(400).json({ error: 'This city was already claimed.' });
    if (user.walletBalance < city.basePrice) {
      return res.status(400).json({ error: `Need ₹${city.basePrice.toLocaleString()} Cr` });
    }

    await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { walletBalance: { decrement: city.basePrice } } }),
      prisma.city.update({ where: { id: cityId }, data: { ownerId: userId } }),
      prisma.dailyChest.update({ where: { id: chest.id }, data: { purchasedId: cityId } }),
      prisma.transaction.create({
        data: { type: 'purchase', amount: city.basePrice, cityId, userId }
      }),
    ]);

    await recalcIncome(userId);
    io.emit('city_update', { cityId, stateCode: city.state.code });
    res.json({ success: true, message: `Bought ${city.name} for ₹${city.basePrice.toLocaleString()} Cr` });
  } catch (err) {
    console.error('Chest buy error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ═══ SELL TO BANK — get half the base price ═══
router.post('/sell-to-bank', authMiddleware, async (req, res) => {
  try {
    const { cityId } = req.body;
    const userId = req.userId;
    const io = req.app.get('io');

    const city = await prisma.city.findUnique({ where: { id: cityId }, include: { state: true } });
    if (!city) return res.status(404).json({ error: 'City not found' });
    if (city.ownerId !== userId) return res.status(403).json({ error: 'You do not own this city' });

    // Check not on auction
    const activeAuction = await prisma.auction.findFirst({
      where: { cityId, status: 'active' }
    });
    if (activeAuction) return res.status(400).json({ error: 'Cancel the auction first.' });

    const halfPrice = Math.floor(city.basePrice / 2);

    await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { walletBalance: { increment: halfPrice } } }),
      prisma.city.update({ where: { id: cityId }, data: { ownerId: null, isForSale: false, salePrice: null } }),
      prisma.transaction.create({
        data: { type: 'sale', amount: halfPrice, cityId, userId }
      }),
    ]);

    await recalcIncome(userId);
    io.emit('city_update', { cityId, stateCode: city.state.code });
    res.json({ success: true, message: `Sold ${city.name} to bank for ₹${halfPrice.toLocaleString()} Cr` });
  } catch (err) {
    console.error('Sell to bank error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ═══ AUCTIONS ═══

// Create auction (24 hours)
router.post('/auction/create', authMiddleware, async (req, res) => {
  try {
    const { cityId, startPrice } = req.body;
    const userId = req.userId;
    const io = req.app.get('io');

    const city = await prisma.city.findUnique({ where: { id: cityId }, include: { state: true } });
    if (!city) return res.status(404).json({ error: 'City not found' });
    if (city.ownerId !== userId) return res.status(403).json({ error: 'You do not own this city' });

    const existing = await prisma.auction.findFirst({ where: { cityId, status: 'active' } });
    if (existing) return res.status(400).json({ error: 'Already on auction' });

    const price = startPrice || city.basePrice;
    const endsAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const auction = await prisma.auction.create({
      data: { cityId, sellerId: userId, startPrice: price, endsAt }
    });

    io.emit('auction_update', { auctionId: auction.id });
    res.json({ success: true, message: `${city.name} listed for auction starting at ₹${price.toLocaleString()} Cr`, auction });
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
      include: { city: { include: { state: true } } }
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
        city: { include: { state: { select: { name: true, code: true } } } },
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

// Send trade (offer money for a City)
router.post('/trade/send', authMiddleware, async (req, res) => {
  try {
    const { receiverId, cityId, offeredMoney } = req.body;
    const senderId = req.userId;
    const io = req.app.get('io');

    if (senderId === receiverId) return res.status(400).json({ error: 'Cannot trade with yourself' });

    const city = await prisma.city.findUnique({ where: { id: cityId } });
    if (!city) return res.status(404).json({ error: 'City not found' });
    if (city.ownerId !== receiverId) return res.status(400).json({ error: 'They do not own this city' });

    const sender = await prisma.user.findUnique({ where: { id: senderId } });
    if (sender.walletBalance < offeredMoney) return res.status(400).json({ error: 'Insufficient balance' });

    // Check no pending trade for same City from same sender
    const existing = await prisma.trade.findFirst({
      where: { senderId, requestedCityId: cityId, status: 'pending' }
    });
    if (existing) return res.status(400).json({ error: 'You already have a pending trade for this City' });

    const trade = await prisma.trade.create({
      data: { senderId, receiverId, requestedCityId: cityId, offeredMoney }
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
      include: { city: { include: { state: true } } }
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
          requestedCityId: trade.requestedCityId,
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

      const city = trade.city;
      if (city.ownerId !== userId) {
        return res.status(400).json({ error: 'You no longer own this city' });
      }

      await prisma.$transaction([
        prisma.user.update({ where: { id: trade.senderId }, data: { walletBalance: { decrement: money } } }),
        prisma.user.update({ where: { id: userId }, data: { walletBalance: { increment: money } } }),
        prisma.city.update({ where: { id: city.id }, data: { ownerId: trade.senderId, isForSale: false, salePrice: null } }),
        prisma.trade.update({ where: { id: tradeId }, data: { status: 'accepted' } }),
        prisma.transaction.create({
          data: { type: 'trade', amount: money, cityId: city.id, userId: trade.senderId, sellerId: userId }
        }),
      ]);

      await recalcIncome(trade.senderId);
      await recalcIncome(userId);
      io.emit('city_update', { cityId: city.id, stateCode: city.state.code });
      io.emit('trade_update', { tradeId, senderId: trade.senderId });
      return res.json({ success: true, message: `Trade accepted! ${city.name} sold for ₹${money.toLocaleString()} Cr` });
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
        city: { include: { state: { select: { name: true, code: true } } } },
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
  const cities = await prisma.city.findMany({
    where: { ownerId: userId },
    include: { state: true }
  });

  // Group by state to check full ownership
  const stateGroups = {};
  for (const d of cities) {
    if (!stateGroups[d.stateId]) stateGroups[d.stateId] = { cities: [], totalInState: d.state.totalCities };
    stateGroups[d.stateId].cities.push(d);
  }

  let totalIncome = 0;
  for (const stateId of Object.keys(stateGroups)) {
    const group = stateGroups[stateId];
    const stateGdp = group.cities.reduce((sum, d) => sum + d.gdp, 0);
    // x5 bonus if all Citys owned
    const multiplier = (group.cities.length >= group.totalInState && group.totalInState > 0) ? 5 : 1;
    totalIncome += stateGdp * multiplier;
  }

  await prisma.user.update({
    where: { id: userId },
    data: { dailyIncome: totalIncome }
  });
}

export { recalcIncome };
export default router;
