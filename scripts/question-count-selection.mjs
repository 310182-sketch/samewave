import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { createServer } from "node:http";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const siteDirectory = path.resolve(scriptDirectory, "../site");
const profileDirectory = mkdtempSync(path.join(os.tmpdir(), "codex-question-count-chrome-"));
const chromePath = process.env.CHROME_BIN || (process.platform === "win32"
  ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
  : "google-chrome");

const browserTest = String.raw`
  <script>
    window.addEventListener("load", () => {
      const output = document.createElement("output");
      output.id = "question-count-test-result";
      document.body.append(output);
      const fail = (message) => {
        output.textContent = "FAIL: " + message;
        document.documentElement.setAttribute("data-question-count-test", "failed");
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
      const visible = (selector) => !document.querySelector(selector).classList.contains("hidden");
      (async () => {
        const countSelectionRounds = [
          { count: 5, topic: "旅行" },
          { count: 10, topic: "K-pop" },
          { count: 15, topic: "政治" },
          { count: 15, topic: "K-pop" },
        ];
        const allTopics = [
          "旅行",
          "音樂",
          "日常",
          "飲食",
          "影視娛樂",
          "興趣嗜好",
          "運動",
          "寵物",
          "閱讀學習",
          "藝術文化",
          "K-pop",
          "F1",
          "價值觀",
          "感情觀",
          "政治",
        ];
        const rounds = [
          ...countSelectionRounds,
          ...allTopics.map((topic) => ({ count: 15, topic })),
        ];
        const expectedKpopPrompts = [
          "回歸行程表一公布，你通常會？",
          "概念照釋出後，你最喜歡？",
          "MV teaser 出來時，你會？",
          "迷你專輯上線後，你想先？",
          "回歸週的打歌舞台，你比較想？",
          "看完打歌舞台，你會接著找？",
          "拆專輯時，你最期待看到？",
          "抽到重複的小卡，你比較想？",
          "官方周邊開始預購時，你會先？",
          "準備搶台灣場演唱會門票，你會先？",
          "演唱會前一天，你會先準備？",
          "演唱會現場最期待哪一刻？",
          "如果有機會參加粉絲見面會，你最期待？",
          "收到官方直播通知時，你通常會？",
          "朋友剛想認識一個團體，你會先推薦？",
        ];
        if (document.querySelector('[data-question-count="5"]').getAttribute("aria-pressed") !== "true") {
          throw new Error("five questions are not selected by default");
        }
        const topicChoice = document.querySelector('[data-topic-choice="K-pop"]');
        const questionCountChoice = document.querySelector('[data-question-count="5"]');
        if (Number.parseFloat(getComputedStyle(topicChoice).fontSize) < 14) {
          throw new Error("topic choices must remain at least 14px at the mobile viewport");
        }
        if (Number.parseFloat(getComputedStyle(questionCountChoice).fontSize) < 14) {
          throw new Error("question-count choices must remain at least 14px at the mobile viewport");
        }
        if (document.documentElement.scrollWidth > document.documentElement.clientWidth) {
          throw new Error("the home view overflows horizontally at the mobile viewport");
        }
        for (let round = 0; round < rounds.length; round += 1) {
          const { count, topic } = rounds[round];
          const countButton = document.querySelector('[data-question-count="' + count + '"]');
          countButton.click();
          if (countButton.getAttribute("aria-pressed") !== "true") {
            throw new Error(count + "-question selection is not reflected accessibly");
          }
          document.querySelector('[data-topic-choice="' + topic + '"]').click();
          document.querySelector("[data-start-form]").requestSubmit();
          await waitFor(() => visible('[data-view="game"]'), count + "-question demo starts");
          await waitFor(
            () => document.querySelector("[data-question-count-label]").textContent === String(count),
            count + "-question game label",
          );
          const progress = document.querySelector(".game-progress");
          if (progress.getAttribute("aria-valuemax") !== String(count)) {
            throw new Error(count + "-question progress limit is incorrect");
          }
          if (document.documentElement.scrollWidth > document.documentElement.clientWidth) {
            throw new Error(topic + " game overflows horizontally at the mobile viewport");
          }

          for (let question = 1; question <= count; question += 1) {
            if (progress.getAttribute("aria-valuenow") !== String(question)) {
              throw new Error(count + "-question game skipped question " + question);
            }
            const prompt = document.querySelector("[data-question]").textContent.trim();
            const choices = [0, 1].map((index) =>
              document.querySelector('[data-option-copy="' + index + '"]').textContent.trim()
            );
            if (!prompt || prompt === "題目載入中…") {
              throw new Error(topic + " question " + question + " has no real prompt");
            }
            if (choices.some((choice) => !choice || choice === "選項 A" || choice === "選項 B")) {
              throw new Error(topic + " question " + question + " has an empty or placeholder choice");
            }
            if (choices[0] === choices[1]) {
              throw new Error(topic + " question " + question + " repeats the same choice twice");
            }
            if (topic === "K-pop" && prompt !== expectedKpopPrompts[question - 1]) {
              throw new Error(
                "K-pop prompt " + question + " does not match the fandom-focused set",
              );
            }
            document.querySelector('[data-option="0"]').click();
            if (!visible("[data-reveal]")) throw new Error("question " + question + " did not reveal");
            document.querySelector("[data-next]").click();
            if (question < count) {
              await waitFor(
                () => progress.getAttribute("aria-valuenow") === String(question + 1),
                "question " + (question + 1) + " of " + count,
              );
            }
          }

          await waitFor(() => visible('[data-view="results"]'), count + "-question results");
          if (document.documentElement.scrollWidth > document.documentElement.clientWidth) {
            throw new Error(topic + " results overflow horizontally at the mobile viewport");
          }
          if (document.querySelector("[data-result-question-count]").textContent !== String(count)) {
            throw new Error(count + "-question result summary is incorrect");
          }
          if (document.querySelector("[data-result-topic]").textContent !== topic) {
            throw new Error(topic + " demo topic did not reach the result");
          }
          document.querySelector('[data-view="results"] [data-home]').click();
          await waitFor(() => visible('[data-view="home"]'), "return to topic selection");
        }

        document.documentElement.setAttribute("data-question-count-test", "passed");
        output.textContent = "PASS: 360px mobile controls remain readable without horizontal overflow; all 15 topic sets display 15 distinct questions with two non-empty choices, and 5, 10, and 15 question games complete with accurate progress and results.";
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
      "--virtual-time-budget=30000",
      url,
    ], { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, 45000);
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

try {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Local test server did not expose a port");
  const result = await runChrome(`http://127.0.0.1:${address.port}/`);
  const output = `${result.stdout}\n${result.stderr}`;
  if (result.timedOut) throw new Error(`Chrome timed out: ${output.slice(-4000)}`);
  if (result.status !== 0) throw new Error(`Chrome exited with code ${result.status}: ${output.slice(-4000)}`);
  if (!output.includes('data-question-count-test="passed"')) {
    throw new Error(`Browser verification failed: ${output.slice(-5000)}`);
  }
  console.log("360px mobile readability, all 15 topic banks, and 5, 10, and 15 question game flows passed in headless Chrome.");
} finally {
  await new Promise((resolve) => server.close(resolve));
  const tempRoot = path.resolve(os.tmpdir());
  const resolvedProfile = path.resolve(profileDirectory);
  if (
    path.dirname(resolvedProfile) !== tempRoot ||
    !path.basename(resolvedProfile).startsWith("codex-question-count-chrome-") ||
    !statSync(resolvedProfile, { throwIfNoEntry: false })?.isDirectory()
  ) {
    throw new Error("Refusing to remove a Chrome profile outside the dedicated temporary directory.");
  }
  rmSync(resolvedProfile, { recursive: true, force: true });
}
