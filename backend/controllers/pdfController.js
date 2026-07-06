const puppeteer = require('puppeteer');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.generateDynamicPDF = async (req, res) => {
  let browser;
  try {
    const doc = req.body; 

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Helvetica', Arial, sans-serif; margin: 40px; color: #333; line-height: 1.4; }
        .letterhead { text-align: center; margin-bottom: 30px; }
        .logo { height: 80px; object-fit: contain; margin-bottom: 10px; }
        .header { display: flex; justify-content: space-between; border-bottom: 4px solid #3b82f6; padding-bottom: 20px; margin-bottom: 30px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #eee; padding: 12px; text-align: left; }
        th { background: #f9f9f9; text-transform: uppercase; font-size: 12px; }
        .total-section { text-align: right; margin-top: 30px; }
        .grand-total { font-size: 1.5em; font-weight: bold; color: #111; }
      </style>
    </head>
    <body>
      <div class="letterhead">
        <img src="${doc.logoUrl || ''}" class="logo">
        <h1 style="margin:0; color:#3b82f6;">${doc.companyName}</h1>
      </div>
      
      <div class="header">
        <div><h2 style="margin:0; text-transform: uppercase;">${doc.type}</h2></div>
        <div style="text-align:right">
          <p style="margin:0;"><strong>Number:</strong> ${doc.number}</p>
          <p style="margin:0;"><strong>Date:</strong> ${new Date().toLocaleDateString('en-IN')}</p>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th style="text-align:center;">Qty</th>
            <th style="text-align:right;">Price</th>
            <th style="text-align:right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${doc.items.map(item => `
            <tr>
              <td>${item.name}</td>
              <td style="text-align:center;">${item.qty}</td>
              <td style="text-align:right;">₹${item.price.toFixed(2)}</td>
              <td style="text-align:right;">₹${(item.qty * item.price).toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="total-section">
        <p>Subtotal: ₹${(doc.subtotal || 0).toFixed(2)}</p>
        <p>Tax: ₹${(doc.taxAmount || 0).toFixed(2)}</p>
        <div class="grand-total">Total: ₹${(doc.total || 0).toFixed(2)}</div>
      </div>
    </body>
    </html>`;

    browser = await puppeteer.launch({ 
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    const pdfBuffer = await page.pdf({ 
      format: 'A4', 
      printBackground: true,
      margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
    });

    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${doc.number}.pdf`);
    res.send(pdfBuffer);

  } catch (error) {
    if (browser) await browser.close();
    console.error("PDF Generation Error:", error);
    res.status(500).json({ error: "Failed to generate PDF" });
  }
};

exports.generatePDF = async (req, res) => {
  try {
    const { documentId } = req.params;
    const doc = await prisma.document.findUnique({
      where: { id: documentId },
      include: { company: true, client: true, items: true }
    });
    if (!doc) return res.status(404).json({ error: "Document not found" });
    res.status(501).json({ message: "DB PDF logic pending" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};