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
    const error = new Error('Mobile Firebase Admin credentials are not configured');
    error.code = 'MOBILE_FIREBASE_CONFIG_MISSING';
    throw error;
  }

  try {
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
  } catch (cause) {
    const error = new Error('Mobile Firebase Admin credentials are invalid');
    error.code = 'MOBILE_FIREBASE_CONFIG_INVALID';
    error.cause = cause;
    throw error;
  }
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
    if (error.code === 'MOBILE_FIREBASE_CONFIG_MISSING' ||
        error.code === 'MOBILE_FIREBASE_CONFIG_INVALID') {
      console.error('Mobile Firebase Admin configuration error:', error.cause || error.message);
      return res.status(503).json({ error: 'Mobile authentication is not configured on the server' });
    }

    console.error('Mobile Firebase token verification failed:', error.message);
    return res.status(401).json({ error: 'Invalid or expired Firebase token' });
  }
}

module.exports = { authenticateMobileFirebase, getMobileFirebaseApp };
