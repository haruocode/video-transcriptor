# YouTube 書き起こしツール

YouTube 動画の URL を入力するだけで、音声を Whisper で自動書き起こしし、テキストファイルとしてダウンロードできる Web アプリです。

## 主な機能

- YouTube の URL を複数キューに追加し、順次自動で書き起こし
- Whisper（OpenAI）による高精度な音声認識（small モデル）
- 書き起こし結果のテキストファイルをダウンロード
- ダークモード対応のモダンな UI

## ディレクトリ構成

```
backend/   # Node.js (Express) + Python(Whisper) バックエンド
frontend/  # React フロントエンド
```

## セットアップ手順

### 1. Whisper・yt-dlp のインストール

- Python3, pip, Node.js, npm が必要です。
- Whisper, torch, yt-dlp をインストールしてください。

```
pip3 install openai-whisper torch --break-system-packages
brew install yt-dlp  # または sudo apt install yt-dlp
```

### 2. バックエンドのセットアップ

```
cd backend
npm install
```

### 3. フロントエンドのセットアップ

```
cd ../frontend
npm install
```

### 4. サーバーの起動

- 別々のターミナルで以下を実行してください。

**バックエンド**

```
cd backend && node index.js
```

**フロントエンド**

```
cd frontend && npm start
```

- ブラウザで http://localhost:3000 を開いて利用できます。

## MP3 ファイルを書き起こしファイルに変換する方法

たまにそんなことがしたい時もあるだろう。そんな時はこうだ。

ちな、WAV ファイルを MP3 ファイルに変換するのはこうだ。

```
ffmpeg -i TRACK01.wav TRACK01.mp3
```

```
$ cd backend && node index.js
$ curl -X POST http://localhost:3001/api/transcribe -H 'Content-Type: application/json' -d '{"filename":"TRACK01.mp3","model":"medium"}'
```

## クラウドへのデプロイ

コスト重視で運用するための推奨構成（Cloud Run + Netlify）の手順です。

### 1. Backend (Google Cloud Run)

**前提**: `gcloud` コマンドがインストールされ、プロジェクトが作成されていること。

1. **プロジェクト設定とAPI有効化**

   ```bash
   # プロジェクトIDを設定
   gcloud config set project [YOUR_PROJECT_ID]
   # 必要なAPIを有効化
   gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
   # Docker認証の設定
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
   cd backend
   # ビルド (時間がかかります)
   gcloud builds submit --tag us-central1-docker.pkg.dev/[YOUR_PROJECT_ID]/repo1/backend .

   # デプロイ (コスト節約設定: メモリ2GB, タイムアウト60分, インスタンス数1)
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

   完了後に表示される **Service URL** (`https://...run.app`) を控えておきます。

### 2. Frontend (Netlify)

GitHub 連携で行うのが最も簡単です。

1. GitHub にコードをプッシュし、Netlify で "Import from Git" を選択。
2. **Build settings**:
   - Base directory: `frontend`
   - Build command: `npm run build`
   - Publish directory: `frontend/build`
3. **Environment variables** (重要):
   - Key: `REACT_APP_API_URL`
   - Value: `(Cloud RunのService URL)` ※末尾の `/` は含めない
4. Deploy を実行。

---

### トラブルシューティング

**Q. yt-dlp で "Sign in to confirm you’re not a bot" エラーが出る**
A. データセンターのIPがブロックされています。`backend/index.js` で `User-Agent` を偽装する対策を入れていますが、それでも失敗する場合は Cookie をコンテナに渡す高度な対策が必要です。

**Q. Cloud Build が遅い**
A. PyTorch のダウンロードに時間がかかるためです。頻繁にデプロイする場合は `--cache-from` オプションの利用を検討してください。

## ライセンス

MIT
