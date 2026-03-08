const {setGlobalOptions} = require("firebase-functions/v2");
const {onRequest, onCall, HttpsError} = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

setGlobalOptions({maxInstances: 10, region: "asia-southeast1"});

admin.initializeApp();

exports.ping = onRequest((req, res) => {
	res.status(200).send("ok");
});

exports.registerPlayer = onCall(async (req) => {
	const data = req.data || {};
	const playerId = String(data.playerId || "").trim();
	const password = String(data.password || "");

	if (!/^\d{6}$/.test(playerId)) {
		throw new HttpsError("invalid-argument", "playerId must be 6 digits");
	}
	if (password.length < 6) {
		throw new HttpsError("invalid-argument", "password must be at least 6 chars");
	}

	const allowRef = admin.database().ref("allowedPlayerIds/" + playerId);

	const tx = await allowRef.transaction((current) => {
		if (!current) return;
		if (current.used) return;
		return {
			...current,
			used: true,
			usedAt: Date.now(),
		};
	});

	if (!tx.committed || !tx.snapshot.exists()) {
		throw new HttpsError("permission-denied", "ID not allowed or already used");
	}

	const email = playerId + "@player.local";
	let created = null;
	try {
		created = await admin.auth().createUser({
			uid: playerId,
			email,
			password,
		});
	} catch (err) {
		await allowRef.update({used: false, usedAt: null});
		throw new HttpsError("already-exists", err.message || "createUser failed");
	}

	return {
		ok: true,
		uid: created.uid,
		email,
	};
});
