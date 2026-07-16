/**
 * Vite plugin that adds API endpoints to trigger scraper scripts
 * from the dev server. These endpoints are dev-only — they spawn
 * the scraper scripts as child processes and stream output back.
 *
 * Endpoints:
 *   POST /api/sync/facebook  — runs scrapeFacebook.js
 *   POST /api/sync/visayan   — runs scrapeVisayan.js
 *
 * Request body: { passcode: string }
 */

import { spawn } from "child_process";
import dotenv from "dotenv";

dotenv.config();

const ADMIN_PASSCODE = process.env.VITE_ADMIN_PASSCODE || "admin123";

/**
 * Run a Node script and collect its output.
 * Returns a promise that resolves with { success, output, duration }.
 */
function runScript(scriptPath) {
  return new Promise((resolve) => {
    const start = Date.now();
    const chunks = [];

    const child = spawn("node", [scriptPath], {
      cwd: process.cwd(),
      env: { ...process.env },
      stdio: ["ignore", "pipe", "pipe"],
    });

    child.stdout.on("data", (data) => chunks.push(data.toString()));
    child.stderr.on("data", (data) => chunks.push(`[stderr] ${data.toString()}`));

    child.on("close", (code) => {
      resolve({
        success: code === 0,
        output: chunks.join(""),
        duration: Date.now() - start,
        exitCode: code,
      });
    });

    child.on("error", (err) => {
      resolve({
        success: false,
        output: `Failed to start process: ${err.message}`,
        duration: Date.now() - start,
        exitCode: -1,
      });
    });
  });
}

export default function scraperApiPlugin() {
  return {
    name: "scraper-api",
    configureServer(server) {
      // Parse JSON body for POST requests
      const parseBody = (req) =>
        new Promise((resolve) => {
          let body = "";
          req.on("data", (chunk) => (body += chunk));
          req.on("end", () => {
            try {
              resolve(JSON.parse(body));
            } catch {
              resolve({});
            }
          });
        });

      server.middlewares.use(async (req, res, next) => {
        // Only handle our API routes
        if (!req.url.startsWith("/api/sync/")) return next();

        // Only allow POST
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.setHeader("Content-Type", "application/json");
          return res.end(JSON.stringify({ error: "Method not allowed" }));
        }

        const body = await parseBody(req);

        // Verify passcode
        if (body.passcode !== ADMIN_PASSCODE) {
          res.statusCode = 403;
          res.setHeader("Content-Type", "application/json");
          return res.end(JSON.stringify({ error: "Invalid admin passcode" }));
        }

        // Determine which script to run
        let scriptPath;
        if (req.url === "/api/sync/facebook") {
          scriptPath = "scripts/scrapeFacebook.js";
        } else if (req.url === "/api/sync/visayan") {
          scriptPath = "scripts/scrapeVisayan.js";
        } else {
          res.statusCode = 404;
          res.setHeader("Content-Type", "application/json");
          return res.end(JSON.stringify({ error: "Unknown sync target" }));
        }

        console.log(`\n[Sync API] Running ${scriptPath}...`);

        res.setHeader("Content-Type", "application/json");

        try {
          const result = await runScript(scriptPath);
          console.log(
            `[Sync API] ${scriptPath} finished in ${(result.duration / 1000).toFixed(1)}s (exit: ${result.exitCode})`
          );
          res.statusCode = result.success ? 200 : 500;
          res.end(JSON.stringify(result));
        } catch (err) {
          res.statusCode = 500;
          res.end(JSON.stringify({ success: false, output: err.message, duration: 0 }));
        }
      });
    },
  };
}
