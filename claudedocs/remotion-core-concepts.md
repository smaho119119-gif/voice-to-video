# Remotion Core Concepts

## 基本原理

### フレームベースアニメーション
Remotionの中心思想: **「動画は時間経過における画像の関数である」**

- 現在のフレーム番号と空白のキャンバスを提供
- フレームごとに内容を変えることでアニメーションを作成
- 最初のフレームは `0`
- 最後のフレームは `durationInFrames - 1`

### 動画の必須プロパティ

すべての動画は以下の4つのプロパティが必要:

1. **width** (ピクセル単位)
2. **height** (ピクセル単位)
3. **durationInFrames** (総フレーム数)
4. **fps** (フレームレート)

これらは `useVideoConfig()` フックで取得可能

```tsx
const { width, height, durationInFrames, fps } = useVideoConfig();
```

## Composition構造

Compositionは Reactコンポーネントと動画メタデータを組み合わせたもの

### 必須Props

```tsx
<Composition
  id="MyVideo"              // 一意な識別子（文字、数字、ハイフンのみ）
  fps={30}                  // フレームレート
  durationInFrames={150}    // 総フレーム数
  width={1920}              // 幅（ピクセル）
  height={1080}             // 高さ（ピクセル）
  component={MyComponent}   // Reactコンポーネント
  // または
  lazyComponent={lazy(() => import('./MyComponent'))}  // 遅延読み込み
/>
```

### オプションProps

- **defaultProps**: 初期Props（JSON直列化可能）
- **calculateMetadata**: メタデータ計算用
- **schema**: Zodスキーマ（ビジュアル編集を有効化）

### 重要な考慮事項

**コンポーネント読み込み:**
- `lazyComponent` を使用すると React Suspense がトリガーされる
- 起動時間が短縮され、大規模プロジェクトで有利
- デフォルトエクスポートが必要

**Props の直列化:**
> "Props must be an object that contains only pure JSON-serializable values. Functions, classes, and other non-serializable values will be lost while rendering."

**パフォーマンス:**
- 大きな `defaultProps` オブジェクトはパフォーマンスに影響
- Type には `type` 宣言を使用し、`interface` は使わない

## フレームの取得

### useCurrentFrame()

```tsx
import { useCurrentFrame } from 'remotion';

const frame = useCurrentFrame();
```

**重要な動作:**
- `<Sequence>` 内では、シーケンスの開始位置からの相対フレームを返す
- 絶対フレームが必要な場合は、トップレベルで取得してpropsで渡す

**例:**
```tsx
// タイムラインフレーム25の時点で:
// - トップレベル: frame = 25
// - <Sequence from={10}> 内: frame = 15
```

## ディレクトリ構造

```
my-video/
├── public/           # 静的アセット（画像、音声、動画）
│   └── assets/
├── src/
│   ├── Root.tsx     # Composition登録
│   └── MyVideo.tsx  # 動画コンポーネント
└── package.json
```

## ベストプラクティス

1. **モジュラー設計**: 複数のCompositionを登録して機能を分離
2. **React Fragmentを活用**: 複数のCompositionを同時登録
3. **型安全性**: TypeScriptで型定義を徹底
4. **パフォーマンス**: 大規模プロジェクトでは `lazyComponent` を使用
