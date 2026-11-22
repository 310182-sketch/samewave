import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { createServer } from "node:http";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const siteDirectory = path.resolve(scriptDirectory, "../site");
const profileDirectory = mkdtempSync(path.join(os.tmpdir(), "codex-guess-challenge-chrome-"));
const chromePath = process.env.CHROME_BIN || (process.platform === "win32"
  ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
  : "google-chrome");

const browserTest = String.raw`
  <script>
    window.addEventListener("load", () => {
      const output = document.createElement("output");
      output.id = "guess-challenge-test-result";
      document.body.append(output);
      const fail = (message) => {
        output.textContent = "FAIL: " + message;
        document.documentElement.setAttribute("data-guess-challenge-test", "failed");
      };
      const waitFor = (check, message, timeout = 8000) => new Promise((resolve, reject) => {
        const started = Date.now();
        const poll = () => {
          if (check()) return resolve();
          if (Date.now() - started > timeout) return reject(new Error("Timed out: " + message));
          window.setTimeout(poll, 25);
        };
        poll();
      });
      const visible = (selector) => {
        const element = document.querySelector(selector);
        return Boolean(element && !element.classList.contains("hidden"));
      };
      const decodePayload = (token) => {
        const base64 = token.replace(/-/g, "+").replace(/_/g, "/");
        const binary = atob(base64 + "=".repeat((4 - (base64.length % 4)) % 4));
        const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
        return JSON.parse(new TextDecoder().decode(bytes));
      };
      const finish = (message) => {
        document.documentElement.setAttribute("data-guess-challenge-test", "passed");
        output.textContent = "PASS: " + message;
      };
      (async () => {
        const pageUrl = new URL(window.location.href);
        if (pageUrl.searchParams.get("case") === "invalid") {
          await waitFor(() => visible('[data-view="challenge-invalid"]'), "invalid challenge view");
          if (document.querySelector("[data-challenge-invalid-copy]").textContent.includes("undefined")) {
            throw new Error("invalid challenge view exposed an internal value");
          }
          finish("malformed links are rejected with a recoverable message.");
          return;
        }
        if (pageUrl.searchParams.get("case") === "escaped") {
          await waitFor(() => visible('[data-view="challenge"]'), "escaped challenge view");
          const prompt = document.querySelector("[data-challenge-question]");
          if (!prompt.textContent.includes("<img src=x")) throw new Error("challenge text was changed while rendering");
          if (document.querySelector("img") || window.__challengeXss === true) {
            throw new Error("untrusted challenge text was interpreted as markup");
          }
          for (let index = 0; index < 5; index += 1) {
            document.querySelector('[data-challenge-choice="0"]').click();
            document.querySelector("[data-challenge-next]").click();
          }
          await waitFor(() => visible('[data-view="challenge-results"]'), "escaped challenge results");
          if (document.querySelector("img") || window.__challengeXss === true) {
            throw new Error("untrusted result text was interpreted as markup");
          }
          finish("challenge and result text render safely as text.");
          return;
        }

        const key = "samewave-guess-challenge-test";
        const saved = sessionStorage.getItem(key);
        if (window.location.hash.startsWith("#guess=")) {
          if (!saved) throw new Error("test expectations did not survive direct-link navigation");
          const expected = JSON.parse(saved);
          await waitFor(() => visible('[data-view="challenge"]'), "friend challenge view");
          if (document.querySelector("[data-challenge-eyebrow]").textContent !== expected.topic + "猜題挑戰") {
            throw new Error("friend was not routed to the selected topic challenge");
          }
          if (!document.querySelector("[data-challenge-disclosure]").classList.contains("hidden")) {
            throw new Error("creator-only answer disclosure appeared in the friend view");
          }
          for (let index = 0; index < expected.count; index += 1) {
            const progress = document.querySelector("[data-challenge-progress]").textContent;
            if (progress !== "第 " + (index + 1) + " 題，共 " + expected.count + " 題") {
              throw new Error("friend challenge progress is incorrect at question " + (index + 1));
            }
            const prompt = document.querySelector("[data-challenge-question]").textContent.trim();
            const choices = [...document.querySelectorAll("[data-challenge-choice-copy]")]
              .map((choice) => choice.textContent.trim());
            if (!prompt || choices.some((choice) => !choice) || choices[0] === choices[1]) {
              throw new Error("challenge question snapshot is empty or malformed");
            }
            const guess = index % 2 === 0 ? expected.answers[index] : 1 - expected.answers[index];
            document.querySelector('[data-challenge-choice="' + guess + '"]').click();
            document.querySelector("[data-challenge-next]").click();
          }
          await waitFor(() => visible('[data-view="challenge-results"]'), "friend challenge result");
          const expectedScore = Math.ceil(expected.count / 2);
          if (document.querySelector("[data-challenge-result-score]").textContent !== String(expectedScore)) {
            throw new Error("guess score does not match the selected answers");
          }
          if (document.querySelectorAll("[data-challenge-result-list] > li").length !== expected.count) {
            throw new Error("result page did not compare each question");
          }
          if (document.documentElement.scrollWidth > document.documentElement.clientWidth) {
            throw new Error("challenge result overflows horizontally on a 360px screen");
          }
          sessionStorage.removeItem(key);
          finish(expected.count + "-question challenge link opens directly, preserves its snapshot, records guesses, and reveals an accurate score.");
          return;
        }

        const testCase = pageUrl.searchParams.get("case");
        const cases = {
          "5": { count: 5, topic: "旅行" },
          "10": { count: 10, topic: "K-pop" },
          "15": { count: 15, topic: "政治" }
        };
        const game = cases[testCase];
        if (!game) throw new Error("test case must select 5, 10, or 15 questions");
        await waitFor(() => visible('[data-view="home"]'), "home view");
        document.querySelector("#nickname").value = "小芯";
        document.querySelector('[data-question-count="' + game.count + '"]').click();
        document.querySelector('[data-topic-choice="' + game.topic + '"]').click();
        document.querySelector("[data-start-guess-challenge]").click();
        await waitFor(() => visible('[data-view="challenge"]'), "creator challenge view");
        if (!visible("[data-challenge-disclosure]")) throw new Error("creator did not receive the link disclosure");
        if (document.documentElement.scrollWidth > document.documentElement.clientWidth) {
          throw new Error("creator challenge overflows horizontally on a 360px screen");
        }
        const answers = [];
        const snapshot = [];
        for (let index = 0; index < game.count; index += 1) {
          const prompt = document.querySelector("[data-challenge-question]").textContent.trim();
          const choices = [...document.querySelectorAll("[data-challenge-choice-copy]")]
            .map((choice) => choice.textContent.trim());
          if (!prompt || choices.some((choice) => !choice) || choices[0] === choices[1]) {
            throw new Error("creator question is empty or has duplicate choices");
          }
          const answer = index % 2;
          answers.push(answer);
          snapshot.push([prompt, choices[0], choices[1]]);
          document.querySelector('[data-challenge-choice="' + (1 - answer) + '"]').click();
          document.querySelector('[data-challenge-choice="' + answer + '"]').click();
          if (document.querySelector('[data-challenge-choice="' + answer + '"]').getAttribute("aria-pressed") !== "true") {
            throw new Error("creator could not revise the selected answer");
          }
          document.querySelector("[data-challenge-next]").click();
        }
        await waitFor(() => visible('[data-view="challenge-ready"]'), "challenge share screen");
        const challengeLink = document.querySelector("[data-challenge-link]").value;
        const challengeUrl = new URL(challengeLink);
        if (challengeUrl.search || challengeUrl.origin !== window.location.origin) {
          throw new Error("share link kept unrelated query data or changed its origin");
        }
        const token = new URLSearchParams(challengeUrl.hash.slice(1)).get("guess");
        const payload = decodePayload(token || "");
        if (payload.v !== 1 || payload.t !== game.topic || payload.n !== "小芯" || payload.q.length !== game.count) {
          throw new Error("share link lost challenge metadata");
        }
        for (let index = 0; index < game.count; index += 1) {
          if (payload.q[index][0] !== snapshot[index][0] || payload.q[index][3] !== answers[index]) {
            throw new Error("share link did not preserve the selected question and answer");
          }
        }
        const expected = { count: game.count, topic: game.topic, answers };
        sessionStorage.setItem(key, JSON.stringify(expected));
        window.location.assign(challengeLink);
      })().catch((error) => fail(error?.message || String(error)));
    });
  </script>`;

function createTestPage() {
  let html = readFileSync(path.join(siteDirectory, "index.html"), "utf8");
  html = html.replace(/<script src="supabase-config\.js[^\"]*" defer><\/script>\s*/, "");
  html = html.replace(/<script src="auth-provider-status\.js[^\"]*" defer><\/script>\s*/, "");
  html = html.replace(
    /<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js[^\"]*"[^>]*><\/script>\s*/,
    "",
  );
  html = html.replace(/<link[^>]+fonts\.(?:googleapis|gstatic)\.com[^>]*>\s*/g, "");
  return html.replace("</body>", `${browserTest}\n  </body>`);
}

function runChrome(url) {
  return new Promise((resolve, reject) => {
    const child = spawn(chromePath, [
      "--headless=new",
      "--no-sandbox",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--window-size=360,844",
      `--user-data-dir=${profileDirectory}`,
      "--dump-dom",
      "--virtual-time-budget=35000",
      url,
    ], { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, 50000);
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => stdout += chunk);
    child.stderr.on("data", (chunk) => stderr += chunk);
    child.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once("close", (status) => {
      clearTimeout(timer);
      resolve({ status, stdout, stderr, timedOut });
    });
  });
}

const server = createServer((request, response) => {
  const pathname = new URL(request.url, "http://127.0.0.1").pathname;
  if (pathname === "/" || pathname === "/index.html") {
    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end(createTestPage());
    return;
  }
  const assets = new Map([
    ["/app.js", ["app.js", "text/javascript; charset=utf-8"]],
    ["/styles.css", ["styles.css", "text/css; charset=utf-8"]],
    ["/favicon.svg", ["favicon.svg", "image/svg+xml"]],
  ]);
  const asset = assets.get(pathname);
  if (!asset) {
    response.writeHead(404);
    response.end();
    return;
  }
  response.writeHead(200, { "content-type": asset[1] });
  response.end(readFileSync(path.join(siteDirectory, asset[0])));
});

async function runScenario(url, label) {
  const result = await runChrome(url);
  const output = `${result.stdout}\n${result.stderr}`;
  if (result.timedOut) throw new Error(`${label} timed out: ${output.slice(-5000)}`);
  if (result.status !== 0) throw new Error(`${label} exited with code ${result.status}: ${output.slice(-5000)}`);
  if (!output.includes('data-guess-challenge-test="passed"')) {
    throw new Error(`${label} failed: ${output.slice(-6000)}`);
  }
}

try {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Local test server did not expose a port");
  const origin = `http://127.0.0.1:${address.port}`;
  for (const count of [5, 10, 15]) {
    await runScenario(`${origin}/?case=${count}&discarded=private`, `${count}-question challenge`);
    console.log(`${count}-question challenge creation, direct-link guessing, and results passed in headless Chrome.`);
  }
  await runScenario(`${origin}/?case=invalid#guess=not_base64!`, "malformed challenge link");
  const escapedPayload = Buffer.from(JSON.stringify({
    v: 1,
    t: "旅行",
    n: "小芯",
    q: Array.from({ length: 5 }, () => [
      '<img src=x onerror="window.__challengeXss=true">',
      "<script>window.__challengeXss=true</script>",
      "普通選項",
      0,
    ]),
  })).toString("base64url");
  await runScenario(`${origin}/?case=escaped#guess=${escapedPayload}`, "escaped challenge content");
  console.log("Malformed-link recovery and safe rendering of untrusted challenge text passed in headless Chrome.");
} finally {
  await new Promise((resolve) => server.close(resolve));
  const tempRoot = path.resolve(os.tmpdir());
  const resolvedProfile = path.resolve(profileDirectory);
  if (
    path.dirname(resolvedProfile) !== tempRoot ||
    !path.basename(resolvedProfile).startsWith("codex-guess-challenge-chrome-") ||
    !statSync(resolvedProfile, { throwIfNoEntry: false })?.isDirectory()
  ) {
    throw new Error("Refusing to remove a Chrome profile outside the dedicated temporary directory.");
  }
  rmSync(resolvedProfile, { recursive: true, force: true });
}
