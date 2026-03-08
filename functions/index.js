const {setGlobalOptions} = require("firebase-functions/v2");
const {onRequest, onCall, HttpsError} = require("firebase-functions/v2/https");
const functions = require("firebase-functions");
const admin = require("firebase-admin");

setGlobalOptions({maxInstances: 10, region: "asia-southeast1"});

admin.initializeApp();

exports.ping = onRequest((req, res) => {
	res.status(200).send("ok");
});

exports.registerPlayer = onCall(async (req) => {
	// Admin callable function to reset/delete a player (Auth + allowedPlayerIds)
	exports.resetPlayer = onCall(async (req) => {
		const data = req.data || {};
		const playerId = String(data.playerId || '').trim();
		const adminSecret = String(data.adminSecret || '');

		// ใช้ค่า secret จาก firebase functions:config:set admin.secret="xxxx"
		const configSecret = functions.config().admin && functions.config().admin.secret;
		if (!configSecret || adminSecret !== configSecret) {
			throw new HttpsError('permission-denied', 'Invalid admin secret');
		}
		if (!/^[0-9]{6}$/.test(playerId)) {
			throw new HttpsError('invalid-argument', 'playerId must be 6 digits');
		}

		// Remove Auth user if exists
		let authDeleted = false;
		try {
			await admin.auth().deleteUser(playerId);
			authDeleted = true;
		} catch (e) {
			if (e.code !== 'auth/user-not-found') {
				throw new HttpsError('internal', 'Failed to delete Auth user: ' + e.message);
			}
		}

		// Reset allowedPlayerIds DB entry
		const allowRef = admin.database().ref('allowedPlayerIds/' + playerId);
		const snap = await allowRef.get();
		if (snap.exists()) {
			await allowRef.update({ used: false, usedAt: null });
		}

		return {
			ok: true,
			authDeleted,
			dbReset: snap.exists(),
		};
	});
	// Admin callable function to reset/delete a player (Auth + allowedPlayerIds)
	exports.resetPlayer = onCall(async (req) => {
		const data = req.data || {};
		const playerId = String(data.playerId || '').trim();
		const adminSecret = String(data.adminSecret || '');

		// Simple admin check (replace with env var or better method in production)
		if (adminSecret !== process.env.ADMIN_SECRET) {
			throw new HttpsError('permission-denied', 'Invalid admin secret');
		}
		if (!/^[0-9]{6}$/.test(playerId)) {
			throw new HttpsError('invalid-argument', 'playerId must be 6 digits');
		}

		// Remove Auth user if exists
		let authDeleted = false;
		try {
			await admin.auth().deleteUser(playerId);
			authDeleted = true;
		} catch (e) {
			if (e.code !== 'auth/user-not-found') {
				throw new HttpsError('internal', 'Failed to delete Auth user: ' + e.message);
			}
		}

		// Reset allowedPlayerIds DB entry
		const allowRef = admin.database().ref('allowedPlayerIds/' + playerId);
		const snap = await allowRef.get();
		if (snap.exists()) {
			await allowRef.update({ used: false, usedAt: null });
		}

		return {
			ok: true,
			authDeleted,
			dbReset: snap.exists(),
		};
	});
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
	const usedRef = allowRef.child("used");
	const usedAtRef = allowRef.child("usedAt");

	const tx = await usedRef.transaction((used) => {
		if (used === true) return;
		return true;
	});
	if (tx.committed) {
		await usedAtRef.set(Date.now());
	}

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
