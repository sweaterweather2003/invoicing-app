const { getFirestore } = require('firebase-admin/firestore');
const PDFDocument = require('pdfkit');
const { Resend } = require('resend');
const { getMobileFirebaseApp } = require('../middleware/mobileFirebaseAuth');

const DOCUMENT_LABELS = {
  invoice: 'Invoice',
  proforma: 'Proforma Invoice',
  credit_note: 'Credit Note',
  debit_note: 'Debit Note',
  rfq: 'Request for Quotation',
  purchase_order: 'Purchase Order',
  quote: 'Quote',
};

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function amount(value) {
  return `INR ${Number(value || 0).toFixed(2)}`;
}

function formatDate(value) {
  const date = value && typeof value.toDate === 'function'
    ? value.toDate()
    : new Date(value);

  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-IN');
}

function createPdf(document, contact, company) {
  return new Promise((resolve, reject) => {
    const pdf = new PDFDocument({ margin: 48 });
    const chunks = [];

    pdf.on('data', (chunk) => chunks.push(chunk));
    pdf.on('end', () => resolve(Buffer.concat(chunks)));
    pdf.on('error', reject);

    pdf.fontSize(20).text(company.name || 'Company');
    pdf.moveDown();
    pdf.fontSize(16).text(
      `${DOCUMENT_LABELS[document.type]} ${document.number || ''}`
    );
    pdf.fontSize(11).text(`To: ${contact.name || ''}`);
    pdf.text(`Date: ${formatDate(document.createdAt)}`);
    pdf.moveDown();

    for (const item of document.items || []) {
      const quantity = Number(item.qty) || 0;
      const price = Number(item.price) || 0;
      pdf.text(
        `${item.name || 'Item'} | ${quantity} x ${amount(price)} | ${amount(quantity * price)}`
      );
    }

    pdf.moveDown();
    pdf.text(`Subtotal: ${amount(document.subtotal)}`, { align: 'right' });
    pdf.text(`Tax (${Number(document.taxRate) || 0}%): ${amount(document.taxAmount)}`, { align: 'right' });
    pdf.fontSize(14).text(`Total: ${amount(document.total)}`, { align: 'right' });
    if (document.notes) pdf.moveDown().fontSize(11).text(`Notes: ${document.notes}`);

    pdf.end();
  });
}

function createEmailHtml(document, contact, company) {
  const rows = (document.items || [])
    .map((item) => {
      const quantity = Number(item.qty) || 0;
      const price = Number(item.price) || 0;
      return `<tr>
        <td>${escapeHtml(item.name)}</td>
        <td style="text-align:center">${quantity}</td>
        <td style="text-align:right">${amount(price)}</td>
        <td style="text-align:right">${amount(quantity * price)}</td>
      </tr>`;
    })
    .join('');

  return `<!doctype html>
    <html><body style="font-family:Arial,sans-serif;color:#1f2937;line-height:1.5">
      <main style="max-width:680px;margin:0 auto;padding:24px">
        <h1>${escapeHtml(company.name)}</h1>
        <p>${escapeHtml(DOCUMENT_LABELS[document.type])} ${escapeHtml(document.number)}</p>
        <p>To: ${escapeHtml(contact.name)}</p>
        <table style="width:100%;border-collapse:collapse">
          <thead><tr>
            <th style="text-align:left">Item</th>
            <th style="text-align:center">Qty</th>
            <th style="text-align:right">Rate</th>
            <th style="text-align:right">Total</th>
          </tr></thead>
          <tbody>${rows || '<tr><td colspan="4">No items</td></tr>'}</tbody>
        </table>
        <p style="text-align:right">Subtotal: ${amount(document.subtotal)}</p>
        <p style="text-align:right">Tax: ${amount(document.taxAmount)}</p>
        <h2 style="text-align:right">Total: ${amount(document.total)}</h2>
        ${document.notes ? `<p><strong>Notes:</strong><br>${escapeHtml(document.notes).replace(/\n/g, '<br>')}</p>` : ''}
        <p>The PDF copy is attached.</p>
      </main>
    </body></html>`;
}

exports.sendMobileDocument = async (req, res) => {
  if (!process.env.RESEND_API_KEY) {
    return res.status(503).json({ error: 'Resend is not configured on the server' });
  }

  const documentId = req.params.documentId;
  if (!documentId || documentId.includes('/')) {
    return res.status(400).json({ error: 'Invalid document ID' });
  }

  try {
    const userId = req.firebaseUser.uid;
    const firestore = getFirestore(getMobileFirebaseApp());
    const documentRef = firestore.doc(
      `users/${userId}/documents/${documentId}`
    );
    const documentSnapshot = await documentRef.get();

    if (!documentSnapshot.exists) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const document = { id: documentSnapshot.id, ...documentSnapshot.data() };
    const label = DOCUMENT_LABELS[document.type];
    if (!label) {
      return res.status(400).json({ error: 'This document type cannot be emailed' });
    }
    if (typeof document.clientId !== 'string' || typeof document.companyId !== 'string') {
      return res.status(400).json({ error: 'Document is missing its buyer/supplier or company' });
    }

    const [contactSnapshot, companySnapshot] = await Promise.all([
      firestore.doc(`users/${userId}/clients/${document.clientId}`).get(),
      firestore.doc(`users/${userId}/companies/${document.companyId}`).get(),
    ]);
    if (!contactSnapshot.exists || !companySnapshot.exists) {
      return res.status(400).json({ error: 'Buyer/supplier or company not found' });
    }

    const contact = contactSnapshot.data();
    const company = companySnapshot.data();
    if (contact.companyId && contact.companyId !== document.companyId) {
      return res.status(400).json({ error: 'Buyer/supplier does not belong to this company' });
    }

    const toEmail = String(contact.email || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail)) {
      return res.status(400).json({ error: 'Add a valid email to the buyer/supplier first' });
    }

    const pdf = await createPdf(document, contact, company);
    const resend = new Resend(process.env.RESEND_API_KEY);
    const result = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      to: [toEmail],
      subject: `${label} ${document.number} from ${company.name}`,
      html: createEmailHtml(document, contact, company),
      attachments: [{
        filename: `${String(document.number || 'document').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`,
        content: pdf.toString('base64'),
      }],
    });

    if (result.error) {
      console.error('Resend error:', result.error);
      return res.status(502).json({ error: 'Resend could not deliver the email' });
    }

    const status = document.status === 'draft'
      ? (document.type === 'rfq' ? 'waiting_for_approval' : 'sent')
      : document.status;
    await documentRef.update({
      status,
      sentAt: new Date().toISOString(),
      sentTo: toEmail,
    });

    return res.json({
      success: true,
      recipientEmail: toEmail,
      documentNumber: document.number,
      status,
    });
  } catch (error) {
    console.error('Mobile document email failed:', error);
    return res.status(500).json({ error: 'Failed to send document email' });
  }
};
