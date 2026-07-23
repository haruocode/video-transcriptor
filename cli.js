#!/usr/bin/env node

const { spawn } = require("child_process");
const path = require("path");

const API_URL = "http://localhost:3001/api";

async function addJob(url, makeBook) {
  try {
    const res = await fetch(`${API_URL}/queue`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, makeBook }),
    });
    const data = await res.json();
    if (res.ok) {
      const suffix = makeBook ? "" : " (書き起こしのみ)";
      console.log(`✅ Job added: ID ${data.id}${suffix}`);
    } else {
      console.error(`❌ Error: ${data.error}`);
    }
  } catch (error) {
    console.error("❌ Network error:", error.message);
  }
}

// 書き起こし済みのテキストから本だけを作り直す。
// ワーカーを介さず claude をそのまま前面で動かし、進捗を画面に流す。
function makeBook(name, force) {
  const prompt = force
    ? `/make-book ${name} --force`
    : `/make-book ${name}`;

  const claude = spawn(process.env.CLAUDE_BIN || "claude", [prompt], {
    cwd: __dirname,
    stdio: "inherit",
  });

  claude.on("error", (err) => {
    console.error("❌ Failed to start claude:", err.message);
  });
}

async function listJobs() {
  try {
    const res = await fetch(`${API_URL}/queue`);
    const jobs = await res.json();

    if (jobs.length === 0) {
      console.log("No jobs in queue.");
      return;
    }

    console.log("ID\tStatus\t\tInfo");
    console.log("-".repeat(50));
    jobs.forEach((job) => {
      let info = job.data.url;
      if (job.returnvalue) {
        info = `Saved: ${job.returnvalue.filename}`;
        if (job.returnvalue.book) {
          info += ` → my-books/${job.returnvalue.book}`;
        }
      } else if (job.failedReason) {
        info = `Error: ${job.failedReason}`;
      }
      console.log(`${job.id}\t${job.status}\t${info}`);
    });
  } catch (error) {
    console.error("❌ Network error:", error.message);
  }
}

async function cleanJobs() {
  try {
    const res = await fetch(`${API_URL}/queue/clean`);
    const data = await res.json();
    console.log(data.message);
  } catch (error) {
    console.error("❌ Network error:", error.message);
  }
}

function showLogs() {
  const logPath = path.join(__dirname, "logs", "worker.log");
  console.log(`Tailing logs from ${logPath}...`);
  const fs = require("fs");
  if (!fs.existsSync(logPath)) {
    console.log("Log file not found. Waiting for logs to appear...");
  }

  const tail = spawn("tail", ["-f", logPath], { stdio: "inherit" });

  tail.on("error", (err) => {
    console.error("Failed to start tail process:", err);
  });
}

const [, , command, ...rest] = process.argv;
const flags = rest.filter((arg) => arg.startsWith("--"));
const arg1 = rest.find((arg) => !arg.startsWith("--"));

switch (command) {
  case "add":
    if (!arg1) {
      console.error("Usage: node cli.js add <url> [--no-book]");
    } else {
      addJob(arg1, !flags.includes("--no-book"));
    }
    break;
  case "book":
    if (!arg1) {
      console.error("Usage: node cli.js book <name> [--force]");
    } else {
      makeBook(arg1, flags.includes("--force"));
    }
    break;
  case "list":
  case "ls":
    listJobs();
    break;
  case "clean":
    cleanJobs();
    break;
  case "logs":
    showLogs();
    break;
  default:
    console.log("Usage:");
    console.log(
      "  node cli.js add <url> [--no-book] - Add a video to queue (書き起こし→本)",
    );
    console.log(
      "  node cli.js book <name> [--force] - Rebuild a book from a transcription",
    );
    console.log("  node cli.js list                 - Show queue status");
    console.log("  node cli.js logs                 - Watch worker logs");
    console.log(
      "  node cli.js clean                - Remove completed/failed jobs",
    );
    break;
}
