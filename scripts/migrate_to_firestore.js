/**
 * Supabase to Firestore Data Migration Script
 * 
 * Instructions:
 * 1. Ensure your local `.env.local` contains valid SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 * 2. Run this script using:
 *    > node scripts/migrate_to_firestore.js
 */

const { createClient } = require('@supabase/supabase-js');
const admin = require('firebase-admin');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load environment variables from .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  console.log('Loading .env.local variables...');
  dotenv.config({ path: envPath });
} else {
  console.log('No .env.local found, loading standard .env...');
  dotenv.config();
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const firebaseProjectId = 'eu-projects-generator-5-69dd0';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing Supabase credentials in environment variables.');
  process.exit(1);
}

console.log('Initializing clients...');
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Initialize Firebase Admin utilizing active CLI session
admin.initializeApp({
  projectId: firebaseProjectId
});
const db = admin.firestore();

// Helper to check UUID format
function isUUID(str) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}

async function migratePartners() {
  console.log('\n--- Migrating Partners ---');
  const { data: partners, error } = await supabase.from('partners').select('*');
  if (error) {
    console.error('Error fetching partners from Supabase:', error.message);
    return;
  }

  console.log(`Fetched ${partners.length} partners. Uploading to Firestore...`);
  const batch = db.batch();
  for (const partner of partners) {
    const docRef = db.collection('partners').doc(partner.id);
    batch.set(docRef, {
      ...partner,
      // Ensure camelCase fields are mapped as well for compatibility
      legalNameNational: partner.legal_name_national,
      organisationId: partner.organisation_id,
      vatNumber: partner.vat_number,
      businessId: partner.business_id,
      organizationType: partner.organization_type,
      contactEmail: partner.contact_email,
      staffSkills: partner.staff_skills,
      relevantProjects: partner.relevant_projects,
      logoUrl: partner.logo_url,
      pdfUrl: partner.pdf_url
    });
  }
  await batch.commit();
  console.log('✅ Partners migrated successfully!');
}

async function migrateFundingSchemes() {
  console.log('\n--- Migrating Funding Schemes ---');
  const { data: schemes, error } = await supabase.from('funding_schemes').select('*');
  if (error) {
    console.error('Error fetching funding schemes from Supabase:', error.message);
    return;
  }

  console.log(`Fetched ${schemes.length} funding schemes. Uploading to Firestore...`);
  const batch = db.batch();
  for (const scheme of schemes) {
    const docRef = db.collection('funding_schemes').doc(scheme.id);
    batch.set(docRef, {
      ...scheme,
      // Map layout details if present in a sub-array or sub-object in the future
      isDefault: scheme.is_default,
      logicMode: scheme.logic_mode,
      mobilityRules: scheme.mobility_rules,
      expertRules: scheme.expert_rules
    });
  }
  await batch.commit();
  console.log('✅ Funding Schemes migrated successfully!');
}

async function migrateGlobalKnowledge() {
  console.log('\n--- Migrating Global Knowledge ---');
  const { data: chunks, error } = await supabase.from('global_knowledge').select('*');
  if (error) {
    console.warn('⚠️ No global_knowledge table found or fetch failed:', error.message);
    return;
  }

  console.log(`Fetched ${chunks.length} knowledge chunks. Uploading to Firestore...`);
  // Firestore batch limit is 500 documents
  let count = 0;
  let batch = db.batch();

  for (const chunk of chunks) {
    const docRef = db.collection('global_knowledge').doc(chunk.id || crypto.randomUUID());
    batch.set(docRef, {
      ...chunk,
      sourceName: chunk.source_name,
      chunkIndex: chunk.chunk_index
    });

    count++;
    if (count % 400 === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }

  if (count % 400 !== 0) {
    await batch.commit();
  }
  console.log(`✅ ${count} Global Knowledge chunks migrated successfully!`);
}

async function migrateProposals() {
  console.log('\n--- Migrating Proposals (Deep Hydration) ---');
  const { data: proposals, error } = await supabase.from('proposals').select('*');
  if (error) {
    console.error('Error fetching proposals from Supabase:', error.message);
    return;
  }

  console.log(`Fetched ${proposals.length} proposals. Fetching relational sub-tables...`);

  for (const prop of proposals) {
    const pid = prop.id;
    console.log(`-> Processing proposal [${pid}]: ${prop.title}`);

    // Fetch related tables
    const { data: sections } = await supabase.from('proposal_sections').select('*').eq('proposal_id', pid);
    const { data: relPartners } = await supabase.from('proposal_partners').select('*, profile:partners(*)').eq('proposal_id', pid);
    const { data: workPackages } = await supabase.from('proposal_work_packages').select('*').eq('proposal_id', pid);
    const { data: budget } = await supabase.from('proposal_budget_items').select('*').eq('proposal_id', pid);
    const { data: risks } = await supabase.from('proposal_risks').select('*').eq('proposal_id', pid);
    const { data: annexes } = await supabase.from('proposal_annexes').select('*').eq('proposal_id', pid);

    // 1. Reconstruct Sections
    const dynamicSections = {};
    sections?.forEach((s) => {
      dynamicSections[s.section_key] = s.content;
    });

    // 2. Reconstruct Partners
    const hydratedPartners = relPartners?.map((p) => {
      const profile = p.profile || {};
      return {
        ...profile,
        id: p.partner_id || p.id,
        name: p.name || profile.name,
        role: p.role || 'Partner',
        isCoordinator: !!p.is_coordinator,
        description: p.description || profile.description,
        legalNameNational: profile.legal_name_national || profile.name,
        organisationId: profile.organisation_id || profile.pic || profile.oid,
        acronym: profile.acronym,
        pic: profile.pic,
        vatNumber: profile.vat_number,
        businessId: profile.business_id,
        organizationType: profile.organization_type,
        isPublicBody: !!profile.is_public_body,
        isNonProfit: !!profile.is_non_profit,
        country: profile.country,
        legalAddress: profile.legal_address,
        city: profile.city,
        postcode: profile.postcode,
        region: profile.region,
        contactEmail: profile.contact_email,
        website: profile.website,
        legalRepName: profile.legal_rep_name,
        legalRepPosition: profile.legal_rep_position,
        legalRepEmail: profile.legal_rep_email,
        legalRepPhone: profile.legal_rep_phone,
        contactPersonName: profile.contact_person_name,
        contactPersonPosition: profile.contact_person_position,
        contactPersonEmail: profile.contact_person_email,
        contactPersonPhone: profile.contact_person_phone,
        contactPersonRole: profile.contact_person_role,
        experience: profile.experience,
        staffSkills: profile.staff_skills,
        relevantProjects: profile.relevant_projects,
        logoUrl: profile.logo_url
      };
    }) || [];

    // 3. Reconstruct Work Packages
    const sortedWps = workPackages
      ? workPackages
          .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
          .map((w) => ({
            name: w.name,
            description: w.description,
            duration: w.duration,
            activities: w.activities || [],
            participants: w.participants,
            activityType: w.activity_type,
            destinationCountry: w.destination_country,
            isMobility: w.is_mobility
          }))
      : [];

    // 4. Reconstruct Budget Items
    const sortedBudget = budget
      ? budget
          .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
          .map((b) => ({
            item: b.item_category || b.item,
            category: b.item_category || b.category,
            description: b.description,
            cost: b.cost,
            breakdown: b.breakdown || [],
            partnerAllocations: b.partner_allocations || []
          }))
      : [];

    // 5. Reconstruct Risks
    const sortedRisks = risks
      ? risks
          .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
          .map((r) => ({
            risk: r.risk_title,
            likelihood: r.likelihood,
            impact: r.impact,
            mitigation: r.mitigation_strategy
          }))
      : [];

    // 6. Reconstruct Annexes
    const formattedAnnexes = annexes?.map((a) => ({
      id: a.id,
      proposalId: a.proposal_id,
      title: a.title,
      description: a.description,
      fileUrl: a.file_url,
      fileName: a.file_name,
      fileSize: a.file_size,
      uploadedAt: a.uploaded_at
    })) || [];

    // Construct the fully hydrated proposal document
    const fullProposal = {
      id: pid,
      title: prop.title || 'Untitled Proposal',
      summary: prop.summary,
      projectUrl: prop.project_url || prop.projectUrl,
      selectedIdea: prop.selected_idea || prop.selectedIdea,
      settings: prop.settings || {},
      generatedAt: prop.generated_at || prop.generatedAt,
      savedAt: prop.saved_at || prop.savedAt,
      updatedAt: prop.updated_at || new Date().toISOString(),
      fundingSchemeId: prop.funding_scheme_id,
      dynamicSections,
      dynamic_sections: dynamicSections,
      partners: hydratedPartners,
      workPackages: sortedWps,
      budget: sortedBudget,
      risks: sortedRisks,
      annexes: formattedAnnexes,
      logicMode: prop.logic_mode || 'standard',
      mobilityMetadata: prop.mobility_metadata || {}
    };

    // Save as a single document in Firestore
    await db.collection('proposals').doc(pid).set(fullProposal);
    console.log(`✅ Migration complete for proposal: ${pid}`);
  }
}

async function runMigration() {
  try {
    console.log('🚀 Starting Data Migration Supabase -> Firestore...');
    await migratePartners();
    await migrateFundingSchemes();
    await migrateGlobalKnowledge();
    await migrateProposals();
    console.log('\n🎉 ALL MIGRATIONS COMPLETED SUCCESSFULLY!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Fatal Migration Error:', error.message);
    process.exit(1);
  }
}

runMigration();
