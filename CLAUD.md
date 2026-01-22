# Voice-to-Video AI Project (CLAUD.md)

## 概要
浩樹さんの「音声を喋るだけで、AIアバターが解説する高品質な動画を生成する」プロジェクトの核心ドキュメントです。

## システム設計・仕様

### システム構成案
1. **Frontend**: Next.js 15 (App Router, TypeScript)
2. **Audio Engine**: OpenAI Whisper (音声 -> 字幕)
3. **Logic Engine**: Claude 3.5 Sonnet (構成・台本作成)
4. **Visual Engine**: Nano Banana Pro / Gemini 3 Pro Image (背景画像生成)
5. **Avatar Engine**: HeyGen API (AIアバター口パク動画)
6. **Compose Engine**: Remotion (動画合成・レンダリング)

### データベース設計 (Supabase)
- `profiles`: ユーザー管理 (testユーザー, NSXユーザー)
- `videos`: 生成動画の管理
- `scenes`: シーンごとの台本、画像URL、動画URLの管理

---

## Technical Specifications (Gemini 3 / Nano Banana Pro)

浩樹さんの指示に基づき、最新の Gemini 3 API 仕様を統合します。

### モデル一覧
- **gemini-3-pro-preview**: 高度な推論・コード生成用 (脳)
- **gemini-3-flash-preview**: 高速・低価格用
- **gemini-3-pro-image-preview (Nano Banana Pro)**: 最高品質の画像生成用 (背景素材)

### Nano Banana Pro (画像生成) の使い方 (JavaScript)

```javascript
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function generateBackground() {
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-image-preview",
    contents: "Generate a visualization of the current weather in Tokyo.",
    config: {
      imageConfig: {
        aspectRatio: "16:9",
        imageSize: "4K" // 高品質画像生成
      }
    }
  });

  // 画像データの抽出
  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      const imageData = part.inlineData.data; // Base64形式
      // ここで保存またはCloud Storageへアップロード
    }
  }
}
```

### 重要なパラメータ
- **thinking_level**: 推論の深さを制御 (`low`, `high`, `minimal`, `medium`)。複雑な台本作成時は `high` を推奨。
- **thoughtSignature**: 継続的な編集やマルチターン対話で必須。前のターンの署名を次のリクエストに含めること。
- **media_resolution**: 画像・動画の解析度を制御 (`low`, `medium`, `high`, `ultra_high`)。

---

## 開発・運用フロー (CLI)

### GitHub 操作
- `gh repo create [name] --public --source=. --remote=origin`: レポジトリ作成と紐付け
- `git push origin main`: コードのデプロイ

### Vercel 操作
- `vercel link`: プロジェクトの紐付け
- `vercel deploy`: デプロイ開始

### Supabase 操作
- `supabase init`: プロジェクト初期化
- `supabase db push`: スキーマの適用
