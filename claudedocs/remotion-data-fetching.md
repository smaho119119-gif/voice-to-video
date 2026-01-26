# Remotion Data Fetching 完全ガイド

## 2つの主要アプローチ

### アプローチ 1: レンダリング前（推奨）✅

**calculateMetadata を使用**

```tsx
// Root.tsx
import { Composition } from 'remotion';

<Composition
  id="MyVideo"
  component={MyVideo}
  durationInFrames={150}
  fps={30}
  width={1920}
  height={1080}
  calculateMetadata={async ({ props, abortSignal }) => {
    // データをフェッチ
    const data = await fetch('https://api.example.com/data', {
      signal: abortSignal,  // リクエストキャンセル対応
    }).then(r => r.json());

    // props に追加して返す
    return {
      props: {
        ...props,
        data,
      },
      durationInFrames: 150,
    };
  }}
/>
```

**メリット:**
- JSON 直列化可能なデータに最適
- 複数のブラウザタブが並行レンダリングしても過剰フェッチを防ぐ
- レンダリング開始前にデータが準備される

**制限:**
- JSON 直列化可能なデータのみ（関数、クラス不可）

### アプローチ 2: レンダリング中

**delayRender / continueRender を使用**

```tsx
import { delayRender, continueRender } from 'remotion';
import { useEffect, useState } from 'react';

const MyComponent = () => {
  const [handle] = useState(() => delayRender());
  const [data, setData] = useState(null);

  useEffect(() => {
    // データをフェッチ
    fetch('https://api.example.com/data')
      .then(r => r.json())
      .then(data => {
        setData(data);
        continueRender(handle);  // レンダリング再開
      })
      .catch(err => {
        console.error(err);
        continueRender(handle);  // エラーでも再開
      });
  }, [handle]);

  if (!data) {
    return null;  // ローディング中
  }

  return <div>{data.content}</div>;
};
```

**メリット:**
- 非 JSON データ（Blob、Function など）も扱える
- レガシーバージョンとの互換性

**注意:**
- 30秒以内に `continueRender()` を呼ぶ必要あり（タイムアウト）
- タイムアウトは設定可能

## 主要関数

### delayRender()

**目的:** レンダリングを一時停止

```tsx
const handle = delayRender();
```

**重要:**
> "You need to clear all handles created by delayRender() within 30 seconds after the page is opened."

**タイムアウト設定:**
```tsx
const handle = delayRender('Fetching data', { timeoutInMilliseconds: 60000 });  // 60秒
```

### continueRender()

**目的:** レンダリングを再開

```tsx
continueRender(handle);
```

**完全な例:**
```tsx
const MyVideo = () => {
  const [handle] = useState(() => delayRender('Fetching API data'));
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch('/api/data')
      .then(r => r.json())
      .then(result => {
        setData(result);
        continueRender(handle);  // ✅ 成功時に再開
      })
      .catch(err => {
        console.error('Failed to fetch:', err);
        continueRender(handle);  // ⚠️ エラー時も必ず再開
      });
  }, [handle]);

  return data ? <div>{data.text}</div> : null;
};
```

### cancelRender()

**目的:** レンダリングを中止（失敗時）

```tsx
import { cancelRender } from 'remotion';

useEffect(() => {
  fetch('/api/data')
    .then(r => r.json())
    .then(data => {
      setData(data);
      continueRender(handle);
    })
    .catch(err => {
      cancelRender(err);  // ✅ レンダリングを中止
    });
}, [handle]);
```

**メリット:**
- タイムアウトまで待たずにエラーで停止
- デバッグが容易

## 実践パターン

### パターン 1: calculateMetadata でシンプルフェッチ

```tsx
<Composition
  id="UserProfile"
  component={UserProfile}
  calculateMetadata={async ({ props }) => {
    const user = await fetch(`https://api.example.com/users/${props.userId}`)
      .then(r => r.json());

    return {
      props: { ...props, user },
      durationInFrames: 150,
    };
  }}
/>
```

### パターン 2: AbortController で最適化

```tsx
<Composition
  id="LiveData"
  component={LiveDataVideo}
  calculateMetadata={async ({ props, abortSignal }) => {
    const controller = new AbortController();

    // props が変更されたらリクエストをキャンセル
    abortSignal.addEventListener('abort', () => {
      controller.abort();
    });

    const data = await fetch('https://api.example.com/live', {
      signal: controller.signal,
    }).then(r => r.json());

    return {
      props: { ...props, data },
      durationInFrames: 200,
    };
  }}
/>
```

### パターン 3: デバウンスで API 負荷軽減

```tsx
const useDebouncedFetch = (url: string, delay: number = 500) => {
  const [data, setData] = useState(null);
  const [handle] = useState(() => delayRender());

  useEffect(() => {
    const timer = setTimeout(() => {
      fetch(url)
        .then(r => r.json())
        .then(result => {
          setData(result);
          continueRender(handle);
        });
    }, delay);

    return () => clearTimeout(timer);
  }, [url, delay, handle]);

  return data;
};
```

### パターン 4: 複数 API の並列フェッチ

```tsx
<Composition
  id="Dashboard"
  component={Dashboard}
  calculateMetadata={async ({ props }) => {
    // 並列フェッチ
    const [users, posts, comments] = await Promise.all([
      fetch('/api/users').then(r => r.json()),
      fetch('/api/posts').then(r => r.json()),
      fetch('/api/comments').then(r => r.json()),
    ]);

    return {
      props: {
        ...props,
        users,
        posts,
        comments,
      },
      durationInFrames: 300,
    };
  }}
/>
```

## 重要な考慮事項

### ❌ 絶対にやってはいけないこと

#### 1. frame を依存配列に入れる

```tsx
// ❌ 最悪のパターン: 毎フレームAPIリクエスト
const MyComponent = () => {
  const frame = useCurrentFrame();
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch('/api/data').then(r => r.json()).then(setData);
  }, [frame]);  // ❌ レート制限エラー！

  return <div>{data}</div>;
};
```

**問題:**
- 30fps × 150フレーム = 4,500リクエスト/動画
- API レート制限に引っかかる
- レンダリングが非常に遅い

#### 2. 一貫性のないデータ

```tsx
// ❌ 悪い例: ランダムデータ
const MyComponent = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    setData(Math.random());  // ❌ フレームごとに異なる値
  }, []);

  return <div>{data}</div>;
};
```

**問題:**
- 並列レンダリング時に各スレッドで異なるデータ
- 動画がチラつく

**解決策:**
```tsx
// ✅ 良い例: calculateMetadata でシード生成
<Composition
  calculateMetadata={async ({ props }) => {
    const seed = Date.now();  // 一貫したシード
    return {
      props: { ...props, seed },
      durationInFrames: 150,
    };
  }}
/>
```

### ✅ ベストプラクティス

#### 1. データの事前フェッチ

```tsx
// ✅ レンダリング前にフェッチ
<Composition
  calculateMetadata={async ({ props }) => {
    const data = await fetchAllData();  // 1回だけ
    return { props: { ...props, data } };
  }}
/>
```

#### 2. エラーハンドリング

```tsx
useEffect(() => {
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
      cancelRender(err);  // ✅ エラーで中止
    });
}, [handle]);
```

#### 3. ローディング状態の処理

```tsx
const MyComponent = () => {
  const [data, setData] = useState(null);
  const [handle] = useState(() => delayRender());

  useEffect(() => {
    fetchData().then(result => {
      setData(result);
      continueRender(handle);
    });
  }, [handle]);

  // ✅ ローディング中は何も表示しない
  if (!data) return null;

  return <div>{data.content}</div>;
};
```

## キャッシュ戦略

### localStorage キャッシュ

```tsx
const fetchWithCache = async (url: string) => {
  const cacheKey = `cache-${url}`;
  const cached = localStorage.getItem(cacheKey);

  if (cached) {
    const { data, timestamp } = JSON.parse(cached);
    const age = Date.now() - timestamp;

    // 5分以内ならキャッシュを使用
    if (age < 5 * 60 * 1000) {
      return data;
    }
  }

  const data = await fetch(url).then(r => r.json());

  localStorage.setItem(cacheKey, JSON.stringify({
    data,
    timestamp: Date.now(),
  }));

  return data;
};
```

### インメモリキャッシュ

```tsx
const dataCache = new Map<string, any>();

const fetchWithMemoryCache = async (url: string) => {
  if (dataCache.has(url)) {
    return dataCache.get(url);
  }

  const data = await fetch(url).then(r => r.json());
  dataCache.set(url, data);

  return data;
};
```

## デバッグ

### タイムアウトの延長

```tsx
const handle = delayRender('Slow API', {
  timeoutInMilliseconds: 120000,  // 2分
});
```

### ログ出力

```tsx
useEffect(() => {
  console.log('[Data Fetch] Starting...');
  const handle = delayRender();

  fetch('/api/data')
    .then(r => {
      console.log('[Data Fetch] Response received');
      return r.json();
    })
    .then(data => {
      console.log('[Data Fetch] Data parsed:', data);
      setData(data);
      continueRender(handle);
      console.log('[Data Fetch] Render continued');
    })
    .catch(err => {
      console.error('[Data Fetch] Error:', err);
      cancelRender(err);
    });
}, []);
```

## まとめ

### calculateMetadata を使うべき場合

- ✅ JSON 直列化可能なデータ
- ✅ レンダリング前にデータが必要
- ✅ 並列レンダリング時の過剰フェッチを防ぎたい
- ✅ シンプルな API コール

### delayRender/continueRender を使うべき場合

- ✅ 非 JSON データ（Blob、Function など）
- ✅ レガシーバージョン対応
- ✅ 動的なデータフェッチ
- ✅ 複雑なエラーハンドリング

### 絶対に避けるべきこと

- ❌ frame を依存配列に入れる
- ❌ ランダムデータ（一貫性なし）
- ❌ エラーハンドリングなし
- ❌ タイムアウト考慮なし
