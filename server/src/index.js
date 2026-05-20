import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import cron from 'node-cron';
import prisma from './lib/prisma.js';
import { recalcIncome } from './routes/cities.js';

import authRoutes from './routes/auth.js';
import stateRoutes from './routes/states.js';
import cityRoutes from './routes/cities.js';

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

app.set('io', io);
app.set('prisma', prisma);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/states', stateRoutes);
app.use('/api/cities', cityRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Socket.io
io.on('connection', (socket) => {
  console.log(`🔌 User connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`🔌 User disconnected: ${socket.id}`);
  });
});

// ═══ AUCTION RESOLVER — runs every minute, settles ended auctions ═══
cron.schedule('* * * * *', async () => {
  try {
    const endedAuctions = await prisma.auction.findMany({
      where: { status: 'active', endsAt: { lte: new Date() } },
      include: { city: { include: { state: true } }, seller: true, bidder: true }
    });

    for (const auction of endedAuctions) {
      if (auction.currentBid && auction.bidderId) {
        // Winner found — transfer district
        const bidder = auction.bidder;
        if (bidder.walletBalance >= auction.currentBid) {
          await prisma.$transaction([
            prisma.user.update({ where: { id: auction.bidderId }, data: { walletBalance: { decrement: auction.currentBid } } }),
            prisma.user.update({ where: { id: auction.sellerId }, data: { walletBalance: { increment: auction.currentBid } } }),
            prisma.city.update({ where: { id: auction.cityId }, data: { ownerId: auction.bidderId, isForSale: false, salePrice: null } }),
            prisma.auction.update({ where: { id: auction.id }, data: { status: 'ended' } }),
            prisma.transaction.create({
              data: { type: 'auction_win', amount: auction.currentBid, cityId: auction.cityId, userId: auction.bidderId, sellerId: auction.sellerId }
            }),
          ]);
          await recalcIncome(auction.bidderId);
          await recalcIncome(auction.sellerId);
          console.log(`🏷️ Auction won: ${auction.city.name} → ${bidder.username} for ₹${auction.currentBid}`);
        } else {
          // Bidder can't pay — auction fails
          await prisma.auction.update({ where: { id: auction.id }, data: { status: 'ended' } });
          console.log(`❌ Auction failed (insufficient funds): ${auction.city.name}`);
        }
      } else {
        // No bids — just end it
        await prisma.auction.update({ where: { id: auction.id }, data: { status: 'ended' } });
        console.log(`🏷️ Auction ended (no bids): ${auction.city.name}`);
      }
      io.emit('auction_update', { auctionId: auction.id });
      io.emit('city_update', { cityId: auction.cityId, stateCode: auction.city.state.code });
    }
  } catch (err) {
    console.error('❌ Auction resolver error:', err);
  }
});

// Daily Income Cron — runs at midnight IST (18:30 UTC previous day)
cron.schedule('30 18 * * *', async () => {
  console.log('💰 Running daily income distribution...');
  try {
    const users = await prisma.user.findMany({
      where: { ownedCities: { some: {} } },
      include: { ownedCities: { include: { state: true } } }
    });

    for (const user of users) {
      // recalcIncome already handles x5 bonus
      await recalcIncome(user.id);
      const updatedUser = await prisma.user.findUnique({ where: { id: user.id } });
      const income = updatedUser.dailyIncome;

      if (income > 0) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            walletBalance: { increment: income },
            totalEarnings: { increment: income },
          }
        });

        await prisma.transaction.create({
          data: { type: 'income', amount: income, userId: user.id }
        });

        console.log(`  💰 ${user.username}: +₹${income.toLocaleString()} Cr`);
      }
    }

    io.emit('daily_income', {
      message: 'Daily income distributed!',
      timestamp: new Date().toISOString(),
    });

    console.log(`💰 Income distributed to ${users.length} users.`);
  } catch (err) {
    console.error('❌ Income distribution error:', err);
  }
}, { timezone: 'Asia/Kolkata' });

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`\n🏰 EmpireIndia Server running on port ${PORT}`);
  console.log(`📡 WebSocket ready`);
  console.log(`🏷️ Auction resolver running every minute`);
  console.log(`💰 Daily income scheduled at 00:00 IST\n`);
});
