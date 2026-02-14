const { Worker } = require("bullmq");
const { exec } = require("child_process");
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
const logDir = path.join(__dirname, "logs");

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
if (!fs.existsSync(transcriptionDir)) fs.mkdirSync(transcriptionDir);
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);

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

const worker = new Worker(
  "transcriptionQueue",
  async (job) => {
    const { url, model = "small" } = job.data;
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
        .replace(/[\\/:*?"<>|]/g, "_")
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
      log(`Transcribing with model ${model}...`);
      const transcriptionTxtFilename = filename.replace(/\.mp3$/, ".txt");
      const transcriptionPath = path.join(
        transcriptionDir,
        transcriptionTxtFilename,
      );

      const transcribeCmd = `python3 whisper_transcribe.py '${outputPath}' '${model}'`;
      const transcribeOutput = await execPromise(transcribeCmd);

      fs.writeFileSync(transcriptionPath, transcribeOutput);

      log("Done!");
      return {
        filename: transcriptionTxtFilename,
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
