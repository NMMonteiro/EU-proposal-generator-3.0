/**
 * Aurora Library Indexer using Gemini 2.0 Flash
 */

require('dotenv').config();
const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

const geminiKey = process.env.GEMINI_API_KEY;
const firebaseProjectId = process.env.FIREBASE_PROJECT_ID || 'eu-projects-generator-5-69dd0';

if (!geminiKey) {
  console.error("❌ Error: GEMINI_API_KEY is not defined in environment.");
  process.exit(1);
}

// 1. Initialize Firebase Admin
admin.initializeApp({
  projectId: firebaseProjectId
});
const db = getFirestore();

// 2. Initialize Gemini 2.0
const genAI = new GoogleGenerativeAI(geminiKey);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
const embeddingModel = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });

async function run() {
  const filePath = path.resolve(process.cwd(), 'Global Library', 'Interreg Aurora Programe guide 2026.pdf');
  const fileName = 'Interreg Aurora Programe guide 2026.pdf';
  const sourceName = 'Interreg Aurora Programe guide 2026';

  console.log(`🚀 Seeding Aurora guide using Gemini 2.0 Flash...`);
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Error: File not found at "${filePath}"`);
    process.exit(1);
  }

  try {
    const buffer = fs.readFileSync(filePath);
    const base64Data = buffer.toString('base64');

    const prompt = `You are a Senior European Grant Expert. Deeply analyze the guidelines for "${fileName}".
        EXTRACT 15-20 TECHNICAL KNOWLEDGE CHUNKS (e.g. eligibility criteria, budget rules, lump-sum constraints, scoring weights, alignment best practices).
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

    console.log(`🧠 Querying Gemini 2.0 Flash...`);
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: "application/pdf",
          data: base64Data
        }
      }
    ]);

    const responseText = result.response.text();
    const firstBrace = responseText.indexOf('{');
    const lastBrace = responseText.lastIndexOf('}');
    if (firstBrace === -1 || lastBrace === -1) {
      throw new Error('No JSON object found in response');
    }
    const cleanedText = responseText.substring(firstBrace, lastBrace + 1);
    const parsed = JSON.parse(cleanedText);
    const chunks = parsed.chunks || [];
    console.log(`✨ Extracted ${chunks.length} chunks.`);

    if (chunks.length === 0) {
      console.warn('⚠️ No chunks found.');
      return;
    }

    console.log(`🔮 Generating embeddings...`);
    const batch = db.batch();

    for (const chunk of chunks) {
      const embResult = await embeddingModel.embedContent(chunk.content);
      const embedding = embResult.embedding.values;

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
    console.log(`✅ Success: Indexed ${chunks.length} chunks for Interreg Aurora Programe guide 2026 into Firestore.`);
  } catch (error) {
    console.error("❌ Failed to index Aurora guide:", error);
  }
  process.exit(0);
}

run();
