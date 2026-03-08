// Usage: node upload-allowedPlayerIds.js
// Requires: npm install firebase-admin

const admin = require('firebase-admin');
const fs = require('fs');

// Path to your service account key JSON file
defaultServiceAccountPath = './serviceAccountKey.json';

// Path to your allowedPlayerIds.json
const allowedPlayerIdsPath = './allowedPlayerIds.json';

// Your Firebase Realtime Database URL
const databaseURL = 'https://boss-fight-8806a-default-rtdb.asia-southeast1.firebasedatabase.app';

function getServiceAccount() {
  if (fs.existsSync(defaultServiceAccountPath)) {
    return require(defaultServiceAccountPath);
  } else {
    console.error('Service account key file not found:', defaultServiceAccountPath);
    process.exit(1);
  }
}

async function uploadAllowedPlayerIds() {
  const serviceAccount = getServiceAccount();
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL
  });

  const allowedPlayerIds = JSON.parse(fs.readFileSync(allowedPlayerIdsPath, 'utf8'));
  const db = admin.database();
  await db.ref('allowedPlayerIds').set(allowedPlayerIds);
  console.log('allowedPlayerIds uploaded successfully!');
  process.exit(0);
}

uploadAllowedPlayerIds().catch(err => {
  console.error('Upload failed:', err);
  process.exit(1);
});
