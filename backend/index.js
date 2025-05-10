const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

const uploadDir = path.join(__dirname, 'uploads');
const transcriptionDir = path.join(__dirname, 'transcriptions');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
if (!fs.existsSync(transcriptionDir)) fs.mkdirSync(transcriptionDir);

// YouTube動画をMP3に変換するエンドポイント
app.post('/api/convert', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  // yt-dlpでタイトル取得
  const getTitleCmd = `yt-dlp --get-title --no-playlist --no-warnings '${url}'`;
  exec(getTitleCmd, (titleErr, titleStdout, titleStderr) => {
    if (titleErr) {
      return res.status(500).json({ error: 'タイトル取得に失敗しました', details: titleStderr });
    }
    let title = titleStdout.trim().replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, '_').slice(0, 80);
    if (!title) title = `audio_${Date.now()}`;
    const filename = `${title}.mp3`;
    const outputPath = path.join(uploadDir, filename);
    const command = `yt-dlp -x --audio-format mp3 -o '${outputPath}' '${url}'`;

    exec(command, (error, stdout, stderr) => {
      if (error) {
        return res.status(500).json({ error: '変換に失敗しました', details: stderr });
      }
      res.json({ filename });
    });
  });
});

// Whisperで書き起こしを行うエンドポイント
app.post('/api/transcribe', async (req, res) => {
  const { filename } = req.body;
  if (!filename) return res.status(400).json({ error: 'filename is required' });
  const mp3Path = path.join(uploadDir, filename);
  if (!fs.existsSync(mp3Path)) return res.status(404).json({ error: 'MP3ファイルが見つかりません' });

  const transcriptionFile = path.join(transcriptionDir, filename.replace(/\.mp3$/, '.txt'));
  const command = `python3 whisper_transcribe.py '${mp3Path}'`;

  exec(command, { cwd: __dirname }, (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({ error: '書き起こしに失敗しました', details: stderr });
    }
    fs.writeFileSync(transcriptionFile, stdout);
    res.json({ text: stdout, transcriptionFile: path.basename(transcriptionFile) });
  });
});

// 書き起こしテキストのダウンロードエンドポイント
app.get('/api/download/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(transcriptionDir, filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'ファイルが見つかりません' });
  res.download(filePath);
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
