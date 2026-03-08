// reset-all-players-admin.js
// Node.js script to reset all player accounts using Firebase Admin SDK

const fs = require('fs');
const admin = require('firebase-admin');

// ใช้ service account key ที่ดาวน์โหลดมา
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://boss-fight-8806a-default-rtdb.asia-southeast1.firebasedatabase.app"
});

const allowed = JSON.parse(fs.readFileSync('allowedPlayerIds.json', 'utf8'));
const playerIds = Object.keys(allowed);

async function resetPlayer(playerId) {
  // ลบผู้ใช้ใน Auth
  try {
    await admin.auth().deleteUser(playerId);
    console.log(`Deleted Auth user: ${playerId}`);
  } catch (e) {
    if (e.code !== 'auth/user-not-found') {
      console.error(`Failed to delete Auth user ${playerId}:`, e.message);
    } else {
      console.log(`Auth user not found: ${playerId}`);
    }
  }
  // รีเซ็ต DB
  const ref = admin.database().ref('allowedPlayerIds/' + playerId);
  await ref.update({ used: false, usedAt: null });
  console.log(`Reset DB for: ${playerId}`);
}

(async () => {
  for (const playerId of playerIds) {
    await resetPlayer(playerId);
  }
  console.log('All done!');
  process.exit(0);
})();
