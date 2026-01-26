# Remotion Performance Optimization 完全ガイド

## 1. コア戦略

### Concurrency（並列処理）の最適化

```bash
# 最適な並列度を見つける
npx remotion benchmark
```

**重要:**
> "Use the `npx remotion benchmark` command to find the optimal concurrency."

- 並列度が高すぎる → メモリ不足、遅くなる
- 並列度が低すぎる → CPU を使い切れない、遅くなる

**推奨設定:**
```bash
# レンダリング時に並列度を指定
npx remotion render src/index.ts MyVideo out.mp4 --concurrency=8
```

### GPU 最適化

**GPU 依存要素:**
- WebGL コンテンツ
- Canvas グラフィックス
- CSS 3D transforms
- filter プロパティ

**問題点:**
クラウドサーバーは通常 GPU を持たない

**解決策:**
```tsx
// ❌ 避ける: WebGL エフェクト
<ThreeJSScene />

// ✅ 推奨: 事前レンダリングした画像
<Img src={staticFile('pre-rendered-effect.png')} />
```

### ビデオコーデックの選択

**パフォーマンス順（速い → 遅い）:**
1. **H.264 (MP4)** ← 最速・推奨
2. ProRes
3. VP8/VP9 WebM ← 非常に遅い（避ける）

```bash
# 推奨: H.264
npx remotion render --codec=h264

# 避ける: VP9
npx remotion render --codec=vp9  # 遅い！
```

## 2. コードレベル最適化

### JavaScript パフォーマンス

#### ボトルネックの特定

```tsx
// デバッグとタイミング計測
console.time('expensive-operation');
const result = expensiveCalculation();
console.timeEnd('expensive-operation');
```

```bash
# 詳細ログで遅いフレームを特定
npx remotion render --log=verbose
```

#### メモ化（Memoization）

```tsx
import { useMemo, useCallback } from 'react';

// ❌ 悪い例: 毎フレーム再計算
const MyComponent = () => {
  const frame = useCurrentFrame();
  const expensiveValue = calculateExpensive(frame);  // 重い！

  return <div>{expensiveValue}</div>;
};

// ✅ 良い例: useMemo でキャッシュ
const MyComponent = () => {
  const frame = useCurrentFrame();

  const expensiveValue = useMemo(() => {
    return calculateExpensive(frame);
  }, [frame]);

  return <div>{expensiveValue}</div>;
};
```

```tsx
// ✅ useCallback でコールバックをキャッシュ
const MyComponent = () => {
  const handleClick = useCallback(() => {
    console.log('Clicked');
  }, []);

  return <button onClick={handleClick}>Click</button>;
};
```

### 外部データフェッチの最適化

#### ❌ 悪い例: フレームごとにフェッチ

```tsx
// 絶対にやってはいけない
const MyComponent = () => {
  const frame = useCurrentFrame();
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch('/api/data').then(res => setData(res));
  }, [frame]);  // ❌ frame が依存配列に！

  return <div>{data}</div>;
};
```

#### ✅ 良い例: 初回のみフェッチ

```tsx
const MyComponent = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch('/api/data').then(res => setData(res));
  }, []);  // ✅ 初回のみ

  return <div>{data}</div>;
};
```

#### ✅ さらに良い例: calculateMetadata を使用

```tsx
// Root.tsx
<Composition
  id="MyVideo"
  component={MyVideo}
  calculateMetadata={async ({ props }) => {
    const data = await fetch('/api/data').then(r => r.json());
    return {
      props: { ...props, data },
      durationInFrames: 300,
    };
  }}
/>
```

### ローカルストレージキャッシュ

```tsx
const fetchDataWithCache = async (url: string) => {
  // キャッシュチェック
  const cached = localStorage.getItem(url);
  if (cached) {
    return JSON.parse(cached);
  }

  // フェッチ
  const data = await fetch(url).then(r => r.json());

  // キャッシュに保存
  localStorage.setItem(url, JSON.stringify(data));

  return data;
};
```

## 3. 画像・メディア最適化

### 画像フォーマット

| フォーマット | 速度 | 用途 |
|------------|------|------|
| **JPEG** | 速い | 写真、透過不要 |
| **PNG** | 遅い | 透過が必要な場合のみ |
| **WebP** | 中速 | 高品質・小サイズ |

```bash
# JPEG で高速レンダリング
npx remotion render --image-format=jpeg

# PNG は透過が必要な時のみ
npx remotion render --image-format=png
```

### 解像度の最適化

```bash
# 解像度を下げて高速化（テスト時）
npx remotion render --scale=0.5  # 半分のサイズ

# プロダクション
npx remotion render --scale=1    # フルサイズ
```

### ビデオコンポーネントの選択

```tsx
// ❌ 遅い: Html5Video
import { Html5Video } from 'remotion';
<Html5Video src={video} />

// ❌ 遅い: OffthreadVideo
import { OffthreadVideo } from 'remotion';
<OffthreadVideo src={video} />

// ✅ 速い: 最新の Video コンポーネント
import { Video } from 'remotion';
<Video src={video} muted />  // muted で音声ダウンロードをスキップ
```

**重要:**
```tsx
// 音声なし動画は必ず muted を追加
<Video src={silentVideo} muted />  // ✅ 不要なダウンロードを防ぐ
```

## 4. レンダリング設定の最適化

### 基本設定

```bash
# 推奨設定（バランス型）
npx remotion render \
  --codec=h264 \
  --image-format=jpeg \
  --concurrency=8 \
  --scale=1

# 高速プレビュー（テスト用）
npx remotion render \
  --codec=h264 \
  --image-format=jpeg \
  --concurrency=4 \
  --scale=0.5

# 最高品質（プロダクション）
npx remotion render \
  --codec=prores \
  --image-format=png \
  --concurrency=1 \
  --scale=1
```

### 詳細ログで最適化

```bash
# 詳細ログを有効化
npx remotion render --log=verbose

# 出力例:
# Frame 45: 1250ms (遅い！)
# Frame 46: 50ms
# Frame 47: 60ms
```

↓ フレーム45の処理を最適化

### CRF（品質設定）

```bash
# CRF 値が低い = 高品質・ファイルサイズ大
npx remotion render --crf=18

# CRF 値が高い = 低品質・ファイルサイズ小
npx remotion render --crf=28

# 推奨: 23（バランス）
npx remotion render --crf=23
```

## 5. 実践的な最適化テクニック

### React のパフォーマンス最適化

```tsx
// ✅ React.memo で不要な再レンダリングを防ぐ
const HeavyComponent = React.memo(({ value }: { value: number }) => {
  const expensiveResult = useMemo(() => {
    return complexCalculation(value);
  }, [value]);

  return <div>{expensiveResult}</div>;
});

// ✅ コンポーネントを分割
const MyVideo = () => {
  return (
    <>
      <BackgroundLayer />
      <ContentLayer />
      <OverlayLayer />
    </>
  );
};
```

### Sequence の最適化

```tsx
// ❌ 悪い例: 全シーンを常にレンダリング
<>
  <Scene1 />
  <Scene2 />
  <Scene3 />
</>

// ✅ 良い例: Sequence で必要な時だけレンダリング
<>
  <Sequence from={0} durationInFrames={60}>
    <Scene1 />
  </Sequence>
  <Sequence from={60} durationInFrames={60}>
    <Scene2 />
  </Sequence>
  <Sequence from={120} durationInFrames={60}>
    <Scene3 />
  </Sequence>
</>
```

### staticFile の活用

```tsx
// ✅ 事前にビルドされたアセット
import { staticFile } from 'remotion';

<Img src={staticFile('/images/background.jpg')} />
<Audio src={staticFile('/audio/music.mp3')} />
```

### プリロード

```tsx
// ✅ 画像をプリロード
import { prefetch } from 'remotion';

useEffect(() => {
  const { free, waitUntilDone } = prefetch(staticFile('/heavy-image.jpg'));

  return () => {
    free();  // クリーンアップ
  };
}, []);
```

## 6. パフォーマンス計測

### ベンチマーク

```bash
# 標準ベンチマーク
npx remotion benchmark

# 出力:
# Concurrency 4: 145 seconds
# Concurrency 8: 87 seconds  ← 最適
# Concurrency 16: 102 seconds
```

### console.time で計測

```tsx
const MyComponent = () => {
  const frame = useCurrentFrame();

  console.time('render-frame');

  // 重い処理
  const result = complexAnimation(frame);

  console.timeEnd('render-frame');

  return <div>{result}</div>;
};
```

### パフォーマンスプロファイリング

```tsx
// Chrome DevTools でプロファイリング
// 1. npm start でプレビュー起動
// 2. Chrome DevTools を開く
// 3. Performance タブで記録
// 4. ボトルネックを特定
```

## 7. チェックリスト

### ✅ 必須最適化

- [ ] `npx remotion benchmark` で最適な concurrency を見つける
- [ ] 音声なし動画に `muted` を追加
- [ ] H.264 コーデックを使用
- [ ] JPEG フォーマットを優先（透過不要な場合）
- [ ] `useMemo` / `useCallback` で重い計算をキャッシュ
- [ ] `Sequence` で不要なコンポーネントをアンマウント

### ✅ 推奨最適化

- [ ] `calculateMetadata` でデータフェッチ
- [ ] ローカルストレージでキャッシュ
- [ ] `React.memo` で不要な再レンダリング防止
- [ ] `--log=verbose` で遅いフレームを特定
- [ ] GPU 依存要素を事前レンダリング画像に置き換え

### ✅ 高度な最適化

- [ ] Prefetch で重いアセットをプリロード
- [ ] Chrome DevTools でプロファイリング
- [ ] Worker スレッドで重い処理を分離
- [ ] CDN でアセット配信
- [ ] サーバーサイドで並列レンダリング

## まとめ

**最も効果的な最適化（優先順）:**

1. **適切な concurrency** - `npx remotion benchmark`
2. **Video コンポーネントの選択** - 最新の `<Video>` を使用
3. **muted プロパティ** - 音声なし動画に追加
4. **H.264 コーデック** - 最速
5. **useMemo/useCallback** - 重い計算をキャッシュ
6. **Sequence でアンマウント** - 不要なコンポーネントを削除
