// reset-all-players.js
// Node.js script to call the resetPlayer callable function for all playerIds

const fs = require('fs');
const path = require('path');
const { initializeApp } = require('firebase/app');
const { getFunctions, httpsCallable } = require('firebase/functions');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');

// === CONFIGURATION ===

const firebaseConfig = {
  apiKey: "AIzaSyC9wj2fQXhLJf2LAN-A2DZn2ph7gdCQHs",
  authDomain: "boss-fight-8806a.firebaseapp.com",
  databaseURL: "https://boss-fight-8806a-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "boss-fight-8806a",
  storageBucket: "boss-fight-8806a.appspot.com",
  messagingSenderId: "198605626220",
  appId: "1:198605626220:web:bdd28ff95e9b440ab7149",
};
const adminSecret = "changeme1234";
const allowedPlayerIdsPath = path.join(__dirname, 'allowedPlayerIds.json');

const adminEmail = "kaminaginoniwa@gmail.com";
const adminPassword = "Helpmekrub101";

async function main() {
  // Load playerIds
  const allowed = JSON.parse(fs.readFileSync(allowedPlayerIdsPath, 'utf8'));
  const playerIds = Object.keys(allowed);

  // Init Firebase
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const functions = getFunctions(app, 'asia-southeast1');

  // Login as admin
  await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
  console.log('Admin login success!');

  // Prepare callable function
  const resetPlayer = httpsCallable(functions, 'resetPlayer');

  for (const playerId of playerIds) {
    try {
      const result = await resetPlayer({ playerId, adminSecret });
      console.log(`Reset ${playerId}:`, result.data);
    } catch (err) {
      console.error(`Failed to reset ${playerId}:`, err.message);
    }
  }
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
