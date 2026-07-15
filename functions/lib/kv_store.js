"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getByPrefix = exports.del = exports.set = exports.get = void 0;
const firebase_db_1 = require("./firebase_db");
const get = async (key) => {
    const doc = await firebase_db_1.db.collection('kv_store').doc(key).get();
    if (!doc.exists)
        return null;
    return doc.data()?.value || null;
};
exports.get = get;
const set = async (key, value) => {
    await firebase_db_1.db.collection('kv_store').doc(key).set({
        value,
        updatedAt: new Date().toISOString()
    });
};
exports.set = set;
const del = async (key) => {
    await firebase_db_1.db.collection('kv_store').doc(key).delete();
};
exports.del = del;
const getByPrefix = async (prefix) => {
    // Range query using standard Firestore document name logic
    const snap = await firebase_db_1.db.collection('kv_store')
        .where('__name__', '>=', prefix)
        .where('__name__', '<', prefix + '\uf8ff')
        .get();
    const results = [];
    snap.forEach(doc => {
        const val = doc.data()?.value;
        if (val) {
            results.push(val);
        }
    });
    return results;
};
exports.getByPrefix = getByPrefix;
//# sourceMappingURL=kv_store.js.map