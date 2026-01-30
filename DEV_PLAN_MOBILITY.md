# Development Plan - KA122 Mobility Logic & Tooling Resolution

## Phase 1: Data Visibility & UI Integrity (High Priority)
- [x] **Fix Prop Passing**: Resolved 'Unknown ID' by explicitly passing `proposalId` from `ProposalViewerPage` to `ViewerTabs`.
- [ ] **Data Verification**: Confirm that `proposal.budget` is populated (SQL script execution required by user).
- [x] **Robust Budget Mapping**: Updated Summary logic with word-level fuzzy matching for mobility context.

## Phase 2: DOCX Export Perfection
- [x] **Dynamic Terminology**: Implemented global "WP" -> "Activity" replacement for mobility projects in both titles and body.
- [x] **Content Cleanup**: Strip "WP" markers from both titles and narrative body using regex.
- [x] **Budget Table Accuracy**: Matching UI logic in DOCX for consistent financial rows.

## Phase 3: Tooling & Environment
- [ ] **SQL Capabilities**: Monitor Supabase MCP status.
- [ ] **Browser Fix**: Awaiting system restoration for browser-based testing.

## Phase 4: Regression Testing
- [x] **Standard Mode Safe**: Verified `isMobility` guards protect KA2/Horizon projects from label transformations.
- [ ] **Direct Persistence**: Test saving changes in the Viewer.

---
*Updated: 2026-01-30 16:55*
