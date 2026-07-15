export const extractJSON = (text: string) => {
    if (!text) return null;

    // 1. Pre-clean: find the true start
    const startIdx = text.indexOf('{') !== -1 ? text.indexOf('{') : text.indexOf('[');
    if (startIdx === -1) return null;

    let raw = text.substring(startIdx).trim();

    // 2. Try direct parse first
    try {
        // Find the last closer to avoid trailing text
        const lastBrace = raw.lastIndexOf('}');
        const lastBracket = raw.lastIndexOf(']');
        const endIdx = Math.max(lastBrace, lastBracket);
        if (endIdx !== -1) {
            return JSON.parse(raw.substring(0, endIdx + 1));
        }
        return JSON.parse(raw);
    } catch (e) {
        // 3. Fallback: Repair truncated JSON
        console.warn('JSON parsing failed, attempting repair...', e);
        try {
            const repaired = repairTruncatedJSON(raw);
            return JSON.parse(repaired);
        } catch (repairError) {
            console.error('JSON repair failed:', repairError);
            throw new Error('Failed to parse AI response. The content was too long or malformed.');
        }
    }
};

function repairTruncatedJSON(json: string): string {
    let repaired = json.trim();
    const stack: string[] = [];
    let inString = false;
    let isEscaped = false;

    for (let i = 0; i < repaired.length; i++) {
        const char = repaired[i];

        if (isEscaped) {
            isEscaped = false;
            continue;
        }

        if (char === '\\') {
            isEscaped = true;
            continue;
        }

        if (char === '"') {
            inString = !inString;
            continue;
        }

        if (!inString) {
            if (char === '{') stack.push('}');
            else if (char === '[') stack.push(']');
            else if (char === '}') {
                if (stack[stack.length - 1] === '}') stack.pop();
            } else if (char === ']') {
                if (stack[stack.length - 1] === ']') stack.pop();
            }
        }
    }

    // If we are in the middle of a string, close it
    if (inString) {
        repaired += '"';
    }

    // Clean up trailing commas which often happen before truncation
    repaired = repaired.replace(/,\s*$/, "");
    repaired = repaired.replace(/,\s*([}\]])/g, "$1");

    // Close all open braces/brackets
    while (stack.length > 0) {
        const closer = stack.pop();
        if (repaired.trim().endsWith(':')) {
            repaired += ' ""';
        }
        repaired = repaired.trim().replace(/,$/, "");
        repaired += closer;
    }

    return repaired;
}

export const isUUID = (str: string) => {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
};

export const stripHtml = (html: string) => {
    return html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
};

export async function withRetry<T>(fn: () => Promise<T>, retries = 5, delay = 2000): Promise<T> {
    try {
        return await fn();
    } catch (error: any) {
        const isRateLimit = error?.status === 429 || 
                            error?.message?.includes('429') || 
                            error?.message?.includes('quota') ||
                            error?.message?.toLowerCase().includes('too many requests');
                            
        if (isRateLimit && retries > 0) {
            console.warn(`[AI Service] Quota hit / 429 received. Retrying in ${delay}ms... (Retries left: ${retries})`);
            await new Promise((resolve) => setTimeout(resolve, delay));
            return withRetry(fn, retries - 1, delay * 2);
        }
        throw error;
    }
}
