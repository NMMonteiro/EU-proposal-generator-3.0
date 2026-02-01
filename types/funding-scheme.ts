/**
 * Funding Scheme Types
 * Defines structure for dynamic proposal templates for different funding programs
 * (Horizon Europe, Erasmus+, Creative Europe, etc.)
 */

export interface FundingSchemeSection {
    key: string; // Unique identifier: "objectives", "relevance", "excellence"
    label: string; // Display name: "1. Objectives", "2. Relevance"
    type?: 'textarea' | 'richtext' | 'structured';
    charLimit?: number | null; // Character limit for this section
    wordLimit?: number | null; // Word limit for this section
    pageLimit?: number | null; // Page limit for this section
    mandatory: boolean; // Whether this section is required
    order: number; // Display order (1, 2, 3...)
    description?: string; // Helper text to guide users
    aiPrompt?: string; // Custom AI prompt for generating this section
    subsections?: FundingSchemeSection[]; // Nested subsections (e.g., "1.1 Specific Objectives")
}

export interface FundingSchemeTemplate {
    schemaVersion: string; // Template version (currently "1.0")
    sections: FundingSchemeSection[];
    metadata?: {
        totalCharLimit?: number; // Total character limit for entire proposal
        totalWordLimit?: number; // Total word limit for entire proposal
        estimatedDuration?: string; // Estimated time to complete (e.g., "3-4 hours")
        evaluationCriteria?: string; // Evaluation scoring breakdown (e.g., "Excellence 50%, Impact 30%")
    };
}

export interface FundingScheme {
    id: string;
    name: string; // e.g., "Horizon Europe RIA", "Erasmus+ KA2"
    description?: string;
    logo_url?: string; // URL to funding scheme logo
    template_json: FundingSchemeTemplate;
    logic_mode?: 'standard' | 'mobility' | 'lumpsum' | string;
    budget_rules?: any;
    standardized_activities?: any;
    evaluation_criteria?: any;
    mobility_rules?: any;
    is_default: boolean; // If true, used as fallback template
    is_active: boolean; // If false, hidden from UI
    expert_rules?: any; // The synthesized playbook or manual rules
    expert_playbook?: any; // Alias for expert_rules
    created_at: string;
    updated_at: string;
}

/**
 * Result from AI document parsing
 * Used when uploading PDF/DOCX guidelines to extract structure
 */
export interface ParsedTemplate {
    fundingScheme: string; // Extracted scheme name
    extractedFrom?: string; // Source file name/URL
    sections: FundingSchemeSection[];
    metadata?: {
        totalCharLimit?: number;
        estimatedDuration?: string;
    };
    needsReview: boolean; // Always true - requires human verification
}

/**
 * Helper type for section content storage
 * Maps section keys to their content
 */
export type DynamicSections = Record<string, string>;
