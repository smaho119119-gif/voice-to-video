# Remotion 無料テンプレート 完全ガイド

## 全テンプレート一覧

### 基本テンプレート

#### 1. Hello World
- **URL**: `/templates/hello-world`
- **用途**: 入門用スターターテンプレート
- **特徴**: 最もシンプルな構成、学習に最適

#### 2. Blank
- **URL**: `/templates/blank`
- **用途**: 空白キャンバス
- **特徴**: 完全にゼロから構築したい場合

#### 3. JavaScript
- **URL**: `/templates/javascript`
- **用途**: Plain JavaScript 版
- **特徴**: TypeScript を使わないプロジェクト向け

### Next.js テンプレート（SaaS向け）

#### 4. Next.js (App directory)
- **URL**: `/templates/next`
- **用途**: SaaS 動画生成アプリ
- **特徴**:
  - App Router 対応
  - サーバーサイドレンダリング
  - API Routes 統合

#### 5. Next.js (App directory + TailwindCSS)
- **URL**: `/templates/next-tailwind`
- **用途**: SaaS 動画生成アプリ（スタイリング付き）
- **特徴**:
  - Tailwind CSS 完全統合
  - レスポンシブデザイン
  - ユーティリティファースト

#### 6. Next.js (Pages directory)
- **URL**: `/templates/next-pages-dir`
- **用途**: Pages Router を使う SaaS アプリ
- **特徴**: 従来の Next.js アーキテクチャ

#### 7. React Router 7 (Remix)
- **URL**: `/templates/react-router`
- **用途**: SaaS 動画生成アプリ
- **特徴**: React Router ベースのルーティング

### サーバー・ツールテンプレート

#### 8. Recorder
- **URL**: `/templates/recorder`
- **用途**: JavaScript ベースの動画制作ツール
- **特徴**: ブラウザで直接レコーディング

#### 9. Render Server (Express.js)
- **URL**: `/templates/render-server`
- **用途**: Express.js 動画レンダリングサーバー
- **特徴**:
  - API エンドポイント提供
  - サーバーサイドレンダリング
  - スケーラブル

#### 10. Stills
- **URL**: `/templates/still`
- **用途**: 動的 PNG/JPEG 生成
- **特徴**: ビルトインサーバー付き

### AI・自動化テンプレート

#### 11. Prompt to Motion Graphics
- **URL**: `/templates/prompt-to-motion-graphics`
- **用途**: AI パワードコード生成
- **特徴**:
  - プロンプトからモーショングラフィックス生成
  - AI 統合

#### 12. Prompt to Video
- **URL**: `/templates/prompt-to-video`
- **用途**: ストーリー作成（画像 + ナレーション）
- **特徴**:
  - テキストから動画生成
  - 画像とナレーション自動生成

### 音声テンプレート

#### 13. Text-To-Speech (Azure)
- **URL**: `/templates/tts`
- **用途**: Azure TTS で音声合成 + 動画作成
- **特徴**:
  - Azure Cognitive Services 統合
  - 多言語対応

#### 14. Text-To-Speech (Google)
- **URL**: `/templates/google-tts`
- **用途**: Google TTS で音声合成 + 動画作成
- **特徴**:
  - Google Cloud TTS 統合
  - 自然な音声生成

#### 15. Audiogram
- **URL**: `/templates/audiogram`
- **用途**: ポッドキャスト波形ビジュアライゼーション
- **特徴**:
  - 音声波形表示
  - ポッドキャストカバー

#### 16. Music Visualization
- **URL**: `/templates/music-visualization`
- **用途**: ポッドキャスト音声ビジュアライゼーション
- **特徴**:
  - 音声解析
  - リアルタイムビジュアル

### 3D・グラフィックステンプレート

#### 17. 3D
- **URL**: `/templates/three`
- **用途**: React Three Fiber 統合
- **特徴**:
  - 3D レンダリング
  - WebGL サポート
  - Three.js 完全統合

#### 18. Skia
- **URL**: `/templates/skia`
- **用途**: React Native Skia スターター
- **特徴**:
  - 高性能 2D グラフィックス
  - モバイル最適化

### 特殊用途テンプレート

#### 19. Overlay
- **URL**: `/templates/overlay`
- **用途**: 動画編集ソフト用オーバーレイ
- **特徴**:
  - 透過背景
  - エフェクト層

#### 20. Code Hike
- **URL**: `/templates/code-hike`
- **用途**: コードアニメーションデモ
- **特徴**:
  - シンタックスハイライト
  - コード説明動画

#### 21. Stargazer
- **URL**: `/templates/stargazer`
- **用途**: GitHub リポジトリお祝い動画
- **特徴**:
  - GitHub API 統合
  - スター数表示

#### 22. TikTok
- **URL**: `/templates/tiktok`
- **用途**: 単語ごとのアニメーション字幕
- **特徴**:
  - TikTok スタイルのキャプション
  - 単語ポップアニメーション

## テンプレートの選び方

### プロジェクトタイプ別

| プロジェクト | 推奨テンプレート | 理由 |
|-------------|----------------|------|
| SaaS 動画アプリ | Next.js + TailwindCSS | フル機能 + 美しいUI |
| 音声合成動画 | Google TTS | 高品質な日本語音声 |
| ポッドキャスト | Audiogram or Music Visualization | 音声ビジュアル |
| 3D コンテンツ | 3D (Three Fiber) | 3D レンダリング |
| ショート動画 | TikTok | SNS 最適化 |
| コード解説 | Code Hike | シンタックスハイライト |
| レンダリングサーバー | Render Server | API 提供 |

### 機能別

**AI・自動化が欲しい:**
- Prompt to Motion Graphics
- Prompt to Video

**音声機能が欲しい:**
- Text-To-Speech (Google) ← 日本語最適
- Text-To-Speech (Azure)
- Audiogram
- Music Visualization

**3D・高度なグラフィックス:**
- 3D (Three Fiber)
- Skia

**Next.js 統合:**
- Next.js (App directory + TailwindCSS) ← 推奨
- Next.js (App directory)
- Next.js (Pages directory)

**シンプル・学習用:**
- Hello World
- Blank
- JavaScript

## 導入方法

### CLI からインストール

```bash
# Next.js + TailwindCSS テンプレート
npx create-video --next-tailwind

# Google TTS テンプレート
npx create-video --google-tts

# 3D テンプレート
npx create-video --three

# TikTok テンプレート
npx create-video --tiktok
```

### 手動ダウンロード

1. https://www.remotion.dev/templates にアクセス
2. 目的のテンプレートをクリック
3. "Download" または "View on GitHub" からダウンロード
4. `npm install` でインストール
5. `npm start` で起動

## ベストプラクティス

### 1. テンプレートのカスタマイズ

```tsx
// テンプレートをベースに独自機能を追加
import { TemplateComponent } from './template';

export const MyVideo = () => {
  return (
    <>
      <TemplateComponent />
      {/* 独自のコンポーネントを追加 */}
      <MyCustomScene />
    </>
  );
};
```

### 2. 複数テンプレートの組み合わせ

```tsx
// TikTok の字幕 + Audiogram の波形
import { TikTokCaptions } from './tiktok-template';
import { Waveform } from './audiogram-template';

export const HybridVideo = () => {
  return (
    <>
      <Waveform />
      <TikTokCaptions />
    </>
  );
};
```

### 3. テンプレートから学ぶ

各テンプレートは**ベストプラクティスの宝庫**:
- コード構造
- パフォーマンス最適化
- アニメーションパターン
- API 統合方法

## 推奨テンプレート（用途別）

### 🎬 動画生成アプリを作る
1. **Next.js (App directory + TailwindCSS)** ← 最優先
2. Google TTS（音声合成）
3. Render Server（サーバー構築）

### 🎵 音声系コンテンツ
1. **Google TTS** ← 日本語最適
2. Audiogram（波形）
3. Music Visualization（ビジュアル）

### 📱 SNS ショート動画
1. **TikTok** ← 字幕アニメーション
2. Next.js + TailwindCSS（配信基盤）

### 🎨 クリエイティブ・3D
1. **3D (Three Fiber)** ← 3D
2. Skia（2D グラフィックス）
3. Prompt to Motion Graphics（AI生成）

### 🎓 教育・コード解説
1. **Code Hike** ← コードアニメーション
2. Next.js + TailwindCSS（プラットフォーム）

## 注意点

1. **ライセンス確認**: 各テンプレートのライセンスを確認
2. **依存関係**: テンプレートごとに必要なパッケージが異なる
3. **アップデート**: Remotion のバージョンアップに注意
4. **カスタマイズ**: テンプレートはあくまで出発点、独自機能を追加
