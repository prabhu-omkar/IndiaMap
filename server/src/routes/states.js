import express from 'express';
import prisma from '../lib/prisma.js';

const router = express.Router();

// Get all states with city ownership summary
router.get('/', async (req, res) => {
  try {
    const states = await prisma.state.findMany({
      include: {
        cities: {
          select: {
            id: true, name: true, code: true, gdp: true, population: true,
            basePrice: true, ownerId: true, isForSale: true, salePrice: true,
            owner: { select: { id: true, username: true, color: true } }
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    const result = states.map(s => ({
      ...s,
      ownedCount: s.cities.filter(d => d.ownerId).length,
      forSaleCount: s.cities.filter(d => d.isForSale).length,
    }));

    res.json(result);
  } catch (err) {
    console.error('Get states error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single state with full city data
router.get('/:id', async (req, res) => {
  try {
    const state = await prisma.state.findUnique({
      where: { id: req.params.id },
      include: {
        cities: {
          include: {
            owner: { select: { id: true, username: true, color: true } }
          },
          orderBy: { gdp: 'desc' }
        }
      }
    });
    if (!state) return res.status(404).json({ error: 'State not found' });
    res.json(state);
  } catch (err) {
    console.error('Get state error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
