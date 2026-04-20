const request = require('supertest');
const path = require('path');
const fs = require('fs');

// Import the app without starting the server
const app = require('../index.js');

describe('API routes', () => {
  const uploadsDir = path.join(__dirname, '..', 'uploads');
  const transcriptionsDir = path.join(__dirname, '..', 'transcriptions');

  beforeAll(() => {
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    if (!fs.existsSync(transcriptionsDir)) fs.mkdirSync(transcriptionsDir, { recursive: true });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
  });

  describe('POST /api/convert', () => {
    test('400 when url missing', async () => {
      const res = await request(app).post('/api/convert').send({});
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    test('success converts and returns filename', async () => {
      const { exec } = require('child_process');
      jest.spyOn(require('child_process'), 'exec').mockImplementation((cmd, cb) => {
        if (cmd.includes('--get-title')) {
          cb(null, 'My Cool Video\n', '');
        } else if (cmd.includes('-x --audio-format mp3')) {
          cb(null, '', '');
        } else {
          cb(new Error('unexpected command'));
        }
      });

      const res = await request(app)
        .post('/api/convert')
        .send({ url: 'https://example.com/video' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('filename');
      expect(res.body.filename.endsWith('.mp3')).toBe(true);
      // Ensure exec was called at least twice (title + download)
      expect(exec).toBeDefined();
    });

    test('500 when title fetch fails', async () => {
      jest.spyOn(require('child_process'), 'exec').mockImplementation((cmd, cb) => {
        if (cmd.includes('--get-title')) {
          cb(new Error('fail'), '', 'boom');
        }
      });

      const res = await request(app)
        .post('/api/convert')
        .send({ url: 'https://example.com/video' });
      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('POST /api/transcribe', () => {
    test('400 when filename missing', async () => {
      const res = await request(app).post('/api/transcribe').send({});
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    test('404 when mp3 not found', async () => {
      jest.spyOn(fs, 'existsSync').mockImplementation((p) => {
        // Only return false for a .mp3 path under uploads
        if (typeof p === 'string' && p.endsWith('.mp3')) return false;
        return true;
      });

      const res = await request(app)
        .post('/api/transcribe')
        .send({ filename: 'missing.mp3' });
      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error');
    });

    test('success transcribes and writes text file', async () => {
      const mp3Name = 'exists.mp3';
      const mp3Path = path.join(uploadsDir, mp3Name);
      fs.writeFileSync(mp3Path, 'dummy');

      const writeSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
      jest.spyOn(require('child_process'), 'exec').mockImplementation((cmd, opts, cb) => {
        // emulate python stdout with transcribed text
        cb(null, 'Hello world transcription', '');
      });

      const res = await request(app)
        .post('/api/transcribe')
        .send({ filename: mp3Name });

      expect(res.status).toBe(200);
      expect(res.body).toEqual(
        expect.objectContaining({ text: 'Hello world transcription', transcriptionFile: expect.any(String) })
      );
      expect(writeSpy).toHaveBeenCalled();

      fs.unlinkSync(mp3Path);
    });
  });

  describe('GET /api/download/:filename', () => {
    test('404 when file missing', async () => {
      const res = await request(app).get('/api/download/does-not-exist.txt');
      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error');
    });

    test('200 and sends file when exists', async () => {
      const filePath = path.join(transcriptionsDir, 'sample.txt');
      fs.writeFileSync(filePath, 'sample');

      const res = await request(app).get('/api/download/sample.txt');
      expect(res.status).toBe(200);
      // Content-Disposition header should indicate attachment
      expect(res.header['content-disposition']).toMatch(/attachment/);

      fs.unlinkSync(filePath);
    });
  });
});
