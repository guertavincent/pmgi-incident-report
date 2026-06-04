/* eslint-disable @typescript-eslint/no-require-imports */
/*
  Usage (PowerShell):
  $env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\service-account.json"
  node scripts\set_admin_role.js user@example.com

  This sets users/{uid}.role = "admin" in Firestore.
*/

const admin = require('firebase-admin');

const email = process.argv[2];
if (!email) {
  console.error('Missing email. Usage: node scripts\\set_admin_role.js user@example.com');
  process.exit(1);
}

if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

const auth = admin.auth();
const db = admin.firestore();

async function run() {
  const userRecord = await auth.getUserByEmail(email);
  const userRef = db.collection('users').doc(userRecord.uid);

  await userRef.set(
    {
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: userRecord.displayName || '',
      role: 'admin',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  console.log(`Admin role set for ${userRecord.email} (${userRecord.uid}).`);
}

run().catch((err) => {
  console.error('Failed to set admin role:', err);
  process.exit(1);
});
