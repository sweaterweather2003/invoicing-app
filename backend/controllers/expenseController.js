const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.create = async (req, res) => {
  const expense = await prisma.expense.create({
    data: { ...req.body, companyId: req.user.companyId }
  });
  res.json(expense);
};

exports.getAll = async (req, res) => {
  const expenses = await prisma.expense.findMany({ where: { companyId: req.user.companyId } });
  res.json(expenses);
};