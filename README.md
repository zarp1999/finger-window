# Finger Window

Vite + React + TypeScriptで作る、両手の指先に追従するカメラエフェクト。
MediaPipe Hand Landmarkerで指の位置を検出し、Canvas 2DとWebGLで映像を合成します。

## 開発

Node.js 22.12以上を使ってください。

```sh
npm ci
npm run dev
```

開発URLは `http://127.0.0.1:4173`。カメラの開始にはブラウザの許可が必要です。

```sh
npm run typecheck
npm run build
npm run preview
```

`dist/`はViteが生成する公開用ファイルです。編集は`src/`で行います。
依存バージョンは`package-lock.json`で固定されています。

## 構成

- `src/components/`: カメラ画面・設定パネル。Reactは低頻度の表示状態を管理。
- `src/hooks/`: Reactとカメラセッションの接続、任意のWebMCP登録。
- `src/camera/CameraSource.ts`: カメラ権限・ストリーム・停止処理。
- `src/camera/CameraSession.ts`: セッションとフレームループ。座標はReact stateに入れません。
- `src/tracking/HandTracker.ts`: モデルの遅延読み込み・GPU/CPU切替・座標の平滑化。
- `src/rendering/`: 枠、手の関節、映像加工、WebGLリソースの解放。
- `src/lib/geometry.ts`: 凸包、面積、サーモ色の計算。
- `src/types.ts`: 型と初期設定。

## 実行条件

カメラはHTTPSまたはlocalhostで利用できます。初回にWASMをjsDelivrから、
モデルをGoogleの配布元から取得するためインターネット接続が必要です。
映像の検出・加工はブラウザ内で行い、録画や映像送信はしません。
両手が検出されたときだけ加工窓を表示します。サーモは疑似的な色変換です。
停止・画面離脱でカメラのトラックを解放し、アンマウントでモデルと描画リソースも解放します。

## 公開

`.openai/hosting.json`に既存Sitesの識別子と`dist`の静的配信設定を保存しています。
Sitesの公開処理では`npm run build`の出力を配信します。
