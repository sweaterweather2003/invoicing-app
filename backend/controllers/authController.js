const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = new PrismaClient();

exports.register = async (req, res) => {
  const { email, password, companyName } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  const result = await prisma.$transaction(async (tx) => {
    const company = await tx.company.create({ data: { name: companyName || "My Company" } });
    const user = await tx.user.create({
      data: { email, password: hashedPassword, companyId: company.id }
    });
    return { user, company };
  });

  const token = jwt.sign({ id: result.user.id, companyId: result.company.id }, process.env.JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, user: result.user, company: result.company });
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email }, include: { company: true } });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = jwt.sign({ id: user.id, companyId: user.companyId }, process.env.JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, user, company: user.company });
};