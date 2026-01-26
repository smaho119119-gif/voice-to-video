/**
 * 読み辞書 (Reading Dictionary)
 *
 * TTS（音声合成）で正しく読ませるための読み方変換ルールを定義します。
 * 気づいた読み間違いがあれば、このファイルに追加してください。
 *
 * 使い方:
 * 1. READING_DICTIONARY 配列に新しいエントリを追加
 * 2. pattern: 変換前のテキスト（文字列 or 正規表現）
 * 3. reading: 変換後の読み方（ひらがな推奨）
 * 4. note: メモ（任意）
 */

export interface ReadingEntry {
    /** 変換前のパターン（文字列または正規表現） */
    pattern: string | RegExp;
    /** 変換後の読み方 */
    reading: string;
    /** メモ・説明（任意） */
    note?: string;
}

/**
 * 読み辞書
 *
 * 追加例:
 * { pattern: "○○", reading: "まるまる", note: "伏せ字の読み方" }
 * { pattern: /(\d+)円/g, reading: "$1えん", note: "円の読み方" }
 */
export const READING_DICTIONARY: ReadingEntry[] = [
    // ========================================
    // 会社固有の読み方
    // ========================================
    {
        pattern: "119",
        reading: "いちいちきゅう",
        note: "スマホ119、住まい119 など当社ブランド名"
    },
    {
        pattern: "１１９",
        reading: "いちいちきゅう",
        note: "全角版"
    },

    // ========================================
    // 数字の読み方
    // ========================================
    // { pattern: "0120", reading: "ぜろいちにーぜろ", note: "フリーダイヤル" },
    // { pattern: "24時間", reading: "にじゅうよじかん", note: "" },
    // { pattern: "365日", reading: "さんびゃくろくじゅうごにち", note: "" },

    // ========================================
    // 記号・特殊文字
    // ========================================
    // { pattern: "〒", reading: "ゆうびんばんごう", note: "郵便マーク" },
    // { pattern: "℡", reading: "でんわばんごう", note: "電話マーク" },
    // { pattern: "㈱", reading: "かぶしきがいしゃ", note: "" },
    // { pattern: "㈲", reading: "ゆうげんがいしゃ", note: "" },

    // ========================================
    // 略語・専門用語
    // ========================================
    // { pattern: "AI", reading: "エーアイ", note: "" },
    // { pattern: "DX", reading: "ディーエックス", note: "デジタルトランスフォーメーション" },
    // { pattern: "SNS", reading: "エスエヌエス", note: "" },
    // { pattern: "FAQ", reading: "エフエーキュー", note: "よくある質問" },

    // ========================================
    // 読み間違いしやすい漢字
    // ========================================
    // { pattern: "御社", reading: "おんしゃ", note: "" },
    // { pattern: "弊社", reading: "へいしゃ", note: "" },
    // { pattern: "早急", reading: "さっきゅう", note: "「そうきゅう」ではない" },
    // { pattern: "重複", reading: "ちょうふく", note: "「じゅうふく」ではない" },
    // { pattern: "依存", reading: "いそん", note: "「いぞん」ではない（正式）" },

    // ========================================
    // 地名・固有名詞
    // ========================================
    // { pattern: "日本橋", reading: "にほんばし", note: "東京の地名" },
    // { pattern: "御徒町", reading: "おかちまち", note: "" },

    // ========================================
    // 新しいエントリはここに追加
    // ========================================

];

/**
 * カスタム辞書エントリー（UIから追加されたもの）
 */
interface CustomReadingEntry {
    id: string;
    pattern: string;
    reading: string;
    note: string;
}

/**
 * テキストに読み辞書を適用する
 * @param text 変換前のテキスト
 * @param customEntries オプション: UIから渡されるカスタムエントリー
 * @returns 変換後のテキスト
 */
export function applyReadingDictionary(text: string, customEntries?: CustomReadingEntry[]): string {
    let result = text;

    // 1. 組み込み辞書を適用
    for (const entry of READING_DICTIONARY) {
        if (typeof entry.pattern === 'string') {
            // 文字列の場合はグローバル置換
            result = result.split(entry.pattern).join(entry.reading);
        } else {
            // 正規表現の場合はそのまま使用
            result = result.replace(entry.pattern, entry.reading);
        }
    }

    // 2. カスタム辞書を適用（渡された場合）
    if (customEntries && customEntries.length > 0) {
        for (const entry of customEntries) {
            result = result.split(entry.pattern).join(entry.reading);
        }
    }

    return result;
}

/**
 * 辞書の内容を確認用に出力
 */
export function getDictionaryStats(): { total: number; withNotes: number } {
    return {
        total: READING_DICTIONARY.length,
        withNotes: READING_DICTIONARY.filter(e => e.note).length,
    };
}
