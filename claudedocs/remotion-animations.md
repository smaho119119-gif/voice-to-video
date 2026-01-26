# Remotion Animations 完全ガイド

## interpolate() 関数

### 基本構文
```tsx
import { interpolate } from 'remotion';

const value = interpolate(
  inputValue,
  [inputRange],
  [outputRange],
  options
);
```

### 基本的な使用例

#### フェードイン
```tsx
const frame = useCurrentFrame();

const opacity = interpolate(
  frame,
  [0, 20],      // フレーム 0-20
  [0, 1],       // 透明度 0-1
  {
    extrapolateRight: 'clamp'  // 20以降は1で固定
  }
);

return <div style={{ opacity }}>{/* コンテンツ */}</div>;
```

#### フェードイン → フェードアウト
```tsx
const { durationInFrames } = useVideoConfig();

const opacity = interpolate(
  frame,
  [0, 20, durationInFrames - 20, durationInFrames],
  [0, 1, 1, 0]
);
```

#### スケールアニメーション
```tsx
const scale = interpolate(
  frame,
  [0, 30],
  [0.5, 1],
  {
    easing: Easing.bezier(0.4, 0.0, 0.2, 1)  // Material Design easing
  }
);

return <div style={{ transform: `scale(${scale})` }} />;
```

### オプション

| オプション | デフォルト | 説明 |
|-----------|----------|------|
| `extrapolateLeft` | `"extend"` | 入力範囲の左側の動作 |
| `extrapolateRight` | `"extend"` | 入力範囲の右側の動作 |
| `easing` | Linear | イージング関数 |

### Extrapolation モード

**extend** (デフォルト):
```tsx
// 範囲外も補間を継続
interpolate(25, [0, 20], [0, 1])  // 結果: 1.25
```

**clamp**:
```tsx
// 範囲の境界値を返す
interpolate(25, [0, 20], [0, 1], { extrapolateRight: 'clamp' })  // 結果: 1
```

**wrap**:
```tsx
// 値をループ
interpolate(25, [0, 20], [0, 1], { extrapolateRight: 'wrap' })  // 結果: 0.25
```

**identity**:
```tsx
// 入力値をそのまま返す
interpolate(25, [0, 20], [0, 1], { extrapolateRight: 'identity' })  // 結果: 25
```

### Easing 関数

```tsx
import { Easing } from 'remotion';

// Material Design easing
const ease = Easing.bezier(0.4, 0.0, 0.2, 1);

// カスタムベジェ曲線
const customEase = Easing.bezier(0.25, 0.1, 0.25, 1);

const value = interpolate(
  frame,
  [0, 30],
  [0, 100],
  { easing: ease }
);
```

**組み込みイージング:**
- Linear（デフォルト）
- `Easing.bezier(x1, y1, x2, y2)`
- `Easing.in(Easing.ease)`
- `Easing.out(Easing.ease)`
- `Easing.inOut(Easing.ease)`

### 複数ポイントの補間

```tsx
// 複雑なアニメーションカーブ
const position = interpolate(
  frame,
  [0, 30, 60, 90],
  [0, 100, 150, 200],
  {
    easing: Easing.bezier(0.4, 0.0, 0.2, 1)
  }
);
```

## spring() 関数

### 概要
**物理ベースのアニメーション** - React Native Reanimated 2 由来

```tsx
import { spring } from 'remotion';

const value = spring({
  frame,
  fps,
  config: {
    damping: 10,
    stiffness: 100,
    mass: 1
  }
});
```

### 基本パラメータ

| パラメータ | 説明 |
|-----------|------|
| `frame` | 現在のフレーム（`useCurrentFrame()` から） |
| `fps` | フレームレート（`useVideoConfig()` から） |
| `from` | 開始値（デフォルト: 0） |
| `to` | 終了値（デフォルト: 1） |

### Config オプション

| パラメータ | デフォルト | 効果 |
|-----------|----------|------|
| `mass` | 1 | 小さい値 = 速いアニメーション |
| `stiffness` | 100 | 大きい値 = 弾むアニメーション |
| `damping` | 10 | 大きい値 = 弾みが少ない |
| `overshootClamping` | false | 目標値を超えないようにする |

### 実践例

#### バウンスイン
```tsx
const scale = spring({
  frame,
  fps,
  config: {
    damping: 12,
    stiffness: 200,
    mass: 0.5
  }
});

return (
  <div style={{
    transform: `scale(${scale})`
  }}>
    {/* バウンスして登場 */}
  </div>
);
```

#### スライドイン
```tsx
const translateX = spring({
  frame,
  fps,
  from: -100,
  to: 0,
  config: {
    damping: 15,
    stiffness: 100
  }
});

return (
  <div style={{
    transform: `translateX(${translateX}%)`
  }}>
    {/* 左からスライドイン */}
  </div>
);
```

#### 回転
```tsx
const rotate = spring({
  frame,
  fps,
  from: -180,
  to: 0,
  config: {
    damping: 20,
    stiffness: 80
  }
});

return (
  <div style={{
    transform: `rotate(${rotate}deg)`
  }}>
    {/* 回転して登場 */}
  </div>
);
```

### 高度な制御

#### duration指定
```tsx
const value = spring({
  frame,
  fps,
  durationInFrames: 40,  // 正確に40フレームで完了
  config: {
    stiffness: 100
  }
});
```

#### delay（遅延）
```tsx
const value = spring({
  frame,
  fps,
  delay: 15,  // 15フレーム後に開始
  config: {
    stiffness: 100
  }
});
```

#### reverse（逆再生）
```tsx
const value = spring({
  frame,
  fps,
  reverse: true,  // 1 から 0 へ
  config: {
    stiffness: 100
  }
});
```

### 処理順序
> Duration stretch → Reverse → Delay application

## 実践的なアニメーションパターン

### Ken Burns Effect（パン＆ズーム）

```tsx
const kenBurnsPatterns = [
  { zoom: [1.0, 1.2], pan: { x: [0, -10], y: [0, -5] } },
  { zoom: [1.2, 1.0], pan: { x: [-10, 0], y: [-5, 0] } },
  { zoom: [1.0, 1.15], pan: { x: [0, 10], y: [0, 0] } },
  { zoom: [1.15, 1.0], pan: { x: [10, 0], y: [0, 0] } },
  { zoom: [1.05, 1.2], pan: { x: [-5, 5], y: [-5, 5] } },
  { zoom: [1.1, 1.1], pan: { x: [0, 0], y: [-8, 8] } },
];

const pattern = kenBurnsPatterns[sceneIndex % kenBurnsPatterns.length];

const progress = interpolate(
  frame,
  [0, durationInFrames],
  [0, 1],
  {
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.4, 0.0, 0.2, 1)
  }
);

const scale = interpolate(progress, [0, 1], pattern.zoom);
const translateX = interpolate(progress, [0, 1], pattern.pan.x);
const translateY = interpolate(progress, [0, 1], pattern.pan.y);

return (
  <div style={{
    transform: `scale(${scale}) translate(${translateX}%, ${translateY}%)`
  }}>
    <img src={imageUrl} />
  </div>
);
```

### テキストアニメーション

```tsx
// ポップイン
const textScale = spring({
  frame,
  fps,
  config: {
    damping: 12,
    stiffness: 200
  }
});

const textRotate = interpolate(
  frame,
  [0, 10],
  [-5, 0],
  { extrapolateRight: 'clamp' }
);

return (
  <div style={{
    transform: `scale(${textScale}) rotate(${textRotate}deg)`,
    textShadow: `0 0 ${glowIntensity}px rgba(255,255,255,0.8)`
  }}>
    {text}
  </div>
);
```

### トランジション

```tsx
// フェード + スライド
const slideOut = interpolate(
  frame,
  [sceneEnd - 15, sceneEnd],
  [0, -100],
  { extrapolateRight: 'clamp' }
);

const slideIn = interpolate(
  frame,
  [0, 15],
  [100, 0],
  { extrapolateLeft: 'clamp' }
);

const fadeOut = interpolate(
  frame,
  [sceneEnd - 15, sceneEnd],
  [1, 0]
);

const fadeIn = interpolate(
  frame,
  [0, 15],
  [0, 1]
);
```

## ベストプラクティス

### 1. extrapolate を必ず指定
```tsx
// ❌ 悪い例
const opacity = interpolate(frame, [0, 20], [0, 1]);

// ✅ 良い例
const opacity = interpolate(
  frame,
  [0, 20],
  [0, 1],
  { extrapolateRight: 'clamp' }
);
```

### 2. イージング関数を活用
```tsx
// ❌ 機械的な動き
const scale = interpolate(frame, [0, 30], [0.5, 1]);

// ✅ 自然な動き
const scale = interpolate(
  frame,
  [0, 30],
  [0.5, 1],
  { easing: Easing.bezier(0.4, 0.0, 0.2, 1) }
);
```

### 3. spring は弾みが必要な時だけ
```tsx
// シンプルなフェード → interpolate
// バウンスして登場 → spring
```

### 4. パフォーマンス
```tsx
// 重い計算は useMemo でキャッシュ
const animationValue = useMemo(() => {
  return spring({ frame, fps, config: { /* ... */ } });
}, [frame, fps]);
```

## よくある間違い

### ❌ frame を useEffect の依存配列に入れる
```tsx
// 間違い: 全フレームで実行される
useEffect(() => {
  fetchData();
}, [frame]);
```

### ❌ 範囲外の値を考慮しない
```tsx
// frame が 20 を超えると予期しない値
const opacity = interpolate(frame, [0, 20], [0, 1]);
```

### ✅ 正しい実装
```tsx
const opacity = interpolate(
  frame,
  [0, 20],
  [0, 1],
  { extrapolateRight: 'clamp' }
);
```
