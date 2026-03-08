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
	const snap = await allowRef.get();
	const current = snap.val();

	if (!current) {
		throw new HttpsError("permission-denied", "ID not allowed");
	}
	if (current.used === true) {
		throw new HttpsError("permission-denied", "ID already used");
	}

	const tx = await allowRef.transaction((row) => {
		if (!row) return;
		if (row.used) return;
		return {
			...row,
			used: true,
			usedAt: Date.now(),
		};
	});

	if (!tx.committed || !tx.snapshot.exists()) {
		try {
			await admin.auth().getUser(playerId);
			throw new HttpsError("permission-denied", "ID already used");
		} catch (e) {
			if (e && e.code === "auth/user-not-found") {
				throw new HttpsError("aborted", "ID is being processed, please retry");
			}
			throw e;
		}
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
