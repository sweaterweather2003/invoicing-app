const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DEFAULT_COMPANY_ID = "cm2abc123";

// GET products for current company
router.get('/', async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: { companyId: DEFAULT_COMPANY_ID },
      orderBy: { name: 'asc' }
    });
    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE single product
router.delete('/:id', async (req, res) => {
  try {
    await prisma.product.delete({
      where: { id: req.params.id }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE all products for current company
router.delete('/', async (req, res) => {
  try {
    await prisma.product.deleteMany({
      where: { companyId: DEFAULT_COMPANY_ID }
    });
    res.json({ success: true, message: "All products deleted for this company" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;