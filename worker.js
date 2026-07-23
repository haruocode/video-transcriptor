const { Worker } = require("bullmq");
const { exec, spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const Redis = require("ioredis");

const connection = new Redis(
  process.env.REDIS_URL || "redis://localhost:6379",
  {
    maxRetriesPerRequest: null,
  },
);

const uploadDir = path.join(__dirname, "uploads");
const transcriptionDir = path.join(__dirname, "transcriptions");
const bookDir = path.join(__dirname, "my-books");
const logDir = path.join(__dirname, "logs");

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
if (!fs.existsSync(transcriptionDir)) fs.mkdirSync(transcriptionDir);
if (!fs.existsSync(bookDir)) fs.mkdirSync(bookDir);
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);

// 未指定なら whisper の言語自動判定に任せる。
// シェルに渡すので、想定外の文字が混じった指定は無視して自動判定に落とす。
const whisperLanguage = /^[A-Za-z-]+$/.test(process.env.WHISPER_LANGUAGE || "")
  ? process.env.WHISPER_LANGUAGE
  : "";

// 書き起こし後に make-book スキルを自動実行するための設定
const autoBook = !/^(0|false|no)$/i.test(process.env.AUTO_BOOK || "");
const claudeBin = process.env.CLAUDE_BIN || "claude";
const bookTimeoutMs = Number(process.env.BOOK_TIMEOUT_MS) || 20 * 60 * 1000;
const bookTools = [
  "Read",
  "Write",
  "Edit",
  "Glob",
  "Grep",
  "Bash(ls:*)",
  "Bash(mkdir:*)",
].join(",");

const logFile = path.join(logDir, "worker.log");

const appendLog = (msg) => {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] ${msg}\n`;
  try {
    fs.appendFileSync(logFile, logLine);
  } catch (e) {
    console.error("Failed to write log file:", e);
  }
  console.log(msg);
};

const execPromise = (command) => {
  return new Promise((resolve, reject) => {
    exec(command, { cwd: __dirname }, (error, stdout, stderr) => {
      if (error) {
        reject({ error, stderr });
      } else {
        resolve(stdout);
      }
    });
  });
};

// claude CLI をヘッドレス(-p)で回して make-book スキルを実行する。
// 対話プロンプトが出ると無人実行では止まるため、権限は明示的に渡しておく。
const runMakeBook = (transcriptionFilename, log) =>
  new Promise((resolve, reject) => {
    const args = [
      "-p",
      `/make-book ${transcriptionFilename} --non-interactive`,
      "--permission-mode",
      "acceptEdits",
      "--allowedTools",
      bookTools,
    ];
    if (process.env.BOOK_MODEL) {
      args.push("--model", process.env.BOOK_MODEL);
    }
    if (process.env.BOOK_MAX_USD) {
      args.push("--max-budget-usd", process.env.BOOK_MAX_USD);
    }

    // サーバーを Claude Code のセッション内から起動していると CLAUDECODE が
    // 引き継がれ、入れ子起動として弾かれる。ワーカーは独立プロセスなので落とす。
    const env = { ...process.env };
    delete env.CLAUDECODE;

    const child = spawn(claudeBin, args, { cwd: __dirname, env });

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
    }, bookTimeoutMs);

    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));

    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      if (timedOut) {
        reject(new Error(`timed out after ${bookTimeoutMs}ms`));
      } else if (code !== 0) {
        const detail = (stderr.trim() || stdout.trim()).slice(0, 500);
        reject(new Error(`claude exited with code ${code}: ${detail}`));
      } else {
        log(stdout.trim().slice(-1000));
        resolve(stdout.trim());
      }
    });
  });

// make-book はファイル名の記号を整理することがあるので、出力先は
// 「実行中に更新された my-books 配下のディレクトリ」から特定する。
const findBookDir = (since) => {
  const dirs = fs
    .readdirSync(bookDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .map((entry) => ({
      name: entry.name,
      mtimeMs: fs.statSync(path.join(bookDir, entry.name)).mtimeMs,
    }))
    .filter((entry) => entry.mtimeMs >= since)
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  return dirs.length > 0 ? dirs[0].name : null;
};

const worker = new Worker(
  "transcriptionQueue",
  async (job) => {
    const { url } = job.data;
    const model = "large-v3-turbo";
    const log = (msg) => {
      job.log(msg);
      appendLog(`[Job ${job.id}] ${msg}`);
    };

    log(`Processing URL: ${url} with model: ${model}`);

    try {
      // 1. タイトル取得
      log("Fetching title...");
      const userAgent =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36";
      const getTitleCmd = `yt-dlp --user-agent "${userAgent}" --get-title --no-playlist --no-warnings '${url}'`;

      const titleStdout = await execPromise(getTitleCmd);

      let title = titleStdout
        .trim()
        .replace(/[\\/:*?"<>|']/g, "_")
        .replace(/\s+/g, "_")
        .slice(0, 80);
      if (!title) title = `audio_${Date.now()}`;

      const filename = `${title}.mp3`;
      const outputPath = path.join(uploadDir, filename);

      // 2. ダウンロード
      log(`Downloading to ${filename}...`);
      const downloadCmd = `yt-dlp --user-agent "${userAgent}" -x --audio-format mp3 -o '${outputPath}' '${url}'`;
      await execPromise(downloadCmd);

      // 3. 書き起こし
      log(
        `Transcribing with model ${model} (language: ${whisperLanguage || "auto"})...`,
      );
      const transcriptionTxtFilename = filename.replace(/\.mp3$/, ".txt");
      const transcriptionPath = path.join(
        transcriptionDir,
        transcriptionTxtFilename,
      );

      // --language を渡さなければ whisper 側が言語を自動判定する。
      // 特定の言語に固定したいときだけ WHISPER_LANGUAGE で指定する。
      const languageOpt = whisperLanguage
        ? ` --language ${whisperLanguage}`
        : "";
      const transcribeCmd = `whisper-ctranslate2 '${outputPath}' --model ${model}${languageOpt} --task transcribe --output_format txt --verbose False --output_dir '${transcriptionDir}'`;
      await execPromise(transcribeCmd);
      const rawOutput = fs.readFileSync(transcriptionPath, "utf-8");
      const transcribeOutput = rawOutput.replace(/\r?\n/g, "");
      fs.writeFileSync(transcriptionPath, transcribeOutput, "utf-8");

      // 4. 本の生成。ここで失敗しても書き起こしは完了しているので、
      //    ジョブ自体は成功扱いにして後から `cli.js book` でやり直せるようにする。
      let book = null;
      const wantsBook = job.data.makeBook !== false && autoBook;
      if (wantsBook) {
        log("Generating book with make-book...");
        const startedAt = Date.now();
        try {
          await runMakeBook(transcriptionTxtFilename, log);
          book = findBookDir(startedAt);
          log(book ? `Book created: my-books/${book}` : "Book dir not found");
        } catch (err) {
          log(`Book generation failed (transcription kept): ${err.message}`);
        }
      }

      log("Done!");
      return {
        filename: transcriptionTxtFilename,
        book,
        textPreview: transcribeOutput.substring(0, 100),
      };
    } catch (err) {
      const errMsg = err.message || JSON.stringify(err);
      log(`Error: ${errMsg}`);
      throw err;
    }
  },
  { connection },
);

worker.on("completed", (job) => {
  appendLog(`Job ${job.id} completed!`);
});

worker.on("failed", (job, err) => {
  appendLog(`Job ${job.id} failed with ${err.message}`);
});

module.exports = worker;
