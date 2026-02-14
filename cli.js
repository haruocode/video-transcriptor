#!/usr/bin/env node

const { spawn } = require("child_process");
const path = require("path");

const API_URL = "http://localhost:3001/api";

async function addJob(url, model) {
  try {
    const res = await fetch(`${API_URL}/queue`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, model }),
    });
    const data = await res.json();
    if (res.ok) {
      console.log(`✅ Job added: ID ${data.id}`);
    } else {
      console.error(`❌ Error: ${data.error}`);
    }
  } catch (error) {
    console.error("❌ Network error:", error.message);
  }
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
  const logPath = path.join(__dirname, "backend", "logs", "worker.log");
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

const [, , command, arg1, arg2] = process.argv;

switch (command) {
  case "add":
    if (!arg1) {
      console.error("Usage: node cli.js add <url> [model]");
    } else {
      addJob(arg1, arg2);
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
    console.log("  node cli.js add <url> [model]  - Add a video to queue");
    console.log("  node cli.js list               - Show queue status");
    console.log("  node cli.js logs               - Watch worker logs");
    console.log(
      "  node cli.js clean              - Remove completed/failed jobs",
    );
    break;
}
