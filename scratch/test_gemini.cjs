const { GoogleGenerativeAI } = require('@google/generative-ai');
const key = process.env.GEMINI_API_KEY;

async function testModel(modelName) {
  try {
    console.log(`Testing ${modelName}...`);
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.embedContent('Hello world');
    console.log(`✨ Success with ${modelName}! Vector size:`, result.embedding.values.length);
    return true;
  } catch (error) {
    console.error(`❌ Error with ${modelName}:`, error.message);
    return false;
  }
}

async function main() {
  const model1 = 'gemini' + '-embedding-001';
  const model2 = 'text' + '-embedding-004';
  
  await testModel(model1);
  await testModel(model2);
}

main();
