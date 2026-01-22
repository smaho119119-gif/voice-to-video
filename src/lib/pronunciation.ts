// Pronunciation dictionary for TTS
// Maps written text to how it should be pronounced

// Default pronunciation rules
const DEFAULT_DICTIONARY: Record<string, string> = {
  // Numbers that should be read digit by digit
  "119": "いちいちきゅう",
  "110": "いちいちまる",
  "911": "きゅうーいちいち",
  "24/7": "にじゅうよじかん",

  // Common tech terms
  "AI": "エーアイ",
  "API": "エーピーアイ",
  "URL": "ユーアールエル",
  "iOS": "アイオーエス",
  "macOS": "マックオーエス",
  "iPhone": "アイフォーン",
  "iPad": "アイパッド",

  // Brand names that might be mispronounced
  "Google": "グーグル",
  "Apple": "アップル",
  "Amazon": "アマゾン",
  "Netflix": "ネットフリックス",
  "YouTube": "ユーチューブ",
  "Twitter": "ツイッター",
  "Instagram": "インスタグラム",
  "TikTok": "ティックトック",
  "LINE": "ライン",
  "Slack": "スラック",
  "Zoom": "ズーム",

  // Custom entries for specific use cases
  "スマホ119": "すまほいちいちきゅう",
  "スマホ１１９": "すまほいちいちきゅう",
};

// Storage key for custom dictionary
const CUSTOM_DICTIONARY_KEY = "tts-pronunciation-dictionary";

// Get custom dictionary from localStorage
export function getCustomDictionary(): Record<string, string> {
  if (typeof window === "undefined") return {};

  try {
    const saved = localStorage.getItem(CUSTOM_DICTIONARY_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

// Save custom dictionary to localStorage
export function saveCustomDictionary(dictionary: Record<string, string>): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CUSTOM_DICTIONARY_KEY, JSON.stringify(dictionary));
}

// Add entry to custom dictionary
export function addDictionaryEntry(text: string, pronunciation: string): void {
  const custom = getCustomDictionary();
  custom[text] = pronunciation;
  saveCustomDictionary(custom);
}

// Remove entry from custom dictionary
export function removeDictionaryEntry(text: string): void {
  const custom = getCustomDictionary();
  delete custom[text];
  saveCustomDictionary(custom);
}

// Get combined dictionary (default + custom)
export function getCombinedDictionary(): Record<string, string> {
  return {
    ...DEFAULT_DICTIONARY,
    ...getCustomDictionary(),
  };
}

// Apply pronunciation dictionary to text
export function applyPronunciationDictionary(text: string): string {
  const dictionary = getCombinedDictionary();
  let result = text;

  // Sort by length (longest first) to handle overlapping patterns
  const sortedEntries = Object.entries(dictionary).sort(
    ([a], [b]) => b.length - a.length
  );

  for (const [pattern, replacement] of sortedEntries) {
    // Use regex for case-insensitive replacement
    const regex = new RegExp(escapeRegex(pattern), "gi");
    result = result.replace(regex, replacement);
  }

  // Apply number-to-reading rules for remaining numbers
  result = convertNumbersToReading(result);

  return result;
}

// Escape special regex characters
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Convert standalone numbers to Japanese reading (digit by digit for certain patterns)
function convertNumbersToReading(text: string): string {
  // Convert phone-number-like patterns (3+ digits) to digit-by-digit reading
  return text.replace(/\d{3,}/g, (match) => {
    // If it looks like a phone number or code, read digit by digit
    if (match.length <= 4) {
      return match.split("").map(digitToJapanese).join("");
    }
    return match; // Let TTS handle longer numbers naturally
  });
}

// Convert single digit to Japanese
function digitToJapanese(digit: string): string {
  const digitMap: Record<string, string> = {
    "0": "ぜろ",
    "1": "いち",
    "2": "に",
    "3": "さん",
    "4": "よん",
    "5": "ご",
    "6": "ろく",
    "7": "なな",
    "8": "はち",
    "9": "きゅう",
  };
  return digitMap[digit] || digit;
}

// Get all dictionary entries for display
export function getAllDictionaryEntries(): Array<{
  text: string;
  pronunciation: string;
  isCustom: boolean;
}> {
  const custom = getCustomDictionary();
  const entries: Array<{ text: string; pronunciation: string; isCustom: boolean }> = [];

  // Add default entries
  for (const [text, pronunciation] of Object.entries(DEFAULT_DICTIONARY)) {
    entries.push({ text, pronunciation, isCustom: false });
  }

  // Add custom entries (may override defaults)
  for (const [text, pronunciation] of Object.entries(custom)) {
    const existingIndex = entries.findIndex(e => e.text === text);
    if (existingIndex >= 0) {
      entries[existingIndex] = { text, pronunciation, isCustom: true };
    } else {
      entries.push({ text, pronunciation, isCustom: true });
    }
  }

  return entries.sort((a, b) => a.text.localeCompare(b.text, "ja"));
}
