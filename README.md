# YouTube書き起こしツール

YouTube動画のURLを入力するだけで、音声をWhisperで自動書き起こしし、テキストファイルとしてダウンロードできるWebアプリです。

## 主な機能
- YouTubeのURLを複数キューに追加し、順次自動で書き起こし
- Whisper（OpenAI）による高精度な音声認識（smallモデル）
- 書き起こし結果のテキストファイルをダウンロード
- ダークモード対応のモダンなUI

## ディレクトリ構成

```
backend/   # Node.js (Express) + Python(Whisper) バックエンド
frontend/  # React フロントエンド
```

## セットアップ手順

### 1. Whisper・yt-dlpのインストール
- Python3, pip, Node.js, npmが必要です。
- Whisper, torch, yt-dlpをインストールしてください。

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

## ライセンス
MIT
