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

## ライセンス

MIT
