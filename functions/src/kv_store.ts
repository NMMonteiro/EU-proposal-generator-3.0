import { db } from './firebase_db';

export const get = async (key: string) => {
    const doc = await db.collection('kv_store').doc(key).get();
    if (!doc.exists) return null;
    return doc.data()?.value || null;
};

export const set = async (key: string, value: any) => {
    await db.collection('kv_store').doc(key).set({
        value,
        updatedAt: new Date().toISOString()
    });
};

export const del = async (key: string) => {
    await db.collection('kv_store').doc(key).delete();
};

export const getByPrefix = async (prefix: string) => {
    // Range query using standard Firestore document name logic
    const snap = await db.collection('kv_store')
        .where('__name__', '>=', prefix)
        .where('__name__', '<', prefix + '\uf8ff')
        .get();
        
    const results: any[] = [];
    snap.forEach(doc => {
        const val = doc.data()?.value;
        if (val) {
            results.push(val);
        }
    });
    return results;
};
