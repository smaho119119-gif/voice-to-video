# Remotion Best Practices 完全ガイド

## 1. プロジェクト構造

### 推奨ディレクトリ構造

```
my-video-app/
├── public/                    # 静的アセット
│   ├── images/
│   ├── audio/
│   ├── video/
│   └── fonts/
├── src/
│   ├── Root.tsx              # Composition 登録
│   ├── remotion/             # 動画コンポーネント
│   │   ├── MainVideo.tsx
│   │   ├── scenes/
│   │   │   ├── Scene1.tsx
│   │   │   ├── Scene2.tsx
│   │   │   └── Scene3.tsx
│   │   ├── components/       # 再利用可能コンポーネント
│   │   │   ├── Subtitle.tsx
│   │   │   ├── Transition.tsx
│   │   │   └── Background.tsx
│   │   └── utils/            # ユーティリティ関数
│   │       ├── animations.ts
│   │       └── timing.ts
│   ├── lib/                  # ビジネスロジック
│   │   ├── supabase.ts
│   │   ├── ai.ts
│   │   └── lipsync.ts
│   └── app/                  # Next.js アプリ（SaaS の場合）
│       ├── page.tsx
│       └── api/
└── package.json
```

### ファイル命名規則

```tsx
// ✅ 良い例
MainVideo.tsx          // PascalCase (コンポーネント)
animations.ts          // camelCase (ユーティリティ)
use-video-data.ts      // kebab-case (hooks)

// ❌ 悪い例
main-video.tsx         // コンポーネントは PascalCase
Animations.ts          // ユーティリティは camelCase
UseVideoData.ts        // hooks は小文字始まり
```

## 2. コンポーネント設計

### コンポーネント分割

```tsx
// ❌ 悪い例: 1ファイルに全て
const MyVideo = () => {
  return (
    <AbsoluteFill>
      {/* 500行のコード */}
      <div>Background</div>
      <div>Content</div>
      <div>Subtitle</div>
      <div>Effects</div>
    </AbsoluteFill>
  );
};

// ✅ 良い例: 責務ごとに分割
const MyVideo = () => {
  return (
    <AbsoluteFill>
      <Background />
      <Content />
      <Subtitle />
      <Effects />
    </AbsoluteFill>
  );
};
```

### 再利用可能なコンポーネント

```tsx
// ✅ 汎用的なコンポーネント
interface SubtitleProps {
  text: string;
  startFrame: number;
  durationInFrames: number;
  style?: React.CSSProperties;
}

export const Subtitle: React.FC<SubtitleProps> = ({
  text,
  startFrame,
  durationInFrames,
  style,
}) => {
  const frame = useCurrentFrame();
  const relativeFrame = frame - startFrame;

  if (relativeFrame < 0 || relativeFrame >= durationInFrames) {
    return null;
  }

  const opacity = interpolate(
    relativeFrame,
    [0, 10, durationInFrames - 10, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateRight: 'clamp' }
  );

  return (
    <div style={{ ...style, opacity }}>
      {text}
    </div>
  );
};
```

### Props の型定義

```tsx
// ✅ 型安全な Props
interface VideoProps {
  title: string;
  scenes: Scene[];
  bgm?: BGMConfig;
  aspectRatio?: '16:9' | '9:16';
}

export const MainVideo: React.FC<VideoProps> = ({
  title,
  scenes,
  bgm,
  aspectRatio = '16:9',
}) => {
  // 実装
};
```

## 3. アニメーション

### interpolate vs spring

```tsx
// ✅ シンプルなフェード → interpolate
const opacity = interpolate(frame, [0, 20], [0, 1]);

// ✅ 弾むアニメーション → spring
const scale = spring({
  frame,
  fps,
  config: { damping: 12, stiffness: 200 }
});

// ❌ 悪い例: 不要な spring
const opacity = spring({ frame, fps, from: 0, to: 1 });  // interpolate で十分
```

### extrapolate を必ず指定

```tsx
// ❌ 危険: 範囲外の動作が不明
const value = interpolate(frame, [0, 100], [0, 1]);

// ✅ 安全: clamp で範囲外を制限
const value = interpolate(
  frame,
  [0, 100],
  [0, 1],
  { extrapolateRight: 'clamp' }
);
```

### イージング関数の活用

```tsx
// ❌ 機械的な動き（linear）
const scale = interpolate(frame, [0, 30], [0.5, 1]);

// ✅ 自然な動き（easing）
const scale = interpolate(
  frame,
  [0, 30],
  [0.5, 1],
  { easing: Easing.bezier(0.4, 0.0, 0.2, 1) }
);
```

### タイミングの「ゆらぎ」

```tsx
// ❌ 均一なタイミング（AI感）
const delay = 200;  // 毎回200ms

// ✅ 自然なゆらぎ
const baseDelay = 200;
const humanizedDelay = baseDelay + (Math.random() - 0.5) * 20;  // ±10ms
```

## 4. パフォーマンス

### useMemo / useCallback を活用

```tsx
const MyComponent = () => {
  const frame = useCurrentFrame();

  // ❌ 悪い例: 毎フレーム再計算
  const expensiveValue = calculateExpensive(frame);

  // ✅ 良い例: メモ化
  const expensiveValue = useMemo(() => {
    return calculateExpensive(frame);
  }, [frame]);

  return <div>{expensiveValue}</div>;
};
```

### Sequence で不要な要素をアンマウント

```tsx
// ❌ 悪い例: 全シーンを常にレンダリング
const MyVideo = () => {
  return (
    <>
      <Scene1 />
      <Scene2 />
      <Scene3 />
    </>
  );
};

// ✅ 良い例: Sequence で最適化
const MyVideo = () => {
  return (
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
  );
};
```

### 画像・動画の最適化

```tsx
// ✅ 音声なし動画は muted を追加
<OffthreadVideo src={video} muted />

// ✅ 静的アセットは staticFile
<Img src={staticFile('/images/background.jpg')} />

// ✅ 透過不要なら JPEG
<Img src={staticFile('/images/photo.jpg')} />  // PNG より速い
```

## 5. 型安全性

### Scene の型定義

```tsx
// ✅ 厳密な型定義
interface Scene {
  scene_index: number;
  duration: number;
  avatar_script: string;
  subtitle: string;
  image_prompt: string;
  imageUrl?: string;
  audioUrl?: string;
  lipSyncVideoUrl?: string;
  emotion?: 'neutral' | 'happy' | 'serious' | 'excited' | 'thoughtful';
  transition?: 'fade' | 'slide' | 'zoom' | 'wipe';
  emphasis_words?: string[];
  sound_effects?: SoundEffect[];
}

interface SoundEffect {
  type: 'ambient' | 'action' | 'transition' | 'emotion';
  keyword: string;
  timing: 'start' | 'middle' | 'end' | 'throughout';
  volume: number;
  url?: string;
}
```

### VideoConfig の型定義

```tsx
interface VideoConfig {
  title: string;
  description?: string;
  scenes: Scene[];
  bgm?: BGMConfig;
  aspectRatio?: '16:9' | '9:16';
  openingDuration?: number;
  endingDuration?: number;
}
```

## 6. エラーハンドリング

### 画像読み込みエラー

```tsx
<Img
  src={scene.imageUrl}
  onError={() => {
    console.error('Image load error:', scene.imageUrl);
  }}
/>
```

### データフェッチエラー

```tsx
useEffect(() => {
  const handle = delayRender();

  fetch('/api/data')
    .then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then(data => {
      setData(data);
      continueRender(handle);
    })
    .catch(err => {
      console.error('Fetch failed:', err);
      cancelRender(err);  // ✅ レンダリングを中止
    });
}, []);
```

### フォールバック

```tsx
const MyVideo: React.FC<VideoProps> = ({ scenes = [], title = 'Untitled' }) => {
  // ✅ デフォルト値でフォールバック

  if (scenes.length === 0) {
    return <div>No scenes available</div>;
  }

  return (
    // 実装
  );
};
```

## 7. テスト

### ユニットテスト（アニメーション）

```tsx
import { interpolate } from 'remotion';

describe('Subtitle Animation', () => {
  it('should fade in during first 10 frames', () => {
    const opacity = interpolate(
      5,  // フレーム5
      [0, 10],
      [0, 1],
      { extrapolateRight: 'clamp' }
    );

    expect(opacity).toBe(0.5);
  });

  it('should clamp at 1 after frame 10', () => {
    const opacity = interpolate(
      20,  // フレーム20
      [0, 10],
      [0, 1],
      { extrapolateRight: 'clamp' }
    );

    expect(opacity).toBe(1);
  });
});
```

### スナップショットテスト

```tsx
import { render } from '@testing-library/react';
import { Subtitle } from './Subtitle';

test('renders correctly', () => {
  const { container } = render(
    <Subtitle
      text="Hello World"
      startFrame={0}
      durationInFrames={60}
    />
  );

  expect(container).toMatchSnapshot();
});
```

## 8. アクセシビリティ

### ARIA ラベル

```tsx
<button
  aria-label="Play video"
  onClick={handlePlay}
>
  ▶️
</button>
```

### キーボード操作

```tsx
<div
  tabIndex={0}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handlePlay();
    }
  }}
>
  Play
</div>
```

### コントラスト比

```tsx
// ✅ 良い例: 十分なコントラスト
<div style={{
  color: '#ffffff',
  backgroundColor: '#000000',  // コントラスト比 21:1
}}>
  Text
</div>

// ❌ 悪い例: 低いコントラスト
<div style={{
  color: '#cccccc',
  backgroundColor: '#dddddd',  // コントラスト比 1.4:1
}}>
  Text
</div>
```

## 9. デバッグ

### コンソールログ

```tsx
const MyComponent = () => {
  const frame = useCurrentFrame();

  console.log('[Frame]', frame);  // フレーム番号をログ

  return <div>Frame: {frame}</div>;
};
```

### React DevTools

```bash
# プレビュー起動
npm start

# ブラウザで開く
# Chrome DevTools → Components タブ
```

### パフォーマンスプロファイリング

```bash
# 詳細ログ
npx remotion render --log=verbose

# 出力:
# Frame 45: 1250ms (遅い！)
# Frame 46: 50ms
# Frame 47: 60ms
```

## 10. 本番環境

### 環境変数

```tsx
// .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
GEMINI_API_KEY=xxx  // サーバーサイドのみ
```

```tsx
// 使用方法
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const geminiKey = process.env.GEMINI_API_KEY;  // サーバーサイドのみ
```

### セキュリティ

```tsx
// ❌ 悪い例: APIキーをクライアントに公開
const apiKey = 'sk-xxx';  // 危険！

// ✅ 良い例: サーバーサイドで処理
// app/api/generate/route.ts
const apiKey = process.env.GEMINI_API_KEY;  // 安全
```

### レンダリング最適化

```bash
# 本番ビルド
npm run build

# 最適化されたレンダリング
npx remotion render \
  --codec=h264 \
  --crf=23 \
  --concurrency=8 \
  --image-format=jpeg
```

## 11. Git ワークフロー

### .gitignore

```
# Remotion
.remotion/
out/
*.mp4
*.mov

# Next.js
.next/
out/

# 環境変数
.env*.local

# 依存関係
node_modules/

# OS
.DS_Store
```

### コミットメッセージ

```bash
# ✅ 良い例
git commit -m "feat: add Ken Burns effect to background images"
git commit -m "fix: resolve black gap issue in scene transitions"
git commit -m "perf: optimize video component with OffthreadVideo"

# ❌ 悪い例
git commit -m "update"
git commit -m "fix"
git commit -m "changes"
```

## 12. チェックリスト

### プロジェクト開始時

- [ ] TypeScript を有効化
- [ ] ESLint / Prettier を設定
- [ ] .gitignore を作成
- [ ] 環境変数を設定（.env.local）
- [ ] ディレクトリ構造を整理

### 開発中

- [ ] コンポーネントは500行以内に分割
- [ ] Props に型定義を追加
- [ ] useMemo / useCallback で最適化
- [ ] Sequence で不要な要素をアンマウント
- [ ] extrapolate を必ず指定
- [ ] エラーハンドリングを実装

### レンダリング前

- [ ] `npx remotion benchmark` で最適化
- [ ] 音声なし動画に `muted` を追加
- [ ] H.264 コーデックを使用
- [ ] --log=verbose で遅いフレームを確認
- [ ] テストレンダリング（--scale=0.5）

### 本番リリース前

- [ ] 環境変数を確認
- [ ] APIキーをサーバーサイドに移動
- [ ] セキュリティ監査
- [ ] パフォーマンステスト
- [ ] クロスブラウザテスト

## まとめ

### 最も重要な5つのプラクティス

1. **コンポーネント分割** - 1ファイル500行以内
2. **型安全性** - TypeScript で厳密な型定義
3. **パフォーマンス** - useMemo, Sequence, muted
4. **エラーハンドリング** - フォールバック実装
5. **セキュリティ** - APIキーをサーバーサイドに

### 避けるべき5つのアンチパターン

1. ❌ frame を useEffect の依存配列に入れる
2. ❌ extrapolate を指定しない
3. ❌ 全シーンを常にレンダリング
4. ❌ APIキーをクライアントに公開
5. ❌ エラーハンドリングなし
