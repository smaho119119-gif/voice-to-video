# キャラシート生成ガイド（nanobanana pro用）

## 概要
nanobanana proでオリジナルキャラクターを生成し、リップシンク用のキャラシートを作成する手順です。

---

## Step 1: ベースキャラクター生成

**プロンプト例:**
```
anime girl, front facing, simple background, white background,
bust shot, looking at viewer, neutral expression, closed mouth,
high quality, detailed face, cute style
```

**設定:**
- サイズ: 512x512 または 1024x1024（正方形）
- 背景: 白または透明

---

## Step 2: 口のバリエーション生成

各口形を個別に生成するか、img2imgで変化させます。

### 必要な口形（9種類）

| ファイル名 | 口形 | プロンプト追加 |
|-----------|------|---------------|
| mouth-A.png | 大きく開いた口（あ） | `open mouth, saying "ah"` |
| mouth-B.png | 閉じた口（ん、む） | `closed mouth, lips together` |
| mouth-C.png | 横に開いた口（い） | `wide smile, showing teeth, saying "ee"` |
| mouth-D.png | 少し開いた口（え） | `slightly open mouth, relaxed` |
| mouth-E.png | 丸い口（お） | `round mouth, O shape, saying "oh"` |
| mouth-F.png | 歯で下唇（ふ、ヴ） | `teeth on lower lip, F sound` |
| mouth-G.png | 歯を見せる笑顔 | `grinning, showing teeth, smile` |
| mouth-H.png | 舌が見える（L音） | `tongue visible, L sound` |
| mouth-X.png | ニュートラル | `neutral expression, slight smile, relaxed` |

---

## Step 3: 目のバリエーション生成

### 必要な目の状態（3種類）

| ファイル名 | 状態 | プロンプト追加 |
|-----------|------|---------------|
| eyes-open.png | 開いた目 | `eyes open, looking forward` |
| eyes-half.png | 半開きの目 | `eyes half closed, sleepy, droopy eyes` |
| eyes-closed.png | 閉じた目 | `eyes closed, peaceful, blinking` |

---

## Step 4: 画像の配置

生成した画像をこのフォルダに配置：
```
public/avatars/2d/custom-template/
├── config.json
├── base.png          ← ベース画像（目と口なしが理想）
├── mouth-A.png       ← 口パーツのみ（透過PNG）
├── mouth-B.png
├── ...
├── eyes-open.png     ← 目パーツのみ（透過PNG）
├── eyes-half.png
└── eyes-closed.png
```

---

## 重要なポイント

### 透過PNG推奨
- 口と目は**透過PNG**として保存
- 背景を透明にして、ベース画像に重ねられるようにする

### 一貫性を保つ
- 同じシード値を使用して、キャラクターの一貫性を維持
- 表情以外は変わらないようにする

### 代替方法：フルフレーム方式
パーツ分離が難しい場合は、フルフレーム方式も可能：
- 各画像に完全なキャラクターを含める
- base.pngは不要
- config.jsonの`compositeMode`を`"full"`に設定

---

## フルフレーム方式のconfig.json

```json
{
  "name": "カスタムキャラ（フルフレーム）",
  "description": "口形ごとに完全な画像を使用",
  "format": "png",
  "compositeMode": "full",
  "mouths": {
    "A": "frame-A.png",
    "B": "frame-B.png",
    ...
  },
  "size": {
    "width": 512,
    "height": 512
  },
  "fps": 30
}
```

この方式では、各フレームが完全な画像なので、合成処理が不要で高速です。
