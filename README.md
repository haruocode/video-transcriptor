# YouTube 書き起こしツール

YouTube 動画の URL を入力するだけで、音声を Whisper で自動書き起こしし、テキストファイルとして保存できる CLI ツールです。

## 主な機能

- YouTube の URL をキューに追加し、順次自動で書き起こし
- whisper-ctranslate2 による高精度な音声認識
- 書き起こし結果をテキストファイルとして保存
- CLI でジョブの追加・一覧・ログ確認が可能

## ディレクトリ構成

```
index.js   # Express サーバー（キューAPI）
worker.js  # 書き起こしワーカー
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


## ライセンス

MIT
