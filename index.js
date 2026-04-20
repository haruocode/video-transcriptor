const express = require("express");
const { Queue } = require("bullmq");
const Redis = require("ioredis");

// Workerを起動
require("./worker");

const connection = new Redis(
  process.env.REDIS_URL || "redis://localhost:6379",
  {
    maxRetriesPerRequest: null,
  },
);

const transcriptionQueue = new Queue("transcriptionQueue", { connection });

const app = express();
const port = process.env.PORT || 3001;

app.use(express.json());

// --- Queue Endpoints ---

app.post("/api/queue", async (req, res) => {
  const { url, model } = req.body;
  if (!url) return res.status(400).json({ error: "URL is required" });

  const job = await transcriptionQueue.add("transcribe", {
    url,
    model: model || "small",
  });

  res.json({ id: job.id, name: job.name, data: job.data });
});

app.get("/api/queue", async (req, res) => {
  const jobs = await transcriptionQueue.getJobs([
    "waiting",
    "active",
    "completed",
    "failed",
  ]);
  const result = jobs.map((job) => ({
    id: job.id,
    status: job.finishedOn
      ? "completed"
      : job.failedReason
        ? "failed"
        : "pending/active",
    returnvalue: job.returnvalue,
    failedReason: job.failedReason,
    data: job.data,
  }));
  res.json(result);
});

app.get("/api/queue/clean", async (req, res) => {
  // 完了・失敗したジョブを掃除する
  await transcriptionQueue.clean(0, 1000, "completed");
  await transcriptionQueue.clean(0, 1000, "failed");
  res.json({ message: "Cleaned" });
});

// --- End Queue Endpoints ---

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}

module.exports = app;
