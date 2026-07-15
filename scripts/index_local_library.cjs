/**
 * Local Library Indexer for Firestore
 * 
 * Run using:
 *    > node scripts/index_local_library.cjs
 */

require('dotenv').config();
const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

const firebaseProjectId = 'eu-projects-generator-5-69dd0';
const geminiKey = process.env.GEMINI_API_KEY;

if (!geminiKey) {
  console.error('❌ Error: GEMINI_API_KEY environment variable is not defined in .env');
  process.exit(1);
}

// Initialize Firebase Admin using active CLI credentials
admin.initializeApp({
  projectId: firebaseProjectId
});
const db = getFirestore();

async function callGeminiWithRetry(apiFn, retries = 4, delayMs = 12000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await apiFn();
    } catch (err) {
      console.warn(`⚠️  Gemini call failed (attempt ${attempt}/${retries}): ${err.message}`);
      if (attempt === retries) throw err;
      const sleepTime = delayMs * attempt;
      console.log(`💤 Sleeping ${sleepTime / 1000}s before retry...`);
      await new Promise(resolve => setTimeout(resolve, sleepTime));
    }
  }
}
const genAI = new GoogleGenerativeAI(geminiKey);

async function indexFile(filePath) {
  const fileName = path.basename(filePath);
  const sourceName = fileName.replace('.pdf', '');

  console.log(`\n========================================`);
  console.log(`📁 Processing: ${fileName}`);
  console.log(`========================================`);

  try {
    // 1. Check if already indexed in global_knowledge
    const snap = await db.collection('global_knowledge')
      .where('source_name', '==', sourceName)
      .limit(1)
      .get();

    if (!snap.empty) {
      console.log(`⏭️  Already indexed, skipping.`);
      return;
    }

    // 2. Read file to base64
    const buffer = fs.readFileSync(filePath);
    const base64Data = buffer.toString('base64');
    console.log(`⚙️  Converted to Base64. Size: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);

    // 3. Request Gemini 2.5 Flash to extract intelligence chunks
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const prompt = `You are a Senior European Grant Expert. Deeply analyze the guidelines for "${sourceName}".
        
        EXTRACT 10-15 TECHNICAL KNOWLEDGE CHUNKS covering eligibility, criteria, budget rules, or best practices.
        Return ONLY valid JSON with this exact structure:
        {
          "chunks": [
            {
              "content": "Professional technical description of criteria, rule or best practice...",
              "type": "criteria" | "best_practice" | "output",
              "keywords": ["specific_key1", "specific_key2"]
            }
          ]
        }`;

    console.log(`🧠 Querying Gemini 2.5 Flash for chunk extraction (with retry support)...`);
    const result = await callGeminiWithRetry(() => model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: "application/pdf",
          data: base64Data
        }
      }
    ]), 4, 15000);

    const responseText = result.response.text();
    const firstBrace = responseText.indexOf('{');
    const lastBrace = responseText.lastIndexOf('}');
    if (firstBrace === -1 || lastBrace === -1) {
      throw new Error('No JSON object found in response: ' + responseText);
    }
    const cleanedText = responseText.substring(firstBrace, lastBrace + 1);

    const parsed = JSON.parse(cleanedText);
    const chunks = parsed.chunks || [];
    console.log(`✨ Gemini extracted ${chunks.length} chunks.`);

    if (chunks.length === 0) {
      console.warn('⚠️  No chunks returned, skipping.');
      return;
    }

    // 4. Generate embeddings and save to Firestore
    console.log(`🔮 Generating embeddings for each chunk...`);
    const embeddingModel = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });
    const batch = db.batch();

    for (const chunk of chunks) {
      let embedding = [];
      try {
        const embResult = await callGeminiWithRetry(() => embeddingModel.embedContent(chunk.content), 3, 3000);
        embedding = embResult.embedding.values;
      } catch (embErr) {
        console.warn(`⚠️  Embedding failed for chunk, omitting embedding vector: ${embErr.message}`);
      }

      const docRef = db.collection('global_knowledge').doc();
      batch.set(docRef, {
        source_name: sourceName,
        sourceName: sourceName,
        content: chunk.content,
        embedding: embedding,
        metadata: {
          type: chunk.type,
          keywords: chunk.keywords || [],
          source_id: fileName
        },
        created_at: new Date().toISOString()
      });
    }

    await batch.commit();
    console.log(`✅ Indexed ${chunks.length} chunks into Firestore.`);
  } catch (error) {
    console.error(`❌ Failed to index ${fileName}:`, error);
    console.log(`💤 Sleeping 30s after failure to let rate-limits/sockets cool down...`);
    await new Promise(resolve => setTimeout(resolve, 30000));
  }
}

async function start() {
  const libraryDir = path.resolve(process.cwd(), 'Global Library');
  
  if (!fs.existsSync(libraryDir)) {
    console.error(`❌ Error: Global Library directory does not exist at "${libraryDir}"`);
    process.exit(1);
  }

  const files = fs.readdirSync(libraryDir).filter(f => f.toLowerCase().endsWith('.pdf'));
  console.log(`📚 Found ${files.length} PDF documents in Global Library.`);

  for (const file of files) {
    const filePath = path.join(libraryDir, file);
    await indexFile(filePath);
    console.log(`💤 Sleeping 12s before next playbook to avoid rate limits...`);
    await new Promise(resolve => setTimeout(resolve, 12000));
  }

  console.log('\n🎉 ALL LOCAL LIBRARY GUIDELINES PROCESSED AND SEMANTICALLY SEEDED!');
  process.exit(0);
}

start();
