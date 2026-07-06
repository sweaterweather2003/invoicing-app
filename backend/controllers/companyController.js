const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getCompany = async (req, res) => {
  const company = await prisma.company.findUnique({ where: { id: req.user.companyId } });
  res.json(company);
};

exports.updateCompany = async (req, res) => {
  const company = await prisma.company.update({
    where: { id: req.user.companyId },
    data: req.body
  });
  res.json(company);
};