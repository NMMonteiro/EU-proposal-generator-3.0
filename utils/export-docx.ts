import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  HeadingLevel,
  PageBreak,
  ImageRun,
  Header,
  Footer,
  VerticalAlign,
  ShadingType,
  PageNumber,
} from "docx";
import { saveAs } from "file-saver";
import { FullProposal, WorkPackage } from "../types/proposal";
import { Partner } from "../types/partner";
import { assembleDocument, DisplaySection } from "./proposal-assembly";

// ============================================================================
// STYLING CONSTANTS (EU PROFESSIONAL STYLE)
// ============================================================================
const COLOR_PRIMARY = "003399"; // EU Blue
const COLOR_SECONDARY = "444444";
const COLOR_TABLE_HEADER = "F2F2F2";
const FONT = "Arial";
const BODY_SIZE = 22; // 11pt
const H1_SIZE = 32;   // 16pt
const H2_SIZE = 28;   // 14pt

// ============================================================================
// HELPERS
// ============================================================================

function getCurrencySymbol(currency: string = "EUR"): string {
  if (currency === "EUR") return "€";
  if (currency === "USD") return "$";
  if (currency === "GBP") return "£";
  return currency;
}

function createParagraph(text: string, options: { bold?: boolean; color?: string; size?: number; italic?: boolean } = {}): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text: text || "",
        bold: options.bold,
        color: options.color,
        size: options.size || BODY_SIZE,
        font: FONT,
        italics: options.italic,
      }),
    ],
    spacing: { before: 120, after: 120 },
  });
}

/**
 * Robustly splits squashed labels. 
 */
function fixSquashedText(text: string): string {
  // Pattern: [lowercase|digit|bracket|parenthesis] followed by [Uppercase + lowercase + rest of label + colon]
  // We make it more specific to avoid splitting CamelCase company names (e.g., TropicalAstral)
  // We now require the "squashed" part to start with a newline or be at least 3 chars deep into a line.
  return text.replace(/([a-z0-9\]\)])(?=[A-Z][a-z][a-zA-Z\s\-]{3,30}:)/g, "$1\n");
}

function sanitizeTitle(title: string): string {
  if (!title) return "";
  let clean = title.replace(/^undefined\s*/gi, '');
  // If it's just "applicant organisation" or similar, make it professional
  if (/^applicant\s*organisation/i.test(clean) || clean.toLowerCase() === 'applicant') {
    return "Applicant Organisation";
  }
  // Remove numbers at start like "1. " or "2. "
  clean = clean.replace(/^\d+[\.\)\s-]+\s*/, '');
  // Replace underscores with spaces
  clean = clean.replace(/_/g, ' ');
  // Remove " - Null" or similar common empty placeholders
  clean = clean.replace(/\s*-\s*null$/i, '');
  // Title case
  return clean.replace(/\b\w/g, l => l.toUpperCase()).trim();
}

/**
 * Normalizes a partner object to handle both snake_case and camelCase
 */
function normalizePartner(p: any): Partner {
  if (!p) return {} as Partner;

  // Handle nested profile if present
  const profile = p.profile || {};
  const src = { ...profile, ...p };

  // Determine if this partner is a coordinator
  const isCoord =
    src.isCoordinator === true ||
    src.is_coordinator === true ||
    (src.role && String(src.role).toLowerCase().includes('coord')) ||
    (src.contactPersonRole && String(src.contactPersonRole).toLowerCase().includes('coord'));

  return {
    ...src,
    name: src.name || src.legalShortName || src.acronym || src.legal_name || src.legal_name_national || "Unknown Partner",
    acronym: src.acronym || src.acronym_short || "",
    organisationId: src.organisationId || src.organisation_id || src.pic || src.oid || src.picNumber || src.pic_number || "",
    vatNumber: src.vatNumber || src.vat_number || src.vat || "",
    businessId: src.businessId || src.business_id || src.registration_id || src.business_registration_id || "",
    organizationType: src.organizationType || src.organization_type || src.type || "",
    isPublicBody: src.isPublicBody ?? src.is_public_body ?? false,
    isNonProfit: src.isNonProfit ?? src.is_non_profit ?? false,
    legalNameNational: src.legalNameNational || src.legal_name_national || src.legalName || src.name || "",
    legalAddress: src.legalAddress || src.legal_address || src.office_address || src.address || "",
    country: src.country || src.legal_country || src.legalCountry || "",
    city: src.city || src.legal_city || src.legalCity || "",
    postcode: src.postcode || src.post_code || src.legal_postcode || src.zipCode || "",
    region: src.region || src.legal_region || "",
    website: src.website || src.url || src.org_website || "",
    contactEmail: src.contactEmail || src.contact_email || src.email || "",
    department: src.department || src.unit || src.dept || "",

    // Legal Representative
    legalRepName: src.legalRepName || src.legal_rep_name || src.rep_name || "",
    legalRepPosition: src.legalRepPosition || src.legal_rep_position || src.rep_position || "",
    legalRepEmail: src.legalRepEmail || src.legal_rep_email || src.rep_email || "",
    legalRepPhone: src.legalRepPhone || src.legal_rep_phone || src.rep_phone || "",

    // Contact Person
    contactPersonName: src.contactPersonName || src.contact_person_name || src.contact_name || "",
    contactPersonPosition: src.contactPersonPosition || src.contact_person_position || src.contact_position || "",
    contactPersonEmail: src.contactPersonEmail || src.contact_person_email || src.contact_person_email_address || src.email || "",
    contactPersonPhone: src.contactPersonPhone || src.contact_person_phone || "",
    contactPersonRole: src.contactPersonRole || src.contact_person_role || "",

    // Expertise & Experience
    experience: src.experience || src.organisation_experience || "",
    staffSkills: src.staffSkills || src.staff_skills || src.key_personnel || "",
    relevantProjects: src.relevantProjects || src.relevant_projects || src.previous_projects || "",

    isCoordinator: isCoord,
    role: isCoord ? "Coordinator" : (src.role || "Partner"),
    description: src.description || src.background || src.profile || "",
    roleLabel: isCoord ? "Applicant" : "Partner",
  };
}

function normalizeWorkPackage(wp: any, index: number, logicMode: string = "standard"): WorkPackage {
  const isMobility = logicMode === "mobility";
  let name = wp.name || `${isMobility ? "Activity" : "Work Package"} ${index + 1}`;
  // Sanitize name: Remove common AI or template "Null" artifacts, and STRIP WP prefixes in mobility mode
  name = name.replace(/\s*-\s*null$/i, '');
  if (isMobility) {
    name = name.replace(/^(?:WP|Work[\s_-]*Packages?|Work[\s_-]*Plan)[\s_-]*\d+\s*[:\.-]*/i, '').trim();
    if (!name || name.toLowerCase() === 'activity') name = `Activity ${index + 1}`;
    else if (!name.startsWith('Activity')) name = `Activity ${index + 1}: ${name}`;
  }

  return {
    ...wp,
    name,
    description: wp.description || "",
    deliverables: Array.isArray(wp.deliverables)
      ? wp.deliverables.filter((d: any) => d && String(d).toLowerCase() !== 'null' && String(d).toLowerCase() !== '')
      : []
  };
}

/**
 * Formatting for currency and symbols.
 */
function formatContentText(text: string): string {
  if (!text) return "";
  return text
    .replace(/\bEUR\b/g, "€")
    .replace(/\bEuro(s)?\b/gi, "€")
    .replace(/\bE U R\b/g, "€");
}

/**
 * Strips HTML tags and replaces BR/P with newlines to preserve structure.
 */
function cleanHtml(html: string | undefined | null): string {
  if (!html) return "";
  let decoded = html
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");

  // Preservation: Keep some tags but mark them for parsing
  // We avoid the global strip but we'll clean line-by-line later
  return decoded
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<li>/gi, "\n• ")
    .trim();
}

/**
 * Robust HTML to TextRun parser for inline styles (bold, italic).
 */
function parseHtmlToTextRuns(html: string): TextRun[] {
  const runs: TextRun[] = [];
  const tagRegex = /(<(\/?[a-z1-6]+)[^>]*>)/gi;
  let lastIndex = 0;
  let match;

  const state = {
    bold: false,
    italic: false,
    color: undefined as string | undefined
  };

  while ((match = tagRegex.exec(html)) !== null) {
    const textBefore = html.substring(lastIndex, match.index);
    if (textBefore) {
      runs.push(new TextRun({
        text: textBefore.replace(/<[^>]*>/g, ""),
        bold: state.bold,
        italics: state.italic,
        color: state.color,
        font: FONT,
        size: BODY_SIZE
      }));
    }

    const fullTag = match[1].toLowerCase();
    const tagName = match[2].toLowerCase();

    if (tagName === 'strong' || tagName === 'b') state.bold = !fullTag.startsWith('</');
    if (tagName === 'em' || tagName === 'i') state.italic = !fullTag.startsWith('</');
    if (tagName === 'h3' || tagName === 'h4') state.bold = !fullTag.startsWith('</');

    lastIndex = tagRegex.lastIndex;
  }

  const remaining = html.substring(lastIndex);
  if (remaining) {
    runs.push(new TextRun({
      text: remaining.replace(/<[^>]*>/g, ""),
      bold: state.bold,
      italics: state.italic,
      color: state.color,
      font: FONT,
      size: BODY_SIZE
    }));
  }

  return runs.length > 0 ? runs : [new TextRun({ text: html.replace(/<[^>]*>/g, ""), font: FONT, size: BODY_SIZE })];
}

/**
 * Creates a paragraph with bolding for "Key: Value" patterns.
 */
function createSmartParagraph(text: string, options: { bullet?: number, allowedNames?: string[] } = {}): Paragraph | null {
  const line = formatContentText(text.trim());

  // GLOBAL FILTER: Ensure we don't mention removed partners
  if (options.allowedNames && options.allowedNames.length > 0) {
    const lowerLine = line.toLowerCase();
    if (lowerLine.includes('ascom') && !options.allowedNames.some(name => name.includes('ascom'))) {
      if (lowerLine.startsWith('ascom')) return null;
    }
  }

  // Handle markers
  if (line.includes('[HEADER]')) {
    const cleanLabel = line.replace('[HEADER]', '').trim();
    return new Paragraph({
      children: [new TextRun({ text: cleanLabel, bold: true, size: 24, font: FONT, color: COLOR_PRIMARY })],
      spacing: { before: 240, after: 120 }
    });
  }

  const colonIndex = line.indexOf(':');
  if (colonIndex > 0 && colonIndex < 70 && colonIndex < line.length - 1) {
    const key = line.substring(0, colonIndex + 1);
    const value = line.substring(colonIndex + 1);
    return new Paragraph({
      children: [
        new TextRun({ text: key.replace(/<[^>]*>/g, ""), bold: true, font: FONT, size: BODY_SIZE }),
        ...parseHtmlToTextRuns(value)
      ],
      spacing: { before: 100, after: 100 },
      bullet: options.bullet !== undefined ? { level: options.bullet } : undefined,
    });
  }

  return new Paragraph({
    children: parseHtmlToTextRuns(line),
    spacing: { before: 80, after: 80 },
    bullet: options.bullet !== undefined ? { level: options.bullet } : undefined,
  });
}

function createKeyValueTable(lines: string[]): Table {
  const rows: TableRow[] = [];
  const processedLines = lines.map(line => formatContentText(line).trim()).filter(Boolean);

  for (let i = 0; i < processedLines.length; i++) {
    const line = processedLines[i];
    const colonIndex = line.indexOf(':');

    // Check if current line is a Question/Key and next is an Answer/Value
    const isQuestion = line.endsWith('?') || (colonIndex > 0 && colonIndex < 40 && colonIndex === line.length - 1);

    if (isQuestion && i < processedLines.length - 1 && !processedLines[i + 1].endsWith('?')) {
      const key = line;
      const value = processedLines[i + 1];
      rows.push(new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({
              children: [new TextRun({ text: key.replace(/<[^>]*>/g, ""), bold: true, font: FONT, size: BODY_SIZE })],
              spacing: { before: 80, after: 80 }
            })],
            width: { size: 40, type: WidthType.PERCENTAGE },
            shading: { fill: "F9F9F9" }
          }),
          new TableCell({
            children: [new Paragraph({
              children: parseHtmlToTextRuns(value),
              spacing: { before: 80, after: 80 }
            })],
            width: { size: 60, type: WidthType.PERCENTAGE }
          })
        ]
      }));
      i++; // Skip next
    } else if (colonIndex > 0 && colonIndex < 70) {
      // Standard Key: Value on same line
      const key = line.substring(0, colonIndex).trim();
      const value = line.substring(colonIndex + 1).trim();
      rows.push(new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({
              children: [new TextRun({ text: key.replace(/<[^>]*>/g, ""), bold: true, font: FONT, size: BODY_SIZE })],
              spacing: { before: 80, after: 80 }
            })],
            width: { size: 40, type: WidthType.PERCENTAGE },
            shading: { fill: "F9F9F9" }
          }),
          new TableCell({
            children: [new Paragraph({
              children: parseHtmlToTextRuns(value),
              spacing: { before: 80, after: 80 }
            })],
            width: { size: 60, type: WidthType.PERCENTAGE }
          })
        ]
      }));
    } else {
      // Header/Standalone row
      rows.push(new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({
              children: [new TextRun({ text: line.replace(/<[^>]*>/g, ""), bold: true, font: FONT, size: BODY_SIZE, color: COLOR_PRIMARY })],
              spacing: { before: 100, after: 100 }
            })],
            columnSpan: 2,
            shading: { fill: COLOR_TABLE_HEADER }
          })
        ]
      }));
    }
  }

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      left: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      right: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "EEEEEE" },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "EEEEEE" },
    },
  });
}

function createWorkPackageTable(wps: WorkPackage[], currency: string = "EUR", logicMode: string = "standard"): Table {
  const isMobility = logicMode === "mobility";
  const rows: TableRow[] = [];

  // Header
  rows.push(new TableRow({
    children: [
      createTableHeaderCell("No."),
      createTableHeaderCell(isMobility ? "Activity Title" : "Work Package Title"),
      createTableHeaderCell("Budget"),
    ]
  }));

  wps.forEach((wp, idx) => {
    // Calculate WP Budget
    const wpBudget = (wp.activities || []).reduce((sum, act: any) => sum + (act.estimatedBudget || act.cost || 0), 0);

    rows.push(new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: (idx + 1).toString(), bold: true, font: FONT, size: BODY_SIZE })], alignment: AlignmentType.CENTER })],
          verticalAlign: VerticalAlign.CENTER,
          shading: { fill: "F9F9F9" }
        }),
        new TableCell({
          children: [
            new Paragraph({ children: [new TextRun({ text: wp.name, bold: true, font: FONT, size: BODY_SIZE })] })
          ],
          verticalAlign: VerticalAlign.CENTER
        }),
        new TableCell({
          children: [new Paragraph({
            children: [new TextRun({ text: `${wpBudget.toLocaleString()} ${currency}`, bold: true, font: FONT, size: 18 })],
            alignment: AlignmentType.RIGHT
          })],
          verticalAlign: VerticalAlign.CENTER,
          shading: { fill: "F9F9F9" }
        })
      ]
    }));
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      left: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      right: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "EEEEEE" },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "EEEEEE" },
    }
  });
}

function convertHtmlToParagraphs(html: string | undefined | null, sectionTitle?: string, currentPartners?: any[], logicMode: string = "standard"): (Paragraph | Table)[] {
  if (!html) return [createParagraph("")];

  const isMobility = logicMode === "mobility";

  // 1. Marker injection for headers before cleaning
  let processed = html;

  // If mobility mode, transform WP titles to Activity titles in the content
  if (isMobility) {
    processed = processed
      .replace(/WP\s*(\d+)/gi, "Activity $1")
      .replace(/Work\s*Package\s*(\d+)/gi, "Activity $1");
  }

  processed = processed
    .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, "\n[HEADER]$1\n")
    .replace(/<strong>(.*?)<\/strong>:/gi, "\n[HEADER]$1:\n") // Bold labels followed by colon often act as subheaders
    .replace(/<p[^>]*>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n");

  // 2. Preparation: Build a list of allowed partner names for filtering
  const allowedNames = currentPartners?.flatMap(p => [
    (p.name || "").toLowerCase(),
    (p.acronym || "").toLowerCase(),
    (p.legalNameNational || "").toLowerCase(),
    (p.legal_name || "").toLowerCase(),
    (p.legal_name_national || "").toLowerCase(),
  ]).filter(name => name && name.length > 2) || [];

  // 3. Clean HTML and get structured text
  let text = cleanHtml(processed);

  // 4. Remove any leftover date format labels
  text = text.replace(/\s*\(dd\/mm\/yyyy\)/g, "");
  text = fixSquashedText(text);

  // 5. Smart Filtering for Partner-heavy sections
  const isPartnerSection = (sectionTitle || "").toLowerCase().includes("partner") || (sectionTitle || "").toLowerCase().includes("organisation");
  if (isPartnerSection && allowedNames.length > 0) {
    const partnerBlocks = text.split(/,\s*(?=[^,]+?\s*\((?:OID|PIC|OID\/PIC):\s*[A-Z0-9]+)/gi);
    if (partnerBlocks.length > 1) {
      text = partnerBlocks
        .filter(block => {
          const blockLower = block.toLowerCase();
          return allowedNames.some(name => blockLower.includes(name));
        })
        .join(", ");
    }
  }

  // 6. Split into lines
  const rawLines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  const lines: string[] = [];

  for (let i = 0; i < rawLines.length; i++) {
    let current = rawLines[i];

    if (current.toLowerCase().includes("details of the") && current.toLowerCase().includes("inserted here")) continue;
    if (current.toLowerCase().includes("placeholder for") && current.toLowerCase().includes("table")) continue;
    if (current.toLowerCase() === "details to be provided.") continue;

    // Look ahead merging logic
    if (i < rawLines.length - 1 && !current.includes(':') && current.length < 50 && !current.startsWith('[HEADER]')) {
      const next = rawLines[i + 1];
      const nextColon = next.indexOf(':');
      if (nextColon >= 0 && nextColon < 30) {
        current = current + " " + next;
        i++;
      }
    }
    lines.push(current);
  }

  if (lines.length === 0) return [createParagraph("")];

  // 7. Table style for specific sections
  const lowerTitle = (sectionTitle || "").toLowerCase();
  if (lowerTitle.includes("annex") || lowerTitle.includes("context") || lowerTitle.includes("budget items")) {
    return [createKeyValueTable(lines.map(l => l.replace('[HEADER]', '')))];
  }

  // 8. Default: List of paragraphs
  return lines.map(line => {
    if (line.startsWith("[HEADER]")) {
      const cleanLabel = line.replace("[HEADER]", "").trim();
      return new Paragraph({
        children: [new TextRun({ text: cleanLabel, bold: true, size: 24, font: FONT, color: COLOR_PRIMARY })],
        spacing: { before: 240, after: 120 }
      });
    }
    if (line.startsWith("• ")) {
      return createSmartParagraph(line.substring(2), { bullet: 0, allowedNames });
    }
    return createSmartParagraph(line, { allowedNames });
  }).filter((p): p is Paragraph => p !== null);
}

function createSectionHeader(text: string, level: number = 1): Paragraph {
  const size = level === 1 ? H1_SIZE : H2_SIZE;
  return new Paragraph({
    children: [
      new TextRun({
        text,
        bold: true,
        size,
        font: FONT,
        color: COLOR_PRIMARY,
      }),
    ],
    spacing: { before: 400, after: 200 },
    heading: level === 1 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2,
    border: level === 1 ? {
      bottom: { color: COLOR_PRIMARY, space: 1, style: BorderStyle.SINGLE, size: 6 }
    } : undefined,
  });
}

function createTableHeaderCell(text: string): TableCell {
  return new TableCell({
    children: [new Paragraph({
      children: [new TextRun({ text, bold: true, size: BODY_SIZE, font: FONT })],
      alignment: AlignmentType.CENTER
    })],
    shading: { fill: COLOR_TABLE_HEADER, type: ShadingType.CLEAR },
    verticalAlign: VerticalAlign.CENTER,
  });
}

async function fetchImageAsBase64(url: string): Promise<string | null> {
  if (!url) return null;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        resolve(base64.split(',')[1]);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn('Image fetch failed:', error);
    return null;
  }
}

// ============================================================================
// GENERATOR
// ============================================================================

export async function generateDocx(proposal: FullProposal): Promise<{ blob: Blob; fileName: string }> {
  try {
    const p = proposal;
    const fScheme = p.fundingScheme || (p as any).funding_scheme;
    const schemeName = (fScheme?.name || '').toUpperCase();
    const isMobilityImplicit = !!(p.mobilityMetadata?.fieldOfApplication ||
      p.mobilityMetadata?.nationalAgency ||
      schemeName.includes('KA122') ||
      schemeName.includes('KA121') ||
      schemeName.includes('MOBILITY') ||
      (p.workPackages && p.workPackages.some((wp: any) => wp.activityType || (wp as any).participants)));

    const logicMode = p.logic_mode === 'mobility' || isMobilityImplicit ? 'mobility' : (p.logic_mode || fScheme?.logic_mode || "standard");
    const isMobility = logicMode === "mobility";
    const currency = p.settings?.currency || "EUR";
    const docChildren: any[] = [];

    // 1. TITLE PAGE
    const logoUrl = fScheme?.logo_url;
    if (logoUrl && logoUrl.startsWith('data:image')) {
      const parts = logoUrl.split(',');
      if (parts.length > 1) {
        docChildren.push(new Paragraph({
          children: [new ImageRun({
            data: Uint8Array.from(atob(parts[1]), c => c.charCodeAt(0)),
            transformation: { width: 140, height: 140 },
            type: "png"
          })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 600 }
        }));
      }
    }

    docChildren.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: "PROJECT PROPOSAL", bold: true, color: COLOR_PRIMARY, size: 28, font: FONT })],
                    alignment: AlignmentType.CENTER,
                  }),
                  new Paragraph({
                    children: [new TextRun({ text: p.title || "Untitled Proposal", bold: true, size: 48, font: FONT })],
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 400, after: 400 }
                  }),
                  new Paragraph({
                    children: [new TextRun({ text: fScheme?.name ? `Call for Proposal: ${fScheme.name}` : "H2020 / Horizon Europe Style", italics: true, color: "666666", font: FONT })],
                    alignment: AlignmentType.CENTER,
                  })
                ],
                shading: { fill: "F9F9F9" },
                margins: { top: 400, bottom: 400, left: 400, right: 400 }
              })
            ]
          })
        ],
        borders: {
          top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
          bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
          left: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
          right: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
        }
      })
    );

    docChildren.push(new Paragraph({ children: [new PageBreak()] }));

    // 2. EXECUTIVE SUMMARY (Always first as Part B head)
    const dynSections = p.dynamicSections || (p as any).dynamic_sections || {};
    const bestSummary = dynSections['project_summary'] || dynSections['summary'] || p.summary || (p as any).abstract || "";

    docChildren.push(createSectionHeader("Part B: Technical Narrative", 1));
    docChildren.push(createSectionHeader("0. Executive Summary", 2));
    docChildren.push(...convertHtmlToParagraphs(bestSummary, "Executive Summary", p.partners, logicMode));

    // 3. ASSEMBLED SECTIONS (STRICT ORDER)
    const finalDocument = assembleDocument(p).filter(s => s.id !== 'summary');

    finalDocument.forEach((section: DisplaySection) => {
      const isWP = section.type === 'work_package';
      const isWPList = section.type === 'wp_list';
      const isBudget = section.type === 'budget';
      const isRisk = section.type === 'risk';
      const isPartners = section.type === 'partners';
      const isProfiles = section.type === 'partner_profiles';

      let sTitle = section.title;
      if (isMobility) {
        if (isWPList) sTitle = "Activities Overview";
        else if (isWP) sTitle = sTitle.replace(/WP\s*(\d+)/gi, "Activity $1").replace(/Work\s*Package\s*(\d+)/gi, "Activity $1");
      }
      const sectionTitle = sTitle;

      // Skip if completely empty
      if (!section.content && !isWP && !isWPList && !isBudget && !isRisk && !isPartners && !isProfiles) return;

      // Section Header
      docChildren.push(createSectionHeader(sectionTitle, Math.min(section.level + 1, 4)));

      // Section Guidelines
      if (section.description) {
        docChildren.push(new Paragraph({
          children: [
            new TextRun({ text: "GUIDELINES: ", bold: true, size: 16, color: "999999", font: FONT }),
            new TextRun({ text: section.description, italics: true, size: 16, color: "666666", font: FONT }),
          ],
          spacing: { before: 100, after: 100 },
          shading: { fill: "F5F5F5" }
        }));
      }

      // Narrative Content
      if (section.content) {
        docChildren.push(...convertHtmlToParagraphs(section.content, section.title, p.partners, logicMode));
      }

      // Structured Data
      if (isPartners && p.partners?.length > 0) {
        docChildren.push(createPartnerListTable(p.partners.map(normalizePartner)));
      } else if (isProfiles && p.partners?.length > 0) {
        // Sort: Coordinator first
        const sorted = [...p.partners].sort((a, b) => {
          const na = normalizePartner(a);
          const nb = normalizePartner(b);
          return (na.isCoordinator ? -1 : nb.isCoordinator ? 1 : 0);
        });

        sorted.forEach((pt) => {
          const partner = normalizePartner(pt);
          const label = partner.isCoordinator ? "Applicant" : "Partner";
          docChildren.push(createSectionHeader(`${label}: ${partner.name}`, 3));
          docChildren.push(createDetailedPartnerProfile(partner));
          docChildren.push(new Paragraph({ text: "", spacing: { after: 200 } }));
        });
      } else if (isWPList && p.workPackages?.length > 0) {
        // Master Table
        const allWPs = p.workPackages.map((wp, i) => normalizeWorkPackage(wp, i, logicMode));
        docChildren.push(createWorkPackageTable(allWPs, getCurrencySymbol(p.settings?.currency), logicMode));
      } else if (isWP && section.wpIdx !== undefined) {
        // Individual WP Detail: Narrative is already above, add activities/deliverables here
        const wpData = p.workPackages?.[section.wpIdx];
        const wp = normalizeWorkPackage(wpData || {
          name: section.title,
          description: section.content || "",
          activities: [],
          deliverables: []
        }, section.wpIdx, logicMode);

        // Activities
        if (wp.activities?.length > 0) {
          docChildren.push(new Paragraph({
            children: [new TextRun({ text: "Planned Activities:", bold: true, font: FONT, size: 20, color: COLOR_PRIMARY })],
            spacing: { before: 200, after: 100 }
          }));
          wp.activities.forEach(act => {
            docChildren.push(new Paragraph({
              children: [new TextRun({ text: `• ${act.name}`, bold: true, font: FONT, size: 18 })],
              spacing: { before: 100 }
            }));
            if (act.description) {
              docChildren.push(new Paragraph({
                children: [new TextRun({ text: `  ${act.description}`, font: FONT, size: 16, color: "444444" })],
                spacing: { after: 100 }
              }));
            }
          });
        }

        // Deliverables
        if (wp.deliverables?.length > 0) {
          docChildren.push(new Paragraph({
            children: [new TextRun({ text: "Deliverables:", bold: true, font: FONT, size: 20, color: COLOR_PRIMARY })],
            spacing: { before: 200, after: 100 }
          }));
          wp.deliverables.forEach(del => {
            docChildren.push(new Paragraph({
              children: [new TextRun({ text: `• ${del}`, font: FONT, size: 18 })],
              spacing: { before: 40, after: 40 }
            }));
          });
        }
      } else if (isBudget && p.budget && p.budget.length > 0) {
        if (isMobility) {
          docChildren.push(...createMobilityBudgetSection(p.budget, currency, p.workPackages || []));
        } else {
          docChildren.push(createBudgetTable(p.budget, currency, logicMode));
        }
      } else if (isRisk && p.risks && p.risks.length > 0) {
        docChildren.push(createRiskTable(p.risks));
      }

      // Optional: spacing after section
      docChildren.push(new Paragraph({ text: "", spacing: { after: 200 } }));
    });

    // 3.5. ANNEXES SECTION (if any)
    if (p.annexes && p.annexes.length > 0) {
      docChildren.push(new Paragraph({ children: [new PageBreak()] }));
      docChildren.push(new Paragraph({
        text: "Annexes",
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 300 }
      }));

      docChildren.push(new Paragraph({
        children: [new TextRun({
          text: "The following supporting documents are attached to this proposal:",
          font: FONT,
          size: BODY_SIZE
        })],
        spacing: { after: 200 }
      }));

      // Create annexes table
      const annexRows: TableRow[] = [
        // Header row
        new TableRow({
          tableHeader: true,
          children: [
            new TableCell({
              children: [new Paragraph({
                children: [new TextRun({ text: "Annex", bold: true, font: FONT, size: 20 })],
                alignment: AlignmentType.CENTER
              })],
              shading: { fill: COLOR_TABLE_HEADER },
              width: { size: 10, type: WidthType.PERCENTAGE }
            }),
            new TableCell({
              children: [new Paragraph({
                children: [new TextRun({ text: "Title", bold: true, font: FONT, size: 20 })],
                alignment: AlignmentType.LEFT
              })],
              shading: { fill: COLOR_TABLE_HEADER },
              width: { size: 40, type: WidthType.PERCENTAGE }
            }),
            new TableCell({
              children: [new Paragraph({
                children: [new TextRun({ text: "Description", bold: true, font: FONT, size: 20 })],
                alignment: AlignmentType.LEFT
              })],
              shading: { fill: COLOR_TABLE_HEADER },
              width: { size: 35, type: WidthType.PERCENTAGE }
            }),
            new TableCell({
              children: [new Paragraph({
                children: [new TextRun({ text: "Type", bold: true, font: FONT, size: 20 })],
                alignment: AlignmentType.CENTER
              })],
              shading: { fill: COLOR_TABLE_HEADER },
              width: { size: 15, type: WidthType.PERCENTAGE }
            }),
          ]
        })
      ];

      // Data rows
      p.annexes.forEach((annex, idx) => {
        annexRows.push(new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({
                children: [new TextRun({
                  text: `${annex.annexNumber || idx + 1}`,
                  font: FONT,
                  size: 18,
                  bold: annex.isMandatory
                })],
                alignment: AlignmentType.CENTER
              })],
              verticalAlign: VerticalAlign.CENTER
            }),
            new TableCell({
              children: [new Paragraph({
                children: [
                  new TextRun({
                    text: annex.title,
                    font: FONT,
                    size: 18,
                    bold: annex.isMandatory
                  }),
                  ...(annex.isMandatory ? [new TextRun({ text: " *", color: "FF0000", bold: true })] : [])
                ]
              })]
            }),
            new TableCell({
              children: [new Paragraph({
                children: [new TextRun({
                  text: annex.description || "-",
                  font: FONT,
                  size: 18,
                  color: annex.description ? COLOR_SECONDARY : "999999"
                })]
              })]
            }),
            new TableCell({
              children: [new Paragraph({
                children: [new TextRun({
                  text: annex.fileType.toUpperCase(),
                  font: FONT,
                  size: 16,
                  color: COLOR_SECONDARY
                })],
                alignment: AlignmentType.CENTER
              })],
              verticalAlign: VerticalAlign.CENTER
            }),
          ]
        }));
      });

      docChildren.push(new Table({
        rows: annexRows,
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
          bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
          left: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
          right: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
          insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "EEEEEE" },
          insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "EEEEEE" }
        }
      }));

      // Add note about mandatory annexes if any
      const mandatoryCount = p.annexes.filter(a => a.isMandatory).length;
      if (mandatoryCount > 0) {
        docChildren.push(new Paragraph({
          children: [new TextRun({
            text: `* Indicates mandatory annex required by funding scheme (${mandatoryCount} total)`,
            font: FONT,
            size: 16,
            italics: true,
            color: "666666"
          })],
          spacing: { before: 200 }
        }));
      }

      docChildren.push(new Paragraph({ text: "", spacing: { after: 400 } }));
    }

    // 4. GENERATE FINAL DOCUMENT
    const doc = new Document({
      styles: { default: { document: { run: { font: FONT, size: BODY_SIZE } } } },
      sections: [{
        headers: {
          default: new Header({
            children: [new Paragraph({
              children: [
                new TextRun({ text: "PROPOSAL: ", bold: true, color: COLOR_PRIMARY, font: FONT, size: 18 }),
                new TextRun({ text: p.title || "CONFIDENTIAL", color: COLOR_SECONDARY, font: FONT, size: 18 }),
              ],
              border: { bottom: { color: "DDDDDD", space: 4, style: BorderStyle.SINGLE, size: 1 } }
            })]
          })
        },
        footers: {
          default: new Footer({
            children: [new Paragraph({
              children: [
                new TextRun({ text: "Generated by EU Proposal Tool", italics: true, size: 18, font: FONT }),
                new TextRun({ text: " | Page ", font: FONT, size: 18 }),
                new TextRun({ children: [PageNumber.CURRENT], color: COLOR_PRIMARY, bold: true, font: FONT, size: 18 }),
                new TextRun({ text: " of ", font: FONT, size: 18 }),
                new TextRun({ children: [PageNumber.TOTAL_PAGES], font: FONT, size: 18 }),
              ],
              alignment: AlignmentType.RIGHT,
              border: { top: { color: "DDDDDD", space: 4, style: BorderStyle.SINGLE, size: 1 } }
            })]
          })
        },
        children: docChildren,
      }],
    });

    const blob = await Packer.toBlob(doc);
    const fileName = `${(p.title || "proposal").replace(/[^a-z0-9]/gi, "_")}_EU_Proposal.docx`;
    return { blob, fileName };

  } catch (err) {
    console.error("DOCX ERROR:", err);
    throw err;
  }
}

export async function exportToDocx(proposal: FullProposal): Promise<void> {
  try {
    console.log("Starting DOCX export. Partners:", proposal.partners?.length);
    if (proposal.partners && proposal.partners.length > 0) {
      const p1 = proposal.partners[0] as any;
      console.log("Partner 1 data:", { name: p1.name, oid: p1.organisationId || p1.organisation_id, country: p1.country });
    }
    const { blob, fileName } = await generateDocx(proposal);
    saveAs(blob, fileName);
  } catch (error) {
    console.error("EXPORT FAILED", error);
    alert("Export failed: " + (error as Error).message);
  }
}// ============================================================================
// TABLE HELPERS
// ============================================================================

function createPartnerListTable(partners: Partner[]): Table {
  // Always sort: Coordinator first, then others
  const sortedPartners = [...partners].sort((a, b) => {
    const na = normalizePartner(a);
    const nb = normalizePartner(b);
    return (na.isCoordinator ? -1 : nb.isCoordinator ? 1 : 0);
  });

  const rows = [
    new TableRow({
      children: [
        createTableHeaderCell("No."),
        createTableHeaderCell("Partner Name"),
        createTableHeaderCell("Country"),
        createTableHeaderCell("Organisation ID (OID/PIC)"),
        createTableHeaderCell("Role"),
        createTableHeaderCell("Type"),
      ]
    }),
    ...sortedPartners.map((pt, i) => {
      const normalized = normalizePartner(pt);
      return new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: (i + 1).toString(), font: FONT, size: BODY_SIZE })], alignment: AlignmentType.CENTER })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: normalized.name, bold: true, font: FONT, size: BODY_SIZE })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: normalized.country || "-", font: FONT, size: BODY_SIZE })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: normalized.organisationId || normalized.pic || "-", font: FONT, size: BODY_SIZE })] })] }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: normalized.isCoordinator ? "Coordinator" : (normalized.role || "Partner"),
                    bold: normalized.isCoordinator,
                    font: FONT,
                    size: 18
                  })
                ]
              })
            ]
          }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: normalized.organizationType || "-", font: FONT, size: 18 })] })] }),
        ]
      })
    })
  ];

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      left: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      right: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "EEEEEE" },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "EEEEEE" },
    }
  });
}

function createBudgetTable(budget: any[], currency: string, logicMode: string = "standard"): Table {
  const isMobility = logicMode === "mobility";
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          createTableHeaderCell(isMobility ? "Financial Item" : "Resource Item"),
          createTableHeaderCell("Description"),
          createTableHeaderCell(`Cost (${currency})`),
        ]
      }),
      ...budget.flatMap(item => {
        const rows = [
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.item, bold: true, font: FONT, size: BODY_SIZE })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.description || "-", font: FONT, size: BODY_SIZE })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `${item.cost.toLocaleString()} ${currency}`, font: FONT, size: BODY_SIZE, bold: true })], alignment: AlignmentType.RIGHT })] }),
            ]
          })
        ];

        // Add sub-items if they exist
        if (item.breakdown && item.breakdown.length > 0) {
          item.breakdown.forEach((sub: any) => {
            rows.push(new TableRow({
              children: [
                new TableCell({
                  children: [new Paragraph({
                    children: [new TextRun({ text: `  └ ${sub.subItem || sub.item || 'Sub-item'}`, font: FONT, size: 18, color: "666666" })]
                  })],
                  shading: { fill: "FCFCFC" }
                }),
                new TableCell({
                  children: [new Paragraph({
                    children: [new TextRun({ text: `${sub.quantity || 1} x ${sub.unitCost ? sub.unitCost.toLocaleString() : sub.cost?.toLocaleString() || '0'}`, font: FONT, size: 18, color: "666666" })]
                  })],
                  shading: { fill: "FCFCFC" }
                }),
                new TableCell({
                  children: [new Paragraph({
                    children: [new TextRun({ text: `${(sub.total || sub.cost || 0).toLocaleString()} ${currency}`, font: FONT, size: 18, color: "666666" })],
                    alignment: AlignmentType.RIGHT
                  })],
                  shading: { fill: "FCFCFC" }
                }),
              ]
            }));
          });
        }
        return rows;
      })
    ],
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      left: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      right: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "EEEEEE" },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "EEEEEE" },
    }
  });
}

function createMobilityBudgetSection(budget: any[], currency: string, activities: any[]): any[] {
  const children: any[] = [];

  // 1. Budget Summary Table
  children.push(new Paragraph({
    children: [new TextRun({ text: "Budget Summary", bold: true, font: FONT, size: 24, color: COLOR_PRIMARY })],
    spacing: { before: 200, after: 100 }
  }));

  const categories = [
    { key: "organis", label: "Organisational Support" },
    { key: "travel", label: "Travel" },
    { key: "individual", altKey: "subsistence", label: "Individual Support" },
    { key: "fees", altKey: "course", label: "Course Fees" },
    { key: "linguistic", label: "Linguistic Support" },
    { key: "preparatory", label: "Preparatory visits" },
    { key: "inclusion", label: "Inclusion support" }
  ];

  // Map budget items to categories for easier lookup
  const categoryTotals: any = {};
  categories.forEach(cat => {
    categoryTotals[cat.key] = 0;
  });

  const summaryRows = [
    new TableRow({
      children: [
        createTableHeaderCell("Activity type"),
        ...categories.map(c => createTableHeaderCell(c.label + " (EUR)"))
      ]
    })
  ];

  // Activities (Rows)
  const activityGroups = activities.length > 0 ? activities : [{ name: "Total Project" }];

  activityGroups.forEach(act => {
    const actName = (typeof act === 'string' ? act : act.name || "").replace(/^(?:WP|Work[\s_-]*Packages?|Work[\s_-]*Plan|Activity)[\s_-]*\d+\s*[:\.-]*/i, '').trim() || "Activity";

    summaryRows.push(new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: actName, font: FONT, size: 16 })] })] }),
        ...categories.map(cat => {
          const cost = budget.filter(b => {
            const bName = (b.item || "").toLowerCase();
            const bDesc = (b.description || "").toLowerCase();
            const isCatMatch = bName.includes(cat.key) ||
              bDesc.includes(cat.key) ||
              (cat.altKey && (bName.includes(cat.altKey) || bDesc.includes(cat.altKey)));

            if (!isCatMatch) return false;

            if (activityGroups.length > 1) {
              const cleanActName = actName.toLowerCase();
              const sigWords = cleanActName.split(/\s+/).filter(w => w.length > 4);
              return bDesc.includes(cleanActName) ||
                cleanActName.includes(bDesc) ||
                sigWords.some(w => bDesc.includes(w) || bName.includes(w));
            }
            return true;
          }).reduce((sum, b) => sum + (Number(b.cost) || Number(b.total) || 0), 0);

          categoryTotals[cat.key] += cost;
          return new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: cost > 0 ? cost.toLocaleString() : "0", font: FONT, size: 16 })], alignment: AlignmentType.RIGHT })] });
        })
      ]
    }));
  });

  // Total row
  summaryRows.push(new TableRow({
    children: [
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Total", bold: true, font: FONT, size: 16 })] })], shading: { fill: "F9F9F9" } }),
      ...categories.map(cat => {
        const catTotal = budget.filter(b => {
          const bName = (b.item || "").toLowerCase();
          const bDesc = (b.description || "").toLowerCase();
          return bName.includes(cat.key) ||
            bDesc.includes(cat.key) ||
            (cat.altKey && (bName.includes(cat.altKey) || bDesc.includes(cat.altKey)));
        }).reduce((sum, b) => sum + (Number(b.cost) || Number(b.total) || 0), 0);

        return new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: catTotal.toLocaleString(), bold: true, font: FONT, size: 16 })], alignment: AlignmentType.RIGHT })], shading: { fill: "F9F9F9" } });
      })
    ]
  }));

  children.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: summaryRows,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      left: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      right: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "EEEEEE" },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "EEEEEE" },
    }
  }));

  // 2. Individual Category Details (Pages 22-28)
  categories.forEach(cat => {
    const items = budget.filter(b => {
      const bName = (b.item || "").toLowerCase();
      const bDesc = (b.description || "").toLowerCase();
      return bName.includes(cat.key) ||
        bDesc.includes(cat.key) ||
        (cat.altKey && (bName.includes(cat.altKey) || bDesc.includes(cat.altKey)));
    });

    if (items.length === 0) return;

    children.push(new Paragraph({
      children: [new TextRun({ text: cat.label, bold: true, font: FONT, size: 20, color: COLOR_PRIMARY })],
      spacing: { before: 300, after: 100 }
    }));

    const catTableRows = [
      new TableRow({
        children: [
          createTableHeaderCell("Item"),
          createTableHeaderCell("Description / Breakdown"),
          createTableHeaderCell(`Grant Requested (${currency})`)
        ]
      })
    ];

    items.forEach(item => {
      catTableRows.push(new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.item, bold: true, font: FONT, size: 18 })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.description || "-", font: FONT, size: 18 })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `${item.cost.toLocaleString()} ${currency}`, bold: true, font: FONT, size: 18 })], alignment: AlignmentType.RIGHT })] })
        ]
      }));

      if (item.breakdown?.length > 0) {
        item.breakdown.forEach((sub: any) => {
          catTableRows.push(new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `  └ ${sub.subItem || sub.item}`, font: FONT, size: 16, color: "666666" })] })], shading: { fill: "FCFCFC" } }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `${sub.quantity || 1} x ${sub.unitCost ? sub.unitCost.toLocaleString() : (sub.cost || 0).toLocaleString()}`, font: FONT, size: 16, color: "666666" })] })], shading: { fill: "FCFCFC" } }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `${(sub.total || sub.cost || 0).toLocaleString()} ${currency}`, font: FONT, size: 16, color: "666666" })], alignment: AlignmentType.RIGHT })], shading: { fill: "FCFCFC" } })
            ]
          }));
        });
      }
    });

    children.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: catTableRows,
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
        left: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
        right: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "EEEEEE" },
        insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "EEEEEE" },
      }
    }));
  });

  return children;
}

function createRiskTable(risks: any[]): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          createTableHeaderCell("Risk"),
          createTableHeaderCell("Impact"),
          createTableHeaderCell("Mitigation Measures"),
        ]
      }),
      ...risks.map(r => new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: r.risk, bold: true, font: FONT, size: BODY_SIZE })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: r.impact, font: FONT, size: BODY_SIZE })], alignment: AlignmentType.CENTER })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: r.mitigation, font: FONT, size: BODY_SIZE })] })] }),
        ]
      }))
    ],
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      left: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      right: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "EEEEEE" },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "EEEEEE" },
    }
  });
}

function createDetailedPartnerProfile(rawPartner: Partner): Table {
  const partner = normalizePartner(rawPartner);
  const isCoord = partner.isCoordinator === true;
  const lines: { label: string; value: string | undefined | null }[] = [
    { label: "Full Legal Name", value: partner.name },
    { label: "Legal Name (National Language)", value: partner.legalNameNational },
    { label: "Acronym", value: partner.acronym },
    { label: "Organisation ID (OID/PIC)", value: partner.organisationId || partner.pic },
    { label: "VAT Number", value: partner.vatNumber },
    { label: "Business Registration ID", value: partner.businessId },
    { label: "Organisation Type", value: partner.organizationType },
    { label: "Country", value: partner.country },
    { label: "Postcode", value: partner.postcode },
    { label: "City", value: partner.city },
    { label: "Legal Address", value: partner.legalAddress },
    { label: "Public Body?", value: partner.isPublicBody ? "Yes" : "No" },
    { label: "Non-Profit?", value: partner.isNonProfit ? "Yes" : "No" },
    { label: "Website", value: partner.website },
    { label: "Contact Person", value: partner.contactPersonName },
    { label: "Contact Email", value: partner.contactPersonEmail || partner.contactEmail },
    { label: "Phone", value: partner.contactPersonPhone },
    { label: "Role in Project", value: partner.role || (isCoord ? "Coordinator" : (partner.contactPersonRole || "Partner")) },
  ];

  const rows: TableRow[] = lines.map(line => {
    return new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({
            children: [new TextRun({ text: line.label, bold: true, font: FONT, size: BODY_SIZE - 2 })],
            spacing: { before: 40, after: 40 }
          })],
          width: { size: 35, type: WidthType.PERCENTAGE },
          shading: { fill: "F9F9F9" }
        }),
        new TableCell({
          children: [new Paragraph({
            children: [new TextRun({ text: (line.value && String(line.value).trim() !== "") ? String(line.value) : "-", font: FONT, size: BODY_SIZE - 2 })],
            spacing: { before: 40, after: 40 }
          })],
          width: { size: 65, type: WidthType.PERCENTAGE }
        })
      ]
    });
  });

  // Add long text sections as full-width rows if they exist
  const longFields = [
    { label: "Organization Description", value: partner.description },
    { label: "Experience & Expertise", value: partner.experience },
    { label: "Key Personnel & Staff Skills", value: partner.staffSkills },
    { label: "Relevant Previous Projects", value: partner.relevantProjects }
  ];

  longFields.forEach(field => {
    if (field.value && field.value.length > 10) {
      rows.push(new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: field.label, bold: true, font: FONT, size: 18, color: COLOR_PRIMARY })],
                spacing: { before: 80, after: 40 }
              }),
              ...convertHtmlToParagraphs(field.value, field.label)
            ],
            columnSpan: 2,
            shading: { fill: "FFFFFF" }
          })
        ]
      }));
    }
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      left: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      right: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "EEEEEE" },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "EEEEEE" },
    }
  });
}
