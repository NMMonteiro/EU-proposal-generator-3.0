/**
 * Firestore Database Seeder
 * 
 * Run this script using:
 *    > node scripts/seed_firestore.cjs
 */

const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

const firebaseProjectId = 'eu-projects-generator-5-69dd0';

// Initialize Firebase Admin utilizing active CLI session
admin.initializeApp({
  projectId: firebaseProjectId
});
const db = getFirestore();

// 1. Erasmus+ KA220-YOU 2025 Template Definition
const ka220Scheme = {
  id: "ka220-you-2025",
  name: "Erasmus+ KA220-YOU 2025",
  description: "Cooperation partnerships in youth (KA220-YOU) - Official 2025 Structure",
  is_default: true,
  isDefault: true,
  logic_mode: "standard",
  logicMode: "standard",
  template_json: {
    schemaVersion: "1.0",
    sections: [
      {
        key: "context",
        label: "Context",
        order: 1,
        mandatory: true,
        type: "structured",
        description: "Field, Project Title, Project Start Date, Project total Duration, National Agency, Language.",
        aiPrompt: "Extract project metadata: Title, Start Date, Duration (Months), National Agency, and Language. Format as clear key-value pairs."
      },
      {
        key: "project_summary",
        label: "Project Summary",
        order: 2,
        mandatory: true,
        description: "Objectives: What do you want to achieve? Implementation: What activities are you going to implement? Results: What project results? Include context/background, number and profile of participants, methodology, impact, and longer-term benefits.",
        aiPrompt: "Draft a comprehensive Project Summary. Must address: 1) Context/Background, 2) Objectives, 3) Participants profile, 4) Activities description, 5) Methodology, 6) Expected Results and Impact. Tone: Professional and clear."
      },
      {
        key: "relevance",
        label: "Relevance of the project",
        order: 3,
        mandatory: true,
        description: "How does the project address selected priorities? Motivation, objectives, concrete results. Innovation. Complementarity. Synergies. European added value. Needs analysis: Target groups and identification of needs.",
        aiPrompt: "Draft the Relevance section. Address: 1) Alignment with EU priorities, 2) Motivation and innovation, 3) Synergies with other fields, 4) European added value, 5) Detailed Needs Analysis for target groups."
      },
      {
        key: "partnership_arrangements",
        label: "Partnership and cooperation arrangements",
        order: 4,
        mandatory: true,
        description: "How did you form your partnership? How does the mix of organisations complement each other? Task allocation. Mechanism for coordination and communication.",
        aiPrompt: "Draft the Partnership arrangements section. Explain: 1) Why these partners were chosen, 2) How they complement each other, 3) Detailed task allocation, 4) Communication and coordination protocols."
      },
      {
        key: "impact",
        label: "Impact",
        order: 5,
        mandatory: true,
        description: "Assessing project objectives. Sustainability and long-term development. Impact on participating organisations and target groups. Wider impact (local, regional, national, European).",
        aiPrompt: "Draft the Impact section. Address: 1) Assessment methodology, 2) Sustainability and result integration, 3) Impact on partners/target groups, 4) Systemic impact at regional/European levels."
      },
      {
        key: "project_design_implementation",
        label: "Project design and implementation",
        order: 6,
        mandatory: true,
        description: "Monitoring activities (progress, quality). Budget control and time management. Risk handling plans. Accessibility and inclusion. Digital tools. Green practices. Civic engagement.",
        aiPrompt: "Draft the Project Design section. Address: 1) Monitoring and quality control, 2) Budget and time management, 3) Risk mitigation (delays, conflicts, etc.), 4) Inclusivity, digital practices, and green practices."
      },
      {
        key: "work_package_1",
        label: "Work package n°1 Project Management",
        order: 7,
        mandatory: true,
        type: "structured",
        description: "Progress, quality, monitoring activities. Budget control. Time management.",
        aiPrompt: "Detail the Project Management work package. Focus on administrative efficiency, reporting cycles, and financial management protocols."
      },
      {
        key: "work_package_2",
        label: "Work package n°2 - Development",
        order: 8,
        mandatory: true,
        type: "structured",
        description: "Development of results, workshop organization, technical design.",
        aiPrompt: "Detail the second work package focused on core development and technical results."
      },
      {
        key: "work_package_3",
        label: "Work package n°3 - Implementation",
        order: 9,
        mandatory: true,
        type: "structured",
        description: "Piloting, testing, and implementation activities.",
        aiPrompt: "Detail the third work package focused on piloting and real-world testing."
      },
      {
        key: "work_package_4",
        label: "Work package n°4 - Dissemination",
        order: 10,
        mandatory: true,
        type: "structured",
        description: "Impact assessment, sustainability, and dissemination of results.",
        aiPrompt: "Detail the fourth work package focused on long-term impact and sharing results."
      },
      {
        key: "eu_values",
        label: "EU Values",
        order: 11,
        mandatory: true,
        description: "Respect for human dignity, freedom, democracy, equality, the rule of law and human rights. Article 2 of the TEU and Article 21 of the EU Charter of Fundamental Rights.",
        aiPrompt: "Draft a statement on how the project adheres to and promotes EU Values (democracy, equality, human rights)."
      }
    ],
    metadata: {
      totalCharLimit: 40000,
      estimatedDuration: "12-36 months"
    }
  }
};

async function seedFirestore() {
  try {
    console.log('🚀 Starting Firestore Database Seeding...');

    // 1. Upload the main KA220 template
    console.log(`Writing template: ${ka220Scheme.name}`);
    await db.collection('funding_schemes').doc(ka220Scheme.id).set(ka220Scheme);

    // 2. Read and upload schemes from extracted_schemes.json
    const extractedPath = path.resolve(process.cwd(), 'extracted_schemes.json');
    if (fs.existsSync(extractedPath)) {
      console.log('Found extracted_schemes.json, parsing contents...');
      const schemesData = JSON.parse(fs.readFileSync(extractedPath, 'utf8'));

      console.log(`Seeding ${schemesData.length} schemes from local backup...`);
      const batch = db.batch();

      for (const item of schemesData) {
        const docId = item.acronym ? item.acronym.toLowerCase() : item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const docRef = db.collection('funding_schemes').doc(docId);
        
        batch.set(docRef, {
          id: docId,
          name: item.name,
          acronym: item.acronym || '',
          description: item.description || '',
          is_default: false,
          isDefault: false,
          logic_mode: item.logic_mode || 'standard',
          logicMode: item.logic_mode || 'standard',
          template_json: item.template_json || { sections: [] },
          expert_rules: item.expert_rules || [],
          budget_rules: item.budget_rules || {},
          standardized_activities: item.standardized_activities || [],
          evaluation_criteria: item.evaluation_criteria || {},
          raw_excerpt: item.raw_excerpt || ''
        });
      }

      await batch.commit();
    } else {
      console.warn('⚠️ Warning: extracted_schemes.json not found, skipping additional schemes.');
    }

    // 3. Create a default test partner profile so the app is immediately usable
    console.log('Creating default partner profile...');
    const testPartner = {
      id: "partner-test-saunas",
      name: "Nordic Sauna Society",
      acronym: "NSS",
      legalNameNational: "Nordisk Bastuförening",
      organisationId: "E12345678",
      vatNumber: "FI99999999",
      businessId: "1234567-8",
      organizationType: "NGO - Non-Profit Association",
      country: "Finland",
      city: "Helsinki",
      postcode: "00100",
      legalAddress: "Bastugatan 12",
      contactEmail: "info@nordicsaunasociety.fi",
      description: "A leading Nordic NGO promoting sustainable thermal wellness, traditional steam culture, and regional community hubs.",
      experience: "Coordinator in 3 Erasmus+ cooperation partnerships and host of 12 regional youth exchanges.",
      staffSkills: "Project management, curriculum design, civic engagement facilitation, thermal therapy research."
    };
    await db.collection('partners').doc(testPartner.id).set(testPartner);

    console.log('🎉 SEEDING COMPLETED SUCCESSFULLY!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  }
}

seedFirestore();
