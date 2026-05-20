import express from 'express';
import prisma from '../lib/prisma.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    // Rank users by total GDP income (daily income = sum of all owned district GDPs)
    const users = await prisma.user.findMany({
      where: { ownedDistricts: { some: {} } },
      include: {
        ownedDistricts: { select: { name: true, code: true, gdp: true, state: { select: { name: true } } } }
      },
      orderBy: { dailyIncome: 'desc' },
      take: 20
    });

    const leaderboard = users.map((u, i) => ({
      id: u.id,
      rank: i + 1,
      username: u.username,
      color: u.color,
      dailyIncome: u.dailyIncome,
      totalEarnings: u.totalEarnings,
      districtsOwned: u.ownedDistricts.length,
      territories: u.ownedDistricts.slice(0, 5).map(d => d.name),
    }));

    res.json({ type: 'empire', data: leaderboard });
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
