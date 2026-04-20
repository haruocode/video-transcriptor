# Repository Guidelines

## Project Structure & Module Organization
- `index.js` — Express API (queue endpoints: `/api/queue`, `/api/queue/clean`)
- `worker.js` — BullMQ worker; downloads via `yt-dlp`, transcribes via `whisper-ctranslate2` (`large-v3-turbo` 固定)
- `cli.js` — CLIツール (`add`, `list`, `logs`, `clean`)
- `uploads/` — 入力MP3（コミット不可）
- `transcriptions/` — 出力`.txt`（コミット不可）
- `logs/` — ワーカーログ（コミット不可）

## Build & Development Commands
- 前提: Node 18+, Python 3.9+, `yt-dlp`, `whisper-ctranslate2`, Redis
- `npm install` — 依存パッケージのインストール
- `redis-server` — Redis起動
- `node index.js` — APIサーバー起動 (`http://localhost:3001`)
- または `docker-compose up`

## CLI の使い方
```
node cli.js add <url>   # ジョブ追加
node cli.js list        # キュー確認
node cli.js logs        # ワーカーログ表示
node cli.js clean       # 完了・失敗ジョブ削除
```

## Coding Style
- インデント: スペース2つ、シングルクォート、セミコロンあり
- `camelCase` for variables/functions

## Commit Guidelines
- 簡潔な命令形コミット（Conventional Commits 推奨）:
  - `feat: add queue retry logic`
  - `fix: handle yt-dlp timeout`
- `uploads/`, `transcriptions/`, `logs/` はコミットしない

## Security
- `yt-dlp` と `whisper-ctranslate2` へのシェルアウトあり。未検証の入力をフラグとして渡さないこと。
- モデルファイルやダウンロードメディアはコミットしない。
