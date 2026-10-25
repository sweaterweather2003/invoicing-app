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
  return `₹${Number(value || 0).toFixed(2)}`;
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
    pdf.text(`Date: ${new Date(document.createdAt).toLocaleDateString('en-IN')}`);
    pdf.moveDown();

    for (const item of document.items || []) {
      const qty = Number(item.qty) || 0;
      const price = Number(item.price) || 0;
      pdf.text(
        `${item.name || 'Item'} | ${qty} x ${amount(price)} | ${amount(qty * price)}`
      );
    }

    pdf.moveDown();
    pdf.text(`Subtotal: ${amount(document.subtotal)}`, { align: 'right' });
    pdf.text(`Tax: ${amount(document.taxAmount)}`, { align: 'right' });
    pdf.fontSize(14).text(`Total: ${amount(document.total)}`, { align: 'right' });
    if (document.notes) pdf.moveDown().fontSize(11).text(`Notes: ${document.notes}`);

    pdf.end();
  });
}

exports.sendMobileDocument = async (req, res) => {
  try {
    if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
      return res.status(503).json({ error: 'Resend is not configured on the server' });
    }

    const userId = req.firebaseUser.uid;
    const firestore = getFirestore(getMobileFirebaseApp());
    const documentRef = firestore.doc(
      `users/${userId}/documents/${req.params.documentId}`
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
    if (!document.clientId || !document.companyId) {
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
    const toEmail = String(contact.email || '').trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail)) {
      return res.status(400).json({ error: 'Add a valid email to the buyer/supplier first' });
    }

    const pdf = await createPdf(document, contact, company);
    const itemsHtml = (document.items || []).map((item) => `
      <tr>
        <td>${escapeHtml(item.name)}</td>
        <td>${Number(item.qty) || 0}</td>
        <td>${amount(item.price)}</td>
        <td>${amount((Number(item.qty) || 0) * (Number(item.price) || 0))}</td>
      </tr>
    `).join('');

    const resend = new Resend(process.env.RESEND_API_KEY);
    const result = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL,
      to: [toEmail],
      subject: `${label} ${document.number} from ${company.name}`,
      html: `
        <h2>${escapeHtml(company.name)}</h2>
        <p>${escapeHtml(label)} ${escapeHtml(document.number)}</p>
        <p>To: ${escapeHtml(contact.name)}</p>
        <table>
          <thead><tr><th>Item</th><th>Qty</th><th>Rate</th><th>Total</th></tr></thead>
          <tbody>${itemsHtml}</tbody>
        </table>
        <p>Subtotal: ${amount(document.subtotal)}</p>
        <p>Tax: ${amount(document.taxAmount)}</p>
        <h3>Total: ${amount(document.total)}</h3>
        ${document.notes ? `<p>Notes: ${escapeHtml(document.notes)}</p>` : ''}
        <p>The PDF copy is attached.</p>
      `,
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
