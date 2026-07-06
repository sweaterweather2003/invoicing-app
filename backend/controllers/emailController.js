const { Resend } = require('resend');
const puppeteer = require('puppeteer');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const resend = new Resend(process.env.RESEND_API_KEY);

exports.sendDocument = async (req, res) => {
  let browser;
  try {
    const { toEmail, dynamicData } = req.body;
    
    const doc = {
      ...dynamicData,
      createdAt: new Date(),
      company: { 
        name: dynamicData.companyName || "Our Company", 
        logo: dynamicData.logoUrl || "",
        brandColor: "#3b82f6" 
      }
    };

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Helvetica', Arial, sans-serif; margin: 40px; color: #333; line-height: 1.5; }
        .letterhead { text-align: center; margin-bottom: 30px; }
        .logo { height: 80px; max-width: 200px; object-fit: contain; margin-bottom: 10px; }
        .header { display: flex; justify-content: space-between; border-bottom: 4px solid #3b82f6; padding-bottom: 20px; margin-bottom: 30px; }
        table { width: 100%; border-collapse: collapse; margin: 25px 0; }
        th, td { border: 1px solid #eee; padding: 12px; text-align: left; }
        th { background: #f9f9f9; font-weight: bold; }
        .total-section { text-align: right; margin-top: 30px; font-size: 1.2em; font-weight: bold; }
        .footer { margin-top: 50px; font-size: 0.8em; color: #777; text-align: center; }
      </style>
    </head>
    <body>
      <div class="letterhead">
        ${doc.company.logo ? `<img src="${doc.company.logo}" class="logo">` : ''}
        <h1>${doc.company.name}</h1>
      </div>
      <div class="header">
        <div>
          <h2 style="margin:0; color:#3b82f6;">${doc.type.toUpperCase()}</h2>
          <p>To: ${toEmail}</p>
        </div>
        <div style="text-align:right">
          <p><strong>No:</strong> ${doc.number}</p>
          <p><strong>Date:</strong> ${doc.createdAt.toLocaleDateString()}</p>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th style="text-align:center">Qty</th>
            <th style="text-align:right">Price</th>
            <th style="text-align:right">Total</th>
          </tr>
        </thead>
        <tbody>
          ${doc.items.map(item => `
            <tr>
              <td>${item.name}</td>
              <td style="text-align:center">${item.qty}</td>
              <td style="text-align:right">₹${item.price.toFixed(2)}</td>
              <td style="text-align:right">₹${(item.qty * item.price).toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="total-section">
        <p>Subtotal: ₹${doc.subtotal.toFixed(2)}</p>
        <p>Tax: ₹${doc.taxAmount.toFixed(2)}</p>
        <p style="color:#3b82f6; font-size: 1.4em;">Grand Total: ₹${doc.total.toFixed(2)}</p>
      </div>
      <div class="footer">
        <p>Thank you for your business!</p>
      </div>
    </body>
    </html>`;

    console.log("🚀 Launching Puppeteer for PDF...");
    browser = await puppeteer.launch({ 
      headless: "new", 
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-zygote',
        '--single-process'
      ]
    });

    const page = await browser.newPage();
    
    await page.setDefaultNavigationTimeout(60000); 

    await page.setContent(htmlContent, { 
      waitUntil: 'networkidle0', 
      timeout: 60000 
    });
    
    const pdfBuffer = await page.pdf({ 
      format: 'A4', 
      printBackground: true,
      margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
    });

    await browser.close();
    console.log("✅ PDF Generated successfully.");

    const base64Content = Buffer.from(pdfBuffer).toString('base64');

    console.log(`📧 Sending email to: ${toEmail}`);
    
    const { data, error } = await resend.emails.send({
      from: 'sales@wilrichmyer.com',   
      to: toEmail,
      subject: `${doc.type.toUpperCase()} #${doc.number} from ${doc.company.name}`,
      html: `<p>Please find your requested ${doc.type} attached as a PDF.</p>`,
      attachments: [
        {
          filename: `${doc.number}.pdf`,
          content: base64Content,
        },
      ],
    });

    if (error) {
      console.error("❌ Resend API Error:", error);
      return res.status(400).json({ success: false, error });
    }

    console.log("✅ Email sent successfully:", data.id);
    res.json({ success: true, messageId: data.id });

  } catch (error) {
    if (browser) await browser.close();
    console.error("❌ Controller Error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};
