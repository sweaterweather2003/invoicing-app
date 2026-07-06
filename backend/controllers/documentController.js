const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.create = async (req, res) => {
  try {
    const { type, clientId, items, taxRate = 0, dueDate } = req.body;

    const subtotal = items.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount;

    const document = await prisma.document.create({
      data: {
        type,
        number: `${type.toUpperCase().slice(0,3)}-${Date.now().toString().slice(-6)}`,
        companyId: req.user.companyId,
        clientId,
        items,
        subtotal,
        taxRate,
        taxAmount,
        total,
        dueDate: dueDate ? new Date(dueDate) : null,
        status: "draft"
      },
      include: { client: true }
    });

    res.json(document);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    const documents = await prisma.document.findMany({
      where: { companyId: req.user.companyId },
      include: { client: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(documents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update when email is sent
exports.markAsSent = async (req, res) => {
  try {
    const { id } = req.params;

    const document = await prisma.document.update({
      where: { id },
      data: {
        status: "sent",
        sentAt: new Date()
      }
    });

    res.json({ success: true, document });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  create: exports.create,
  getAll: exports.getAll,
  markAsSent: exports.markAsSent
};