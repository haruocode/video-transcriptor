const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const uploadDir = path.join(__dirname, "uploads");
const transcriptionDir = path.join(__dirname, "transcriptions");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
if (!fs.existsSync(transcriptionDir)) fs.mkdirSync(transcriptionDir);
const allowedModels = ["tiny", "base", "small", "medium", "large"];

// YouTube動画をMP3に変換するエンドポイント
app.post("/api/convert", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "URL is required" });

  // yt-dlpでタイトル取得
  // User-Agentを追加してBot判定を回避試行
  const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
  const getTitleCmd = `yt-dlp --user-agent "${userAgent}" --get-title --no-playlist --no-warnings '${url}'`;
  exec(getTitleCmd, (titleErr, titleStdout, titleStderr) => {
    if (titleErr) {
      return res
        .status(500)
        .json({ error: "タイトル取得に失敗しました", details: titleStderr });
    }
    let title = titleStdout
      .trim()
      .replace(/[\\/:*?"<>|]/g, "_")
      .replace(/\s+/g, "_")
      .slice(0, 80);
    if (!title) title = `audio_${Date.now()}`;
    const filename = `${title-user-agent "${userAgent}" -}.mp3`;
    const outputPath = path.join(uploadDir, filename);
    const command = `yt-dlp -x --audio-format mp3 -o '${outputPath}' '${url}'`;

    exec(command, (error, stdout, stderr) => {
      if (error) {
        return res
          .status(500)
          .json({ error: "変換に失敗しました", details: stderr });
      }
      res.json({ filename });
    });
  });
});

// Whisperで書き起こしを行うエンドポイント
app.post("/api/transcribe", async (req, res) => {
  const { filename, model: requestedModel } = req.body;
  if (!filename) return res.status(400).json({ error: "filename is required" });
  const mp3Path = path.join(uploadDir, filename);
  if (!fs.existsSync(mp3Path))
    return res.status(404).json({ error: "MP3ファイルが見つかりません" });

  const transcriptionFile = path.join(
    transcriptionDir,
    filename.replace(/\.mp3$/, ".txt"),
  );
  const defaultModel = process.env.DEFAULT_MODEL || "medium";
  const normalizedModel = (requestedModel || defaultModel).toLowerCase();
  const model = allowedModels.includes(normalizedModel)
    ? normalizedModel
    : "medium";
  const command = `python3 whisper_transcribe.py '${mp3Path}' '${model}'`;

  exec(command, { cwd: __dirname }, (error, stdout, stderr) => {
    if (error) {
      return res
        .status(500)
        .json({ error: "書き起こしに失敗しました", details: stderr });
    }
    fs.writeFileSync(transcriptionFile, stdout);
    res.json({
      text: stdout,
      transcriptionFile: path.basename(transcriptionFile),
    });
  });
});

// 書き起こしテキストのダウンロードエンドポイント
app.get("/api/download/:filename", (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(transcriptionDir, filename);
  if (!fs.existsSync(filePath))
    return res.status(404).json({ error: "ファイルが見つかりません" });
  res.download(filePath);
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}

module.exports = app;
