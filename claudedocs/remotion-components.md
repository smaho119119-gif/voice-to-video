# Remotion Components 完全ガイド

## Player Component

### 概要
React アプリ内に Remotion 動画を埋め込み、ランタイムでカスタマイズ可能

### 基本的な使用法
```tsx
import { Player } from '@remotion/player';

<Player
  component={MyVideo}
  inputProps={{ title: "Hello" }}
  compositionWidth={1920}
  compositionHeight={1080}
  durationInFrames={150}
  fps={30}
/>
```

### 利用可能なテンプレート
- Next.js (App directory)
- Next.js (App directory + TailwindCSS)
- Next.js (Pages directory)
- React Router 7 (Remix)

## Video Components

### OffthreadVideo（推奨）✅

**最もパフォーマンスが良い動画コンポーネント**

```tsx
import { OffthreadVideo } from 'remotion';

<OffthreadVideo
  src={staticFile('video.mp4')}
  muted                    // 音声なしの場合は必須（パフォーマンス向上）
  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
/>
```

**特徴:**
- Rust ベースで高速
- 別スレッドでビデオデコード（UIのフレームレート低下を防ぐ）
- 大きなリップシンク動画でもスムーズ再生

### Html5Video（非推奨）⚠️

> "Prefer one of the other video tags which perform better."

```tsx
import { Html5Video } from 'remotion';

<Html5Video
  src={staticFile('video.webm')}
  volume={1.0}
  playbackRate={1.0}
  muted
  loop
  trimBefore={60}  // 最初の60フレームをカット
  trimAfter={30}   // 最後の30フレームをカット
/>
```

**Props:**
- `src`: 動画URL
- `volume`: 音量 (0-1)、または関数
- `playbackRate`: 速度 (1=通常、0.5=半分、2=2倍速)
- `muted`: 音声をミュート（パフォーマンス向上）
- `loop`: ループ再生
- `trimBefore/trimAfter`: フレーム単位でトリミング

**制限:**
- クライアントサイドレンダリング非対応
- 逆再生非対応
- iOS Safari では volume が常に 1

## Audio Components

### Html5Audio

```tsx
import { Html5Audio } from 'remotion';

<Html5Audio
  src={staticFile('audio.mp3')}
  volume={1.0}
  playbackRate={1.0}
  muted={false}
  loop={false}
  trimBefore={0}
  trimAfter={0}
  toneFrequency={1}  // ピッチ調整 (0.01-2)
/>
```

**Props:**
- `src`: 音声ファイル
- `volume`: 静的値 (0-1) またはフレームごとの関数
- `playbackRate`: 再生速度
- `toneFrequency`: ピッチ調整 (1=元のピッチ)
- `audioStreamIndex`: 特定の音声ストリーム選択
- `loopVolumeCurveBehavior`: ループ時のフレームカウント管理
- `acceptableTimeShiftInSeconds`: 同期許容誤差（デフォルト: 0.45秒）
- `pauseWhenBuffering`: バッファリング時に一時停止
- `useWebAudioApi`: Web Audio API 有効化
- `onError`: エラーハンドリング

**Studio機能:**
- `name`: タイムラインのラベル
- `showInTimeline`: タイムライン表示の制御

**制限:**
- iOS Safari では最大音量 1
- 逆再生非対応
- 極端な再生速度 (<0.0625 または >16) はエラーになる可能性

## Sequence Component

### 概要
コンポーネントの表示タイミングを制御

```tsx
import { Sequence } from 'remotion';

<Sequence from={30} durationInFrames={60}>
  <MyComponent />  {/* frame 30-90 で表示 */}
</Sequence>
```

### Props

| Prop | 説明 | デフォルト |
|------|------|----------|
| `from` | 開始フレーム | 0 |
| `durationInFrames` | 表示期間 | - |
| `layout` | 配置方法 | "absolute-fill" |
| `name` | タイムラインラベル | - |
| `width/height` | サイズオーバーライド | - |
| `className/style` | CSS カスタマイズ | - |
| `premountFor/postmountFor` | 事前/事後マウント | - |
| `showInTimeline` | タイムライン表示 | true |

### 重要なパターン

**カスケード（入れ子）:**
```tsx
<Sequence from={30}>
  <Sequence from={60}>
    {/* フレーム 90 (30+60) から開始 */}
  </Sequence>
</Sequence>
```

**連続再生:**
```tsx
import { Series } from 'remotion';

<Series>
  <Series.Sequence durationInFrames={40}>
    <Scene1 />
  </Series.Sequence>
  <Series.Sequence durationInFrames={60}>
    <Scene2 />  {/* 自動的にフレーム40から開始 */}
  </Series.Sequence>
</Series>
```

**レイアウト制御:**
```tsx
// デフォルト: absolute positioning
<Sequence from={0} durationInFrames={100}>
  <Content />
</Sequence>

// カスタムレイアウト
<Sequence from={0} durationInFrames={100} layout="none">
  <CustomLayout />
</Sequence>
```

## GIF Component

```tsx
import { Gif } from '@remotion/gif';

<Gif
  src={staticFile('animation.gif')}
  // useCurrentFrame() と同期
/>
```

## その他の Components

### AbsoluteFill
```tsx
import { AbsoluteFill } from 'remotion';

<AbsoluteFill style={{ backgroundColor: 'red' }}>
  {/* 親要素を完全に埋める */}
</AbsoluteFill>
```

### Img
```tsx
import { Img } from 'remotion';

<Img
  src={staticFile('image.png')}
  onError={() => console.error('Image load error')}
/>
```

## ベストプラクティス

### パフォーマンス最適化

1. **動画コンポーネント選択:**
   - 最優先: `OffthreadVideo`
   - 避ける: `Html5Video`

2. **音声の最適化:**
   - 音声なし動画には必ず `muted` を追加
   - 不要なダウンロードを防ぐ

3. **レイアウト:**
   - Three.js 使用時は `layout="none"`
   - デフォルトの absolute positioning は慎重に

### トラブルシューティング

**音量が効かない (iOS Safari):**
- iOS では音量が常に 1 になる仕様

**動画が黒くなる:**
- Sequence の `from` と `durationInFrames` を確認
- トランジション overlap を実装

**パフォーマンスが悪い:**
- `OffthreadVideo` に移行
- `muted` プロパティを追加
- 不要な `loop` を削除
