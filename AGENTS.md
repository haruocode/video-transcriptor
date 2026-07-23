# Repository Guidelines

## Project Structure & Module Organization
- `index.js` — Express API (queue endpoints: `/api/queue`, `/api/queue/clean`)
- `worker.js` — BullMQ worker; downloads via `yt-dlp`, transcribes via `whisper-ctranslate2` (`large-v3-turbo` 固定 / 言語は自動判定), then generates a book via `claude -p "/make-book ..."`
- `cli.js` — CLIツール (`add`, `book`, `list`, `logs`, `clean`)
- `.claude/skills/make-book/` — 書き起こしを構造化ノート化するスキル
- `uploads/` — 入力MP3（コミット不可）
- `transcriptions/` — 出力`.txt`（コミット不可）
- `my-books/` — 生成された本
- `logs/` — ワーカーログ（コミット不可）

## Build & Development Commands
- 前提: Node 18+, Python 3.9+, `yt-dlp`, `whisper-ctranslate2`, Redis
- `npm install` — 依存パッケージのインストール
- `redis-server` — Redis起動
- `node index.js` — APIサーバー起動 (`http://localhost:3001`)
- または `docker-compose up`

## CLI の使い方
```
node cli.js add <url>            # ジョブ追加（書き起こし→本まで）
node cli.js add <url> --no-book  # 書き起こしのみ
node cli.js book <name>          # 本だけ作り直し（--force で上書き）
node cli.js list                 # キュー確認
node cli.js logs                 # ワーカーログ表示
node cli.js clean                # 完了・失敗ジョブ削除
```

## 書き起こし
- 言語は whisper の自動判定に任せる（`--language` を渡さない）。固定したいときのみ `WHISPER_LANGUAGE=ja` などを指定

## 本の自動生成
- `AUTO_BOOK=0` で無効化。`CLAUDE_BIN` / `BOOK_TIMEOUT_MS` / `BOOK_MODEL` / `BOOK_MAX_USD` で調整
- 本生成の失敗はジョブを失敗させない（書き起こしは保持され、`cli.js book` で再実行できる）
- ヘッドレス実行では `make-book` に `--non-interactive` が渡り、確認が必要な場面では何も書かずに終了する

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
