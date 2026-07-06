const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const cron = require('node-cron');

// Create Recurring Document
exports.create = async (req, res) => {
  try {
    const { type, clientId, items, taxRate = 0, frequency, nextDate } = req.body;

    const subtotal = items.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount;

    const recurring = await prisma.recurringDocument.create({
      data: {
        type,
        clientId,
        items,
        taxRate,
        frequency,
        nextDate: new Date(nextDate),
        companyId: req.user.companyId
      },
      include: { client: true }
    });

    res.json({ success: true, data: recurring });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

// Get All Recurring Documents
exports.getAll = async (req, res) => {
  try {
    const recurringDocs = await prisma.recurringDocument.findMany({
      where: { companyId: req.user.companyId },
      include: { client: true }
    });
    res.json(recurringDocs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ==================== CRON JOB - AUTO BILLING ====================

// Run every day at midnight
cron.schedule('0 0 * * *', async () => {
  console.log("🔄 [CRON] Processing recurring invoices...");

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueRecurring = await prisma.recurringDocument.findMany({
      where: {
        nextDate: { lte: today }
      },
      include: { client: true }
    });

    for (const rec of dueRecurring) {
      // Calculate totals
      const subtotal = rec.items.reduce((sum, item) => sum + (item.price * item.qty), 0);
      const taxAmount = subtotal * (rec.taxRate || 0 / 100);
      const total = subtotal + taxAmount;

      // Create actual document
      const newDocument = await prisma.document.create({
        data: {
          type: rec.type,
          number: `${rec.type.toUpperCase().slice(0,3)}-${Date.now().toString().slice(-6)}`,
          companyId: rec.companyId,
          clientId: rec.clientId,
          items: rec.items,
          subtotal,
          taxRate: rec.taxRate,
          taxAmount,
          total,
          status: "sent",
          dueDate: new Date()
        }
      });

      console.log(`✅ Created recurring document: ${newDocument.number} for client ${rec.client.name}`);

      // Update next date based on frequency
      let nextDate = new Date(rec.nextDate);

      if (rec.frequency === 'monthly') {
        nextDate.setMonth(nextDate.getMonth() + 1);
      } else if (rec.frequency === 'quarterly') {
        nextDate.setMonth(nextDate.getMonth() + 3);
      } else if (rec.frequency === 'yearly') {
        nextDate.setFullYear(nextDate.getFullYear() + 1);
      }

      await prisma.recurringDocument.update({
        where: { id: rec.id },
        data: { nextDate }
      });
    }

    console.log(`🔄 [CRON] Completed - Processed ${dueRecurring.length} recurring documents`);

  } catch (error) {
    console.error("❌ Error in recurring cron job:", error);
  }
});

console.log("✅ Recurring billing cron job scheduled (runs daily at midnight)");