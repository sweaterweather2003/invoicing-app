# Mobile document email

The mobile email endpoint is separate from the website's existing JWT-authenticated email routes:

```text
POST /api/firebase/documents/:documentId/send-email
Authorization: Bearer <Firebase ID token>
```

Configure these server-side environment variables on Render. They do not replace the website's existing Firebase variables:

- `MOBILE_FIREBASE_PROJECT_ID`: Firebase project ID used by the mobile app.
- `MOBILE_FIREBASE_CLIENT_EMAIL`: service-account `client_email` for that Firebase project.
- `MOBILE_FIREBASE_PRIVATE_KEY`: service-account `private_key`; preserve the PEM BEGIN/END lines. If entering it as a single-line value, use `\n` between key lines.
- `RESEND_API_KEY`: existing server-side Resend key.
- `RESEND_FROM_EMAIL`: optional verified sender address; when omitted, the controller uses Resend's onboarding sender.

Never place service-account credentials or the Resend API key in the frontend, mobile app, or source control. Rotate any credentials that have been shared outside Render.

After deploying, a POST request without a bearer token should return JSON with status `401`. The endpoint reads the document, contact, and company from the authenticated user's Firestore paths and attaches a generated PDF.
