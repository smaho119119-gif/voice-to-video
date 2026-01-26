/**
 * Split text for character-by-character animation
 * Optimized for Japanese text with proper character grouping
 */
export function splitTextForAnimation(text: string): string[] {
    const trimmed = (text || "").trim();
    if (!trimmed) return [];

    // For Japanese, split by character for typewriter effect
    // But group particles and small kana with previous character
    const chars: string[] = [];
    for (let i = 0; i < trimmed.length; i++) {
        const ch = trimmed[i];
        if (ch === " " || ch === "\n") continue;
        chars.push(ch);
    }
    return chars;
}

/**
 * Split Japanese text into word chunks for word-by-word animation
 * Intelligently groups characters into 2-4 character chunks or by punctuation
 */
export function splitWordsJa(text: string): string[] {
    const trimmed = (text || "").trim();
    if (!trimmed) return [];

    // If text contains spaces, split by spaces (English/mixed text)
    if (trimmed.includes(" ")) {
        return trimmed.split(/\s+/g).filter(Boolean);
    }

    // For pure Japanese, group into chunks of 2-4 characters
    const chunks: string[] = [];
    let current = "";

    for (const ch of trimmed) {
        if (ch === "\n") continue;
        current += ch;

        // Break on punctuation or every 3-4 characters
        if (/[、。！？!?,.\s]/.test(ch) || current.length >= 3) {
            chunks.push(current);
            current = "";
        }
    }

    if (current) chunks.push(current);
    return chunks;
}
