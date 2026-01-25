# Project Rules (CLAUDE.md)

## このファイルが正
- 本リポジトリのルールは **この `CLAUDE.md` のみ**を正とする。

## 適用範囲（重要）
- これらのルールは **今後新しく作るコード**に必ず適用する。
- 既存コード（過去資産）の全面準拠は後で段階的に実施する（ただし、新規追加・改修で触る部分は可能な範囲で準拠）。

## 必須ルール（このリポジトリ共通）

### 1) すべてのロジックは「API化・コンポーネント化」する
- Next.js の `src/app/api/**/route.ts` は **薄いルーティング層** とし、ビジネスロジックは直接書かない。
- ルートは入力バリデーションと呼び出し（usecase/service）とレスポンス整形のみ。

推奨レイヤ
- `src/usecases/**`: 1ユースケース=1機能（例: generateScript, generateImage, generateVoice）
- `src/services/**`: 外部API（Gemini/OpenAI/ElevenLabs/Supabase 等）を叩く薄いクライアント/アダプタ
- `src/lib/**`: 純関数・ユーティリティ・型定義

### 2) すべてのユニットは「単独で動いてテストできる」こと
- usecase/service/lib は Next.js から独立して import 可能にする。
- 依存は関数引数で注入（Dependency Injection）し、モックでテスト可能にする。
- 副作用（fetch/DB/FS）は service に閉じ込める。

テスト方針
- 単体テスト対象は `src/usecases/**`, `src/services/**`, `src/lib/**`, `src/remotion/utils/**` の純関数・境界に寄せる。
- UI（Reactコンポーネント）は最小限の結合テストに留め、ロジックは hooks/usecase に退避する。

### 3) 1ファイル500行以内
- **1ファイルは500行以内**。
- 500行を超えそうなら必ず分割する（例: `MainVideo.tsx` → `Scene.tsx` / `Captions.tsx` / `Effects.tsx` など）。

分割の目安
- 1ファイルが 350 行を超えたら分割を検討開始。
- 「型定義」「APIクライアント」「UI」「ユースケース」「Remotion演出」は混在させない。

### 4) Remotionの実装方針
- `src/remotion/**` は「合成（Composition）」と「演出（Effects/Transitions/Captions）」を分割する。
- 音声解析・字幕タイミングなどは **純関数**（`src/remotion/utils/**`）として切り出し、単体テスト可能にする。

禁止
- Remotionコンポーネント内で外部APIを叩かない（データ生成はAPI/usecase側で完結）。

### 5) APIキー・シークレット
- `.env*` のキーはコードに埋め込まない。
- 外部API呼び出しは service 層へ集約。

### 6) 変更の粒度
- 1PR/1変更で目的を明確にする。
- 大規模変更は段階的に（破壊的変更を避ける）。

### 7) 開発サーバーのポート
- **開発サーバーは必ずポート `4000` を使用する**
- 他のプロジェクトとポートが競合するため、デフォルトの3000は使わない
- `package.json` の `scripts` で `-p 4000` を指定済み
- `npm run dev` → http://localhost:4000 で起動する

### 8) Supabaseテーブル命名規則
- **新規テーブルには必ずプレフィクス `vg_` を付ける**（video generator の略）
- 例: `vg_projects`, `vg_theme_history`, `vg_settings`
- 他のアプリのテーブルと区別するため、必ず統一する
- RLSポリシー名にもプレフィクスを含める（例: `"Users can view their own vg_projects"`）
- 関数/トリガー名にもプレフィクスを含める（例: `vg_set_current_project()`）

### 9) TTS（音声合成）設定
- **デフォルトTTSエンジン**: Gemini 2.5 TTS（無料、レート制限あり）
- **使用可能なGemini TTSモデル**:
  - `gemini-2.5-flash-preview-tts` - バランス型（デフォルト）
  - `gemini-2.5-flash-tts` - 高速・安定版
  - `gemini-2.5-pro-tts` - 最高品質（低速）
  - `gemini-2.5-flash-lite-preview-tts` - 最速・軽量
- **ボイス**: 女性4名（Zephyr, Kore, Leda, Aoede）、男性4名（Puck, Charon, Fenrir, Orus）
- **演技指導（voice_style）**: 各シーンで感情・トーンを自然言語で指定可能
- 他プロバイダー: Google Cloud TTS, ElevenLabs も選択可能
