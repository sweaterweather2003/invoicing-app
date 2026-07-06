const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.create = async (req, res) => {
  const product = await prisma.product.create({
    data: { ...req.body, companyId: req.user.companyId }
  });
  res.json(product);
};

exports.getAll = async (req, res) => {
  const products = await prisma.product.findMany({ where: { companyId: req.user.companyId } });
  res.json(products);
};
