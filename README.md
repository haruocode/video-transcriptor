# YouTube 書き起こしツール

YouTube 動画の URL を入力するだけで、音声を Whisper で自動書き起こしし、テキストファイルとして保存できる CLI ツールです。

## 主な機能

- YouTube の URL をキューに追加し、順次自動で書き起こし
- whisper-ctranslate2 による高精度な音声認識
- 書き起こし結果をテキストファイルとして保存
- CLI でジョブの追加・一覧・ログ確認が可能

## ディレクトリ構成

```
backend/   # Node.js (Express) + Python(Whisper) バックエンド
cli.js     # CLIツール
```

## セットアップ手順

### 1. 依存ツールのインストール

Python3, Node.js, npm, Redis が必要です。

```bash
pip3 install whisper-ctranslate2 torch --break-system-packages
brew install yt-dlp redis
```

### 2. 依存パッケージのインストール

```bash
npm install
```

### 3. 起動

```bash
# Redis を起動（別ターミナル）
redis-server

# サーバーを起動
node index.js
```

または Docker Compose を使う場合:

```bash
docker-compose up
```

## CLI の使い方

```bash
# YouTube URLをキューに追加
node cli.js add <url> [model]

# キューの状態を確認
node cli.js list

# ワーカーのログをリアルタイム表示
node cli.js logs

# 完了・失敗済みジョブを削除
node cli.js clean
```

`model` には `tiny` / `base` / `small` / `medium` / `large` が指定できます（デフォルト: `small`）。

## MP3 ファイルを直接書き起こす

WAV → MP3 変換:

```bash
ffmpeg -i TRACK01.wav TRACK01.mp3
```

バックエンド経由で書き起こし:

```bash
node index.js
curl -X POST http://localhost:3001/api/transcribe \
  -H 'Content-Type: application/json' \
  -d '{"filename":"TRACK01.mp3","model":"medium"}'
```

## クラウドへのデプロイ (Google Cloud Run)

**前提**: `gcloud` コマンドがインストールされ、プロジェクトが作成されていること。

1. **プロジェクト設定と API 有効化**

   ```bash
   gcloud config set project [YOUR_PROJECT_ID]
   gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
   gcloud auth configure-docker us-central1-docker.pkg.dev
   ```

2. **Artifact Registry リポジトリの作成** (初回のみ)

   ```bash
   gcloud artifacts repositories create repo1 \
     --repository-format=docker \
     --location=us-central1 \
     --description="Docker repository"
   ```

3. **ビルド & デプロイ**

   ```bash
   gcloud builds submit --tag us-central1-docker.pkg.dev/[YOUR_PROJECT_ID]/repo1/backend .

   gcloud run deploy video-transcriptor-backend \
     --image us-central1-docker.pkg.dev/[YOUR_PROJECT_ID]/repo1/backend \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --memory 2Gi \
     --timeout 3600 \
     --max-instances 1 \
     --set-env-vars DEFAULT_MODEL=small
   ```

---

### トラブルシューティング

**Q. yt-dlp で "Sign in to confirm you're not a bot" エラーが出る**
A. データセンターの IP がブロックされています。`backend/index.js` で `User-Agent` を偽装する対策を入れていますが、それでも失敗する場合は Cookie をコンテナに渡す高度な対策が必要です。

**Q. Cloud Build が遅い**
A. PyTorch のダウンロードに時間がかかるためです。頻繁にデプロイする場合は `--cache-from` オプションの利用を検討してください。

## ライセンス

MIT
