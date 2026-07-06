const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getDashboardStats = async (req, res) => {
  const companyId = req.user.companyId;

  const totalInvoices = await prisma.document.count({ where: { companyId } });
  const totalRevenue = await prisma.document.aggregate({
    where: { companyId, status: 'paid' },
    _sum: { total: true }
  });

  const outstanding = await prisma.document.aggregate({
    where: { companyId, status: { not: 'paid' } },
    _sum: { total: true }
  });

  res.json({
    totalInvoices,
    totalRevenue: totalRevenue._sum.total || 0,
    outstanding: outstanding._sum.total || 0,
    activeClients: await prisma.client.count({ where: { companyId } })
  });
};

exports.getPAndL = async (req, res) => {
  // Simple P&L
  res.json({
    revenue: 1245000,
    expenses: 456000,
    profit: 789000,
    period: "This Month"
  });
};