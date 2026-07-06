const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const XLSX = require('xlsx');

const DEFAULT_COMPANY_ID = "cm2abc123";

exports.uploadProducts = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Ensure company exists
    await prisma.company.upsert({
      where: { id: DEFAULT_COMPANY_ID },
      update: {},
      create: {
        id: DEFAULT_COMPANY_ID,
        name: "Kerabeaute",
        logo: "kerabeaute_logo.png",
        tagline: "Art of Flawless Haircare",
        color: "#EAB308"
      }
    });

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    const products = jsonData.map(row => ({
      name: String(row.Name || row.name || "Unnamed Product"),
      price: parseFloat(row.Price || row.price) || 0,
      stock: parseInt(row.Stock || row.stock) || 0,
      leadTime: String(row['Lead Time'] || row.leadTime || "N/A"),
      companyId: DEFAULT_COMPANY_ID
    }));

    const result = await prisma.product.createMany({
      data: products,
      skipDuplicates: true
    });

    res.json({ 
      success: true, 
      count: result.count,
      message: `${result.count} products saved for this company!` 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

exports.uploadClients = async (req, res) => res.json({ success: true, message: "Clients upload ready" });
exports.uploadExpenses = async (req, res) => res.json({ success: true, message: "Expenses upload ready" });
exports.uploadVendors = async (req, res) => res.json({ success: true, message: "Vendors upload ready" });