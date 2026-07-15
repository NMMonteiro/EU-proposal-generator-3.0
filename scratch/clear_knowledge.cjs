const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

const firebaseProjectId = 'eu-projects-generator-5-69dd0';

admin.initializeApp({
  projectId: firebaseProjectId
});
const db = getFirestore();

async function main() {
  console.log('🧹 Clearing global_knowledge collection...');
  const collectionRef = db.collection('global_knowledge');
  const snapshot = await collectionRef.get();
  
  if (snapshot.empty) {
    console.log('Collection is already empty.');
    process.exit(0);
  }

  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  await batch.commit();
  console.log(`Successfully deleted ${snapshot.size} documents.`);
  process.exit(0);
}

main().catch(console.error);
