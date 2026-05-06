const admin = require('firebase-admin');

const keyPath =
  'C:\\Users\\PMGO170326C\\Documents\\PMGI INCIDENT REPORT SYSTEM\\pmgi-incident-report\\pmgi-incident-report-firebase-adminsdk-fbsvc-724c9c08b1.json';
const emails = ['vincentguerta896@gmail.com'];
const role = 'admin';

admin.initializeApp({
  credential: admin.credential.cert(require(keyPath)),
});

const db = admin.firestore();

async function run() {
  for (const email of emails) {
    const snap = await db
      .collection('users')
      .where('email', '==', email)
      .get();

    if (snap.empty) {
      console.log('No user found for ' + email);
      continue;
    }

    await Promise.all(snap.docs.map((doc) => doc.ref.update({ role })));
    console.log('Updated ' + snap.size + ' user(s) for ' + email);
  }
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
