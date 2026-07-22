import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const existing = await prisma.user.findFirst({
      where: { OR: [{ username }, { email }] }
    });
    if (existing) {
      return res.status(400).json({ error: 'Username or email already taken' });
    }

    const colors = ['#00ff88', '#ff6b35', '#8b5cf6', '#06b6d4', '#f43f5e', '#eab308', '#22d3ee', '#a855f7'];
    const color = colors[Math.floor(Math.random() * colors.length)];

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { username, email, passwordHash, color, walletBalance: 500000 }
    });

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      user: { id: user.id, username: user.username, email: user.email, walletBalance: user.walletBalance, dailyIncome: user.dailyIncome, totalEarnings: user.totalEarnings, color: user.color }
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      user: { id: user.id, username: user.username, email: user.email, walletBalance: user.walletBalance, dailyIncome: user.dailyIncome, totalEarnings: user.totalEarnings, color: user.color }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get current user
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: { ownedCities: { select: { id: true, name: true, code: true, gdp: true, stateId: true } } }
    });
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({
      id: user.id, username: user.username, email: user.email,
      walletBalance: user.walletBalance, dailyIncome: user.dailyIncome, totalEarnings: user.totalEarnings, color: user.color,
      ownedDistricts: user.ownedCities
    });
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
