const { cert, getApps, initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

function getMobileFirebaseApp() {
  const name = 'mobile-firebase-admin';
  const existing = getApps().find((app) => app.name === name);
  if (existing) return existing;

  const projectId = process.env.MOBILE_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.MOBILE_FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.MOBILE_FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Mobile Firebase Admin credentials are not configured');
  }

  return initializeApp(
    {
      credential: cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n'),
      }),
      projectId,
    },
    name
  );
}

async function authenticateMobileFirebase(req, res, next) {
  const authorization = req.headers.authorization || '';
  const token = authorization.startsWith('Bearer ')
    ? authorization.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({ error: 'Firebase sign-in token required' });
  }

  try {
    req.firebaseUser = await getAuth(getMobileFirebaseApp()).verifyIdToken(token);
    return next();
  } catch (error) {
    if (error.message.includes('credentials are not configured')) {
      console.error(error.message);
      return res.status(503).json({ error: 'Mobile authentication is not configured' });
    }

    console.error('Mobile Firebase token verification failed:', error.message);
    return res.status(401).json({ error: 'Invalid or expired Firebase token' });
  }
}

module.exports = { authenticateMobileFirebase, getMobileFirebaseApp };
