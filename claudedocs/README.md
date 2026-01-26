# Remotion 完全ガイド - 目次

このディレクトリには、Remotion の公式ドキュメントを体系的にまとめた日本語ガイドが含まれています。

## 📚 ドキュメント一覧

### 1. [基本概念](./remotion-core-concepts.md)
- フレームベースアニメーション
- 動画の必須プロパティ（width, height, fps, durationInFrames）
- Composition 構造
- useCurrentFrame() フック
- ディレクトリ構造

### 2. [コンポーネント](./remotion-components.md)
- **Player** - React アプリ内での動画埋め込み
- **Video Components** - OffthreadVideo, Html5Video
- **Audio Components** - Html5Audio
- **Sequence** - タイムライン制御
- **GIF** - GIF アニメーション
- **その他** - AbsoluteFill, Img

### 3. [アニメーション](./remotion-animations.md)
- **interpolate()** - 値の補間、フェード、スケール
- **spring()** - 物理ベースのバウンスアニメーション
- **Easing** - イージング関数
- **Ken Burns Effect** - パン＆ズーム
- **実践パターン** - テキストアニメーション、トランジション

### 4. [テンプレート](./remotion-templates.md)
- **全22個の無料テンプレート**
  - Next.js テンプレート（SaaS向け）
  - AI・自動化テンプレート
  - 音声テンプレート（Azure TTS, Google TTS, Audiogram）
  - 3D・グラフィックス（Three Fiber, Skia）
  - 特殊用途（TikTok, Code Hike, Stargazer）
- テンプレートの選び方
- 導入方法

### 5. [パフォーマンス最適化](./remotion-performance.md)
- **Concurrency** - 並列処理の最適化
- **GPU 最適化** - WebGL, Canvas の扱い方
- **ビデオコーデック** - H.264, ProRes, VP8/VP9
- **コードレベル最適化** - useMemo, useCallback
- **画像・メディア最適化** - JPEG vs PNG, 解像度
- **レンダリング設定** - CRF, --scale, --log

### 6. [データフェッチ](./remotion-data-fetching.md)
- **2つのアプローチ**
  - calculateMetadata（推奨）
  - delayRender / continueRender
- **主要関数** - delayRender, continueRender, cancelRender
- **実践パターン** - AbortController, デバウンス、並列フェッチ
- **重要な考慮事項** - frame 依存、データ一貫性
- **キャッシュ戦略** - localStorage, インメモリ

### 7. [ベストプラクティス](./remotion-best-practices.md)
- **プロジェクト構造** - ディレクトリ構成、命名規則
- **コンポーネント設計** - 分割、再利用、型定義
- **アニメーション** - interpolate vs spring, extrapolate, イージング
- **パフォーマンス** - useMemo, Sequence, 画像最適化
- **型安全性** - Scene, VideoConfig の型定義
- **エラーハンドリング** - 画像エラー、データフェッチエラー
- **テスト** - ユニットテスト、スナップショット
- **アクセシビリティ** - ARIA, キーボード操作
- **デバッグ** - ログ、DevTools, プロファイリング
- **本番環境** - 環境変数、セキュリティ

## 🎯 推奨読書順序

### 初心者向け
1. [基本概念](./remotion-core-concepts.md) - Remotion の仕組みを理解
2. [コンポーネント](./remotion-components.md) - 使える部品を把握
3. [アニメーション](./remotion-animations.md) - 動きの作り方
4. [テンプレート](./remotion-templates.md) - テンプレートから始める

### 中級者向け
1. [データフェッチ](./remotion-data-fetching.md) - API 統合
2. [パフォーマンス最適化](./remotion-performance.md) - 高速化
3. [ベストプラクティス](./remotion-best-practices.md) - プロの書き方

### 上級者向け
- すべてのドキュメントを深く読む
- 公式ドキュメントで最新情報を確認
- テンプレートのソースコードを読む

## 🚀 クイックスタート

### 1. 最小構成の動画

```tsx
// src/MyVideo.tsx
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';

export const MyVideo = () => {
  const frame = useCurrentFrame();

  const opacity = interpolate(
    frame,
    [0, 30],
    [0, 1],
    { extrapolateRight: 'clamp' }
  );

  return (
    <AbsoluteFill style={{ backgroundColor: 'blue', opacity }}>
      <h1 style={{ color: 'white' }}>Hello Remotion!</h1>
    </AbsoluteFill>
  );
};
```

```tsx
// src/Root.tsx
import { Composition } from 'remotion';
import { MyVideo } from './MyVideo';

export const RemotionRoot = () => {
  return (
    <Composition
      id="MyVideo"
      component={MyVideo}
      durationInFrames={150}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};
```

### 2. よく使うパターン

#### フェードイン・アウト
```tsx
const opacity = interpolate(
  frame,
  [0, 20, 130, 150],
  [0, 1, 1, 0],
  { extrapolateRight: 'clamp' }
);
```

#### バウンスイン
```tsx
const scale = spring({
  frame,
  fps,
  config: { damping: 12, stiffness: 200 }
});
```

#### シーン切り替え
```tsx
<Sequence from={0} durationInFrames={60}>
  <Scene1 />
</Sequence>
<Sequence from={60} durationInFrames={60}>
  <Scene2 />
</Sequence>
```

## 💡 重要なポイント

### 必ず覚えるべきこと

1. **フレームベース** - すべてのアニメーションは `useCurrentFrame()` から始まる
2. **extrapolate** - interpolate には必ず extrapolate を指定
3. **OffthreadVideo** - 動画コンポーネントは OffthreadVideo を使う
4. **muted** - 音声なし動画には必ず muted を追加
5. **Sequence** - 不要な要素はアンマウントしてパフォーマンス向上

### 絶対に避けるべきこと

1. ❌ frame を useEffect の依存配列に入れる
2. ❌ extrapolate を指定しない
3. ❌ Html5Video を使う（OffthreadVideo を使う）
4. ❌ 音声なし動画で muted を忘れる
5. ❌ 全シーンを常にレンダリング

## 📖 公式リソース

- [公式ドキュメント](https://www.remotion.dev/docs/)
- [テンプレート集](https://www.remotion.dev/templates)
- [GitHub](https://github.com/remotion-dev/remotion)
- [Discord コミュニティ](https://remotion.dev/discord)

## 🎬 本プロジェクトでの活用

### 現在の実装状況

✅ **実装済み**
- Ken Burns Effect（背景画像の動的アニメーション）
- FilmGrain Effect（AI感軽減）
- OffthreadVideo（リップシンク動画）
- Sequence によるシーン管理
- interpolate / spring によるアニメーション
- トランジション overlap（黒画面防止）

🚧 **実装中**
- Audio Visualization（音声可視化）
- Particles（パーティクルエフェクト）
- 3D 要素（Three.js 統合）

📝 **計画中**
- Lottie アニメーション
- 動的カメラワーク
- より高度なトランジション

### パフォーマンス最適化の適用

- ✅ OffthreadVideo で別スレッドデコード
- ✅ muted プロパティで不要なダウンロード削減
- ✅ useMemo でアニメーション計算をキャッシュ
- ✅ Sequence で不要なコンポーネントをアンマウント
- ✅ Ken Burns でスライドショー感を排除

## 🔧 開発ワークフロー

### 1. 開発時

```bash
# プレビュー起動
npm start

# ブラウザで http://localhost:3000 を開く
```

### 2. テストレンダリング

```bash
# 低解像度で高速レンダリング
npx remotion render src/index.ts MyVideo out.mp4 --scale=0.5
```

### 3. 本番レンダリング

```bash
# 最適化されたレンダリング
npx remotion render src/index.ts MyVideo out.mp4 \
  --codec=h264 \
  --crf=23 \
  --concurrency=8 \
  --image-format=jpeg
```

### 4. 最適な並列度を見つける

```bash
npx remotion benchmark
```

## ✨ 次のステップ

1. [基本概念](./remotion-core-concepts.md)を読んで Remotion の仕組みを理解
2. [テンプレート](./remotion-templates.md)から適切なテンプレートを選択
3. [コンポーネント](./remotion-components.md)で使える部品を確認
4. [アニメーション](./remotion-animations.md)で動きを実装
5. [パフォーマンス最適化](./remotion-performance.md)で高速化
6. [ベストプラクティス](./remotion-best-practices.md)でプロの書き方を学ぶ

---

**最終更新**: 2026-01-24
**Remotion バージョン**: 4.0.407
**作成者**: Claude Code による自動生成ドキュメント
