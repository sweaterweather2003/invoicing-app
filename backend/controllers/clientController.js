const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.create = async (req, res) => {
  const client = await prisma.client.create({
    data: { ...req.body, companyId: req.user.companyId }
  });
  res.json(client);
};

exports.getAll = async (req, res) => {
  const clients = await prisma.client.findMany({ where: { companyId: req.user.companyId } });
  res.json(clients);
};