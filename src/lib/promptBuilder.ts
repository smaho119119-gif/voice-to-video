/**
 * Prompt Builder
 * プロンプト生成のための純関数群
 * - 副作用なし（純関数）
 * - Next.jsから独立
 * - 単体テスト可能
 */

export interface ScriptGenerationParams {
    theme: string;
    targetDuration?: number;
    style?: "educational" | "entertainment" | "news" | "storytelling" | "tutorial";
}

/**
 * スタイルガイドマップ
 */
const STYLE_GUIDES: Record<string, string> = {
    educational: "教育的で分かりやすい解説スタイル。専門用語は簡単に説明を加える。",
    entertainment: "エンターテイメント性が高く、視聴者を楽しませるスタイル。",
    news: "ニュース番組のような客観的で簡潔なスタイル。",
    storytelling: "物語形式で引き込むストーリーテリングスタイル。",
    tutorial: "ステップバイステップで説明するチュートリアルスタイル。",
};

/**
 * 画像プロンプトのルール（共通）
 */
const IMAGE_PROMPT_RULES = `
【画像プロンプト（image_prompt）の作成ルール】
CRITICAL: 以下のルールを厳守すること

1. **日本語で記述** - 必ず日本語で記述する
2. **日本的要素** - 人物は「日本人」「アジア系」、場所は「日本の」を明記
3. **シネマティック構図** - 以下の要素を組み込む:
   - カメラアングル: 「アイレベル」「ローアングル」「俯瞰」など
   - ライティング: 「自然光」「ゴールデンアワー」「スタジオライティング」など
   - 色調: 「温かみのある色調」「クールトーン」「鮮やかな色彩」など
   - 被写界深度: 「浅い被写界深度で背景ぼかし」など

4. **Ken Burns効果対応** - パン・ズームに適した構図:
   - 「余白のある構図」を意識
   - 「被写体は画面中央やや左/右に配置」などの指示
   - 「奥行きのある配置」で動きを出しやすくする

5. **AI感を消す工夫**:
   - 完璧すぎない自然な構図（「やや傾いた」「ナチュラルな」）
   - リアルな光の表現（「窓からの自然光」「柔らかい影」）
   - 人間らしさ（「笑顔の」「考え込んでいる」などの自然な表情）

6. **具体例**:
   良い例: 「日本の現代的なオフィスで働く若い日本人ビジネスマン、ノートPCでタイピング中、窓からの自然光で温かみのある色調、アイレベルのカメラアングル、浅い被写界深度で背景ぼかし、被写体は画面右寄りに配置、16:9、映画的な構図」

   悪い例: 「オフィスで働く人、きれいな画像」（日本的要素なし、構図指示なし、抽象的すぎる）

- 画像プロンプトは最低50文字以上、具体的に記述すること
`;

/**
 * シーン数を計算
 * - 最小3シーン、最大25シーン
 * - 1シーンあたり約7-10秒を想定
 */
export function calculateSceneCount(targetDuration: number): number {
    return Math.max(3, Math.min(25, Math.ceil(targetDuration / 8)));
}

/**
 * スタイルガイドを取得
 */
export function getStyleGuide(style?: string): string {
    return STYLE_GUIDES[style || "educational"] || STYLE_GUIDES.educational;
}

/**
 * テーマベースのスクリプト生成プロンプトを構築
 */
export function buildScriptGenerationPrompt(params: ScriptGenerationParams): string {
    const targetDuration = params.targetDuration || 60;
    const sceneCount = calculateSceneCount(targetDuration);
    const styleGuide = getStyleGuide(params.style);

    return `
あなたはプロの動画ディレクター兼脚本家です。以下のテーマに基づいて、ショート動画の完全な台本を作成してください。

【テーマ】
${params.theme}

【スタイル】
${styleGuide}

【要件】
- 目標時間: 約${targetDuration}秒（${sceneCount}シーン程度）
- 各シーンは5〜10秒程度
- ネイティブな日本語で自然に話す台本
- 視聴者の興味を引くオープニング
- 明確な結論やまとめで締める

出力は必ず以下のJSON形式にしてください。
{
  "title": "動画のタイトル（キャッチーで興味を引くもの）",
  "description": "動画の概要説明（50文字以内）",
  "format": "single/dialogue/interview/testimonial のいずれか",
  "scenes": [
    {
      "scene_index": 1,
      "duration": 5,
      "speaker": "narrator/host/guest/customer/expert/interviewer/interviewee のいずれか",
      "main_text": {
        "type": "title/quiz/bullet/highlight のいずれか",
        "lines": ["メイン文字1行目", "メイン文字2行目（クイズや箇条書きの場合）"]
      },
      "subtitle": "画面下部に表示するテロップ字幕（短く簡潔に、15文字以内）",
      "voice_text": "音声で読み上げる文章（自然な日本語、句読点や間を意識）",
      "voice_style": "演技指導（どのような声色・トーン・感情で読むか）",
      "image_prompts": [
        "背景画像1の生成プロンプト（日本語、シネマティック、詳細に）"
      ],
      "image_effect": "画像エフェクト（zoomIn/zoomOut/panLeft/panRight/static）",
      "text_animation": "字幕アニメーション（typewriter/fadeIn/slideUp/bounce/none）",
      "transition": "シーン切り替え効果（fade/slide/zoom/cut/dissolve）",
      "emotion": "アバターの表情や話し方（neutral/happy/serious/excited/thoughtful）",
      "emphasis_words": ["強調する単語1", "強調する単語2"],
      "sound_effects": [
        {
          "type": "効果音の種類（ambient/action/transition/emotion）",
          "keyword": "効果音を検索するための英語キーワード（例: keyboard typing, success chime, whoosh）",
          "timing": "開始タイミング（start/middle/end/throughout）",
          "volume": 0.3
        }
      ]
    }
  ],
  "total_duration": 合計秒数,
  "tags": ["関連タグ1", "関連タグ2", "関連タグ3"]
}

【話者（speaker）の指針】CRITICAL: 複数話者対応！
内容に応じて適切な話者を設定することで、異なる声で読み上げます。

話者タイプ:
- "narrator": ナレーター（デフォルト、メインの説明役）
- "host": ホスト/司会者（対話形式のメイン進行役）
- "guest": ゲスト（対話の相手、2人目の声）
- "customer": お客様の声（体験談、レビュー）
- "expert": 専門家（権威ある解説）
- "interviewer": インタビュアー（質問する側）
- "interviewee": インタビュイー（答える側）

使い分けの例:
1. **通常の説明動画**: 全シーン "narrator"
2. **お客様の声を含む**: 体験談シーンは "customer"、説明は "narrator"
3. **対話形式（NotebookLM風）**: "host" と "guest" を交互に
4. **インタビュー形式**: "interviewer" と "interviewee" を交互に
5. **専門家解説**: 権威ある説明部分は "expert"

対話形式の台本例:
- シーン1: speaker="host" 「今日は〇〇について話していきましょう！」
- シーン2: speaker="guest" 「はい、これは本当に興味深いテーマですね。」
- シーン3: speaker="host" 「まず基本的なところから説明しますね。」
- シーン4: speaker="guest" 「なるほど、つまり〜ということですか？」

お客様の声の例:
- シーン1: speaker="narrator" 「このサービスを使った方の声をご紹介します。」
- シーン2: speaker="customer" 「最初は不安でしたが、使ってみて本当に良かったです。」
- シーン3: speaker="narrator" 「このように多くの方にご満足いただいています。」

CRITICAL:
- テーマに「お客様の声」「体験談」「レビュー」が含まれる場合は "customer" を使用
- テーマに「対話」「会話」「二人」「掛け合い」が含まれる場合は "host"/"guest" を交互に使用
- テーマに「インタビュー」「質問」が含まれる場合は "interviewer"/"interviewee" を使用

【メインテキスト（main_text）のタイプ指針】
- "title": 大きなタイトル文字（インパクトのある1〜2行）
- "quiz": クイズ形式（上から順番に3〜4行が出現する演出）
- "bullet": 箇条書き（ポイントを列挙）
- "highlight": 強調テキスト（重要な単語やフレーズを目立たせる）

各シーンで適切なタイプを選んでください：
- オープニング: "title"
- 問題提起やクイズ: "quiz"
- ポイント説明: "bullet"
- 重要キーワード強調: "highlight"

【画像エフェクト（image_effect）の指針】CRITICAL: 各シーンで必ず異なるエフェクトを使用すること！
- "zoomIn": ズームイン（注目を集める、重要シーン向け）
- "zoomOut": ズームアウト（全体を見せる、俯瞰シーン向け）
- "panLeft": 左から右へパン（動きのあるシーン、移動感）
- "panRight": 右から左へパン（逆方向の動き）
- "static": 静止（落ち着いた説明シーン）

画像エフェクトルール（重要）:
- オープニング: "zoomIn" でインパクト
- 説明シーン: "panLeft" または "panRight" で動きをつける
- 強調シーン: "zoomIn" で注目
- まとめシーン: "zoomOut" で俯瞰
- CRITICAL: 同じエフェクトが2回以上連続しないこと！必ずバリエーションをつける

【字幕アニメーション（text_animation）の指針】CRITICAL: 各シーンで適切なアニメーションを選択！
- "typewriter": タイプライター効果（1文字ずつ表示、説明文向け）
- "fadeIn": フェードイン（自然な出現、汎用的）
- "slideUp": 下からスライド（テンポ感、アクティブなシーン）
- "bounce": バウンス（楽しい雰囲気、強調）
- "none": アニメーションなし（静的な表示）

字幕アニメーションルール:
- オープニング: "slideUp" または "bounce" でインパクト
- 説明シーン: "typewriter" で読みやすく
- 強調シーン: "bounce" で目立たせる
- まとめ: "fadeIn" で落ち着いて
- 同じアニメーションが3回以上連続しないこと！

【演技指導（voice_style）の指針】CRITICAL: 人間らしい自然な音声のために必須！
Gemini 2.5 TTSは演技指導で人間のような表現が可能です。各シーンに適切な演技指導を必ず記述すること。

演技指導の書き方:
- 声のトーン: 「明るく元気に」「落ち着いて穏やかに」「真剣に力強く」
- 感情表現: 「驚きを込めて」「ワクワクした気持ちで」「共感を込めて」
- 話し方: 「ゆっくりはっきりと」「テンポよく軽快に」「囁くように小声で」
- 演技: 「友達に話しかけるように」「ニュースキャスターのように」「先生が教えるように」

シーンごとの演技指導例:
- オープニング: 「明るく元気に、視聴者の興味を引くように、少しテンションを上げて」
- 問題提起: 「真剣に、問いかけるように、少し間を置いて」
- 驚きの事実: 「驚きを込めて、『えっ！？』という感情を乗せて」
- 解説: 「落ち着いて穏やかに、わかりやすく丁寧に説明するように」
- 重要ポイント: 「力を込めて、ここが大事だと強調するように、ゆっくりと」
- まとめ: 「温かみのある声で、視聴者に語りかけるように、満足感を込めて」
- CTA（行動喚起）: 「親しみを込めて、背中を押すように、明るく前向きに」

CRITICAL: voice_styleは必ず各シーンに含めること！空欄禁止！

【シーン切り替え効果（transition）の指針】
- "fade": フェード（落ち着いた場面転換、デフォルト）
- "slide": スライド（テンポの良い場面転換）
- "zoom": ズーム（強調・インパクト、重要ポイント向け）
- "cut": カット（即切り替え、緊張感）
- "dissolve": ディゾルブ（滑らかな切り替え）

シーン切り替えルール:
- オープニング（最初のシーン）: "zoom" で注目を集める
- 説明シーン間: "fade" または "dissolve" で自然に
- 重要ポイント: "zoom" で強調
- テンポアップ時: "slide" または "cut" で勢いをつける
- 同じ効果が3回連続しないようにバリエーションをつける

【強調単語（emphasis_words）の指針】
- 各シーンで特に重要な単語を2-3個選ぶ
- 数字、固有名詞、キーワードを優先
- 例: ["プログラミング", "無料", "今すぐ"]

効果音の種類ガイド:
- ambient: 環境音（オフィス、自然、カフェなど）
- action: アクション音（タイピング、クリック、ページめくりなど）
- transition: 場面転換音（whoosh, swipe, pop）
- emotion: 感情を表す音（success chime, fail buzzer, suspense）

各シーンに1-2個の効果音を必ず含めてください。

注意:
- avatar_scriptは声に出して読んで自然な日本語にすること
- 「えー」「まあ」などのフィラーは適度に入れても良い
${IMAGE_PROMPT_RULES}
- transitionとemphasis_wordsは必ず各シーンに含める
`;
}
