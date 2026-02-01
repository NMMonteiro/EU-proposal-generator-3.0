# Implementation Plan: Knowledge-Driven & Scheme-First Proposal Generator

## 1. Objective
Transform the proposal generator from a generic AI assistant into a specialized "Expert System" that starts with the Funding Scheme, leverages a curated "Expert Playbook" for each call, and utilizes a library of successful examples. **The system must handle a global range of funding calls (EU, national, and international)** by searching for available funds and storing their specific descriptions, needs, objectives, and scope in the database.

## 2. Phase 1: Database & Knowledge Foundation
We have evolved the `funding_schemes` table to be the "Intelligence Hub" and added a library for successful projects.

### 2.1 Expert Intelligence & Global Search
- **Automated Intelligence**: Instead of manual entry for every call, the system will allow for "Uploading and Parsing" of new funding calls.
- **Data Capture**: For every call parsed, the system must extract:
    - **Structure**: Sequence of questions and sub-questions.
    - **Scope**: Targeted beneficiaries and thematic priorities.
    - **Expert Rules**: Specific scoring criteria and evaluation weights.
- **Example Benchmarks**: Use successful approved proposals (e.g., Liceo Marconi Milano for KA122) as "Gold Standard" references for the AI.

### 2.2 Table Enhancements (Status: Migration Ready)
- `funding_schemes`: New columns for `expert_rules` (prompt injections) and `budget_rules` (formulas).
- `proposal_examples`: Library to host full JSON exports of successful proposals.

## 3. Phase 2: UI Workflow Overhaul (The "Scheme-First" Funnel)
Change the entry point of the application (`ProposalGenerator.tsx`).

### 3.1 Step 0: The Scheme Selector (Primary Entry)
The application starts with a "Selection Screen" populated dynamically from the database:
- **Source**: Directly from `funding_schemes` (including those newly uploaded/parsed).
- **Function**: Pre-loads the structure, sequence, and flow (terminologies, budget forms) before the user provides project context.

### 3.2 Step 1: Context Input (`URLInputStep`)
The user provides the specific project context.
- **Prompt (KEY)**: The user description or prompt is the primary source of truth.
- **URL (SUPPORTING)**: Optional. Used for additional organization/topic research.
- **AI Action**: Combines User Prompt + Selected Scheme Logic + Global Library + Success Examples.

## 4. Phase 3: AI Intelligence (The "Expert" Prompt Builder)
Redirect the `supabase/functions/server` logic.

### 4.1 "Few-Shot" Example Injection
The prompt builder will pull `proposal_examples` for the selected scheme.
- *"Look at this successful proposal for this specific call. Notice the tone and how it addresses the 'Expected Impact'. Mirror the quality and structure."*

## 5. Phase 4: Enhanced Idea Generation (Target: 10-12 Ideas)
- **Endpoint**: `/analyze-url`.
- **Output**: 10-12 diverse, scheme-compliant ideas.
- **Verification**: Each idea must explicitly list its **Alignment** with the scheme's specific objectives.

## 6. Implementation Checklist

### Database ✅
- [x] SQL Migration: `20260131_enhance_funding_intelligence.sql`
- [x] Seed Data: `20260131_seed_ka122_expert_intelligence.sql`.

### Frontend 🚧
- [x] Create `SchemeSelectorStep.tsx`.
- [x] Update `ProposalGenerator.tsx` to handle Step 0.
- [x] Refactor `IdeasStep.tsx` for 10-12 display and alignment badges.

### Backend 🚧
- [x] Update `prompt_builder.ts` to fetch and inject Expert Logic.
- [x] Update `ideation_service.ts` to fetch scheme-specific examples.
- [ ] Implement "Web Search for Schemes" logic (Next Step).

## 7. Next Immediate Action
Refine the **`URLInputStep`** to make the URL optional and emphasize the prompt, and begin exploring the "Global Scheme Search" logic.
