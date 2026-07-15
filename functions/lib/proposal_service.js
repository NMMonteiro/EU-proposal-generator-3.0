"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.rebalanceBudget = exports.loadFullProposal = exports.saveToSupabase = void 0;
const firebase_db_1 = require("./firebase_db");
const KV = __importStar(require("./kv_store"));
const saveToSupabase = async (proposal) => {
    try {
        const pid = proposal.id;
        // Clean fields for safe Firestore document write (ensuring both casing variations exist)
        const fullProposal = {
            ...proposal,
            id: pid,
            title: proposal.title || 'Untitled Proposal',
            summary: proposal.summary || '',
            projectUrl: proposal.projectUrl || proposal.project_url || '',
            project_url: proposal.projectUrl || proposal.project_url || '',
            selectedIdea: proposal.selectedIdea || proposal.selected_idea || {},
            selected_idea: proposal.selectedIdea || proposal.selected_idea || {},
            settings: proposal.settings || {},
            generatedAt: proposal.generatedAt || proposal.generated_at || new Date().toISOString(),
            generated_at: proposal.generatedAt || proposal.generated_at || new Date().toISOString(),
            savedAt: proposal.savedAt || proposal.saved_at || new Date().toISOString(),
            saved_at: proposal.savedAt || proposal.saved_at || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            funding_scheme_id: proposal.funding_scheme_id || null,
            dynamicSections: proposal.dynamicSections || proposal.dynamic_sections || {},
            dynamic_sections: proposal.dynamicSections || proposal.dynamic_sections || {},
            partners: proposal.partners || [],
            workPackages: proposal.workPackages || proposal.work_packages || [],
            work_packages: proposal.workPackages || proposal.work_packages || [],
            budget: proposal.budget || [],
            risks: proposal.risks || [],
            annexes: proposal.annexes || [],
            logicMode: proposal.logicMode || proposal.logic_mode || 'standard',
            logic_mode: proposal.logicMode || proposal.logic_mode || 'standard',
            mobilityMetadata: proposal.mobilityMetadata || proposal.mobility_metadata || {},
            mobility_metadata: proposal.mobilityMetadata || proposal.mobility_metadata || {}
        };
        await firebase_db_1.db.collection('proposals').doc(pid).set(fullProposal);
        console.log(`✅ Saved Proposal ${pid} to Firestore`);
    }
    catch (err) {
        console.error('❌ Firestore proposal save error:', err.message);
    }
};
exports.saveToSupabase = saveToSupabase;
const loadFullProposal = async (id) => {
    if (!id)
        return null;
    const doc = await firebase_db_1.db.collection('proposals').doc(id).get();
    if (doc.exists) {
        const d = doc.data();
        return {
            ...d,
            id: doc.id,
            dynamicSections: d.dynamicSections || d.dynamic_sections || {},
            dynamic_sections: d.dynamicSections || d.dynamic_sections || {},
            workPackages: d.workPackages || d.work_packages || [],
            work_packages: d.workPackages || d.work_packages || [],
            logicMode: d.logicMode || d.logic_mode || 'standard',
            logic_mode: d.logicMode || d.logic_mode || 'standard',
            mobilityMetadata: d.mobilityMetadata || d.mobility_metadata || {},
            mobility_metadata: d.mobilityMetadata || d.mobility_metadata || {}
        };
    }
    // Fallback to KV store
    const kvKey = id.startsWith('proposal-') ? id : `proposal-${id}`;
    const kvData = await KV.get(kvKey);
    if (kvData)
        return kvData;
    return null;
};
exports.loadFullProposal = loadFullProposal;
const rebalanceBudget = (proposal, targetBudget) => {
    if (!proposal.budget || !Array.isArray(proposal.budget) || proposal.budget.length === 0)
        return;
    // 1. Proportional scaling for main budget items
    let currentTotal = proposal.budget.reduce((sum, item) => sum + (Number(item.cost) || 0), 0);
    if (currentTotal > 0 && Math.abs(currentTotal - targetBudget) > 1) {
        const scaleFactor = targetBudget / currentTotal;
        let runningTotal = 0;
        proposal.budget.forEach((item, idx) => {
            if (idx === proposal.budget.length - 1) {
                item.cost = targetBudget - runningTotal;
            }
            else {
                item.cost = Math.round((Number(item.cost) || 0) * scaleFactor);
                runningTotal += item.cost;
            }
        });
    }
    // 2. Ensure internal consistency
    proposal.budget.forEach((item) => {
        const itemTarget = Number(item.cost) || 0;
        if (item.partnerAllocations && Array.isArray(item.partnerAllocations) && item.partnerAllocations.length > 0) {
            const paTotal = item.partnerAllocations.reduce((sum, pa) => sum + (Number(pa.amount) || 0), 0);
            if (paTotal !== itemTarget) {
                const sortedPA = [...item.partnerAllocations].sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0));
                if (sortedPA[0])
                    sortedPA[0].amount = (Number(sortedPA[0].amount) || 0) + (itemTarget - paTotal);
            }
        }
        if (item.breakdown && Array.isArray(item.breakdown) && item.breakdown.length > 0) {
            const bdTotal = item.breakdown.reduce((sum, bd) => sum + (Number(bd.total) || 0), 0);
            if (bdTotal !== itemTarget) {
                const sortedBD = [...item.breakdown].sort((a, b) => (Number(b.total) || 0) - (Number(a.total) || 0));
                if (sortedBD[0])
                    sortedBD[0].total = (Number(sortedBD[0].total) || 0) + (itemTarget - bdTotal);
            }
        }
    });
};
exports.rebalanceBudget = rebalanceBudget;
//# sourceMappingURL=proposal_service.js.map