# YouTube 書き起こしツール

YouTube 動画の URL を入力するだけで、音声を Whisper で自動書き起こしし、
さらに Claude Code で読み物としての「本」に構成するところまで一気通貫で行うツールです。

## 主な機能

- YouTube の URL をキューに追加し、順次自動で書き起こし
- whisper-ctranslate2 による高精度な音声認識
- 書き起こし結果をテキストファイルとして保存
- **書き起こし後、`make-book` スキルで `my-books/` に構造化ノートを自動生成**
- CLI でジョブの追加・一覧・ログ確認が可能

## 処理の流れ

```
node cli.js add <URL>
  └─ Express (3001) → BullMQ → worker.js
       1. yt-dlp でタイトル取得
       2. yt-dlp で mp3 ダウンロード    → uploads/<title>.mp3
       3. whisper-ctranslate2 で書き起こし → transcriptions/<title>.txt
       4. claude -p "/make-book ..."     → my-books/<title>/
```

手順4は失敗してもジョブは成功扱いになります（書き起こしは残るので、
後述の `node cli.js book` でやり直せます）。

## ディレクトリ構成

```
index.js   # Express サーバー（キューAPI）
worker.js  # 書き起こし＋本生成ワーカー
cli.js     # CLIツール
.claude/skills/make-book/  # 本を生成するスキル
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
# YouTube URLをキューに追加（書き起こし→本まで自動）
node cli.js add <url>

# 書き起こしだけして本は作らない
node cli.js add <url> --no-book

# 書き起こし済みのテキストから本だけ作り直す
node cli.js book <name>
node cli.js book <name> --force   # 既存の my-books/<name>/ を上書き

# キューの状態を確認
node cli.js list

# ワーカーのログをリアルタイム表示
node cli.js logs

# 完了・失敗済みジョブを削除
node cli.js clean
```

## 本の自動生成について

手順4では `claude` CLI をヘッドレス（`-p`）で起動し、`make-book` スキルを実行します。
Claude Code がインストール・ログイン済みである必要があります。

環境変数で挙動を調整できます。

| 変数 | 既定値 | 説明 |
| --- | --- | --- |
| `WHISPER_LANGUAGE` | 自動判定 | `ja` / `en` などで言語を固定 |
| `AUTO_BOOK` | 有効 | `0` / `false` / `no` で本の自動生成をオフ |
| `CLAUDE_BIN` | `claude` | claude CLI のパス |
| `BOOK_TIMEOUT_MS` | `1200000`（20分） | 本生成のタイムアウト |
| `BOOK_MODEL` | 未指定 | 使うモデル（例: `opus`, `sonnet`） |
| `BOOK_MAX_USD` | 未指定 | 1本あたりの上限コスト |

Claude Code のセッション内から `node index.js` を起動した場合でも動くよう、
ワーカーは子プロセスの `CLAUDECODE` を落としてから `claude` を起動します。


## ライセンス

MIT
