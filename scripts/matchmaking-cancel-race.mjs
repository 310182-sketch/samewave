import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const siteDirectory = path.resolve(testDirectory, "../site");
const htmlPath = path.join(siteDirectory, `.matchmaking-cancel-race-${process.pid}.html`);
const profileDirectory = mkdtempSync(
  path.join(os.tmpdir(), "codex-matchmaking-chrome-"),
);
const chromePath = process.env.CHROME_BIN || (process.platform === "win32"
  ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
  : "google-chrome");

const mockClient = String.raw`
    <script>
      window.SAMEWAVE_SUPABASE_CONFIG = {
        url: "http://localhost:54321",
        anonKey: "public-test-key",
        accountDeletionEnabled: false,
        providers: { google: false, facebook: false, x: false, instagram: "", threads: "" }
      };
      const matchTest = window.__matchTest = {
        events: [], pollCount: 0, cancelCount: 0, roomStateCount: 0, authReady: false, resolveFirstPoll: null
      };
      const session = { user: { id: "test-user", identities: [], app_metadata: {}, user_metadata: {} } };
      window.supabase = {
        createClient() {
          return {
            auth: {
              onAuthStateChange(callback) {
                matchTest.authCallback = callback;
                window.setTimeout(() => {
                  matchTest.authReady = true;
                  callback("SIGNED_IN", session);
                }, 0);
                return { data: { subscription: { unsubscribe() {} } } };
              },
              async getSession() {
                matchTest.authReady = true;
                return { data: { session }, error: null };
              },
              async signOut() { return { error: null }; }
            },
            async rpc(name) {
              matchTest.events.push(name);
              if (name === "queue_for_match") {
                return {
                  data: {
                    status: "waiting",
                    ticket_id: "test-ticket",
                    expires_at: new Date(Date.now() + 30000).toISOString()
                  },
                  error: null
                };
              }
              if (name === "get_match_status") {
                matchTest.pollCount += 1;
                if (matchTest.pollCount === 1) {
                  return new Promise((resolve) => {
                    matchTest.resolveFirstPoll = () => resolve({
                      data: {
                        status: "waiting",
                        ticket_id: "test-ticket",
                        expires_at: new Date(Date.now() + 30000).toISOString()
                      },
                      error: null
                    });
                  });
                }
                return {
                  data: {
                    status: "matched",
                    ticket_id: "test-ticket",
                    room_id: "test-room",
                    topic_key: "travel",
                    expires_at: new Date(Date.now() + 30000).toISOString(),
                    opponent_nickname: "測試玩家"
                  },
                  error: null
                };
              }
              if (name === "cancel_matchmaking") {
                matchTest.cancelCount += 1;
                return { data: { status: "matched", ticket_id: "test-ticket" }, error: null };
              }
              if (name === "get_room_state") {
                matchTest.roomStateCount += 1;
                return {
                  data: {
                    status: "playing",
                    current_question: 1,
                    topic_key: "travel",
                    you: { nickname: "測試玩家甲" },
                    partner: { nickname: "測試玩家乙" },
                    question: { prompt: "mock question", choice_a: "A", choice_b: "B" }
                  },
                  error: null
                };
              }
              if (name === "get_my_blocked_players") return { data: [], error: null };
              return { data: null, error: null };
            },
            channel() {
              return {
                on() { return this; },
                subscribe() { return this; },
                unsubscribe() { return Promise.resolve("ok"); }
              };
            },
            removeChannel() { return Promise.resolve("ok"); }
          };
        }
      };
    </script>`;

const browserTest = String.raw`
  <script>
    window.addEventListener("load", () => {
      const output = document.createElement("output");
      output.id = "matchmaking-test-result";
      document.body.append(output);
      const fail = (message) => {
        output.textContent = "FAIL: " + message;
        document.documentElement.setAttribute("data-matchmaking-race", "failed");
      };
      const waitFor = (check, message, timeout = 9000) => new Promise((resolve, reject) => {
        const started = Date.now();
        const poll = () => {
          if (check()) return resolve();
          if (Date.now() - started > timeout) return reject(new Error("Timed out: " + message));
          window.setTimeout(poll, 25);
        };
        poll();
      });
      (async () => {
        const cancel = document.querySelector("[data-cancel]");
        await waitFor(() => document.querySelector("[data-random-match]"), "random matchmaking control");
        await waitFor(() => window.__matchTest.authReady, "authenticated mock session");
        document.querySelector("[data-random-match]").click();
        await waitFor(() => window.__matchTest.events.includes("queue_for_match"), "queue RPC");
        await waitFor(() => !cancel.disabled && cancel.textContent === "取消配對", "cancel control becomes available");
        await waitFor(() => window.__matchTest.pollCount === 1, "status RPC begins");
        cancel.click();
        if (!cancel.disabled || cancel.textContent !== "正在取消…") {
          throw new Error("cancel intent is not reflected while status RPC is pending");
        }
        window.__matchTest.resolveFirstPoll();
        await waitFor(() => window.__matchTest.cancelCount === 1, "deferred cancel RPC");
        await waitFor(() => window.__matchTest.roomStateCount > 0, "matched room state");
        await waitFor(() => !document.querySelector('[data-view="game"]').classList.contains("hidden"), "game view");
        const events = window.__matchTest.events;
        const firstPoll = events.indexOf("get_match_status");
        const cancelCall = events.indexOf("cancel_matchmaking");
        const roomPoll = events.indexOf("get_match_status", firstPoll + 1);
        if (cancelCall < 0 || roomPoll < 0 || cancelCall > roomPoll) {
          throw new Error("the room status was not rechecked after the cancellation response");
        }
        window.__matchTest.authCallback("SIGNED_OUT", null);
        document.documentElement.setAttribute("data-matchmaking-race", "passed");
        output.textContent = "PASS: queued cancel survived a pending status poll and matched response without room_id.";
      })().catch((error) => fail(error?.message || String(error)));
    });
  </script>`;

function createTestPage() {
  let html = readFileSync(path.join(siteDirectory, "index.html"), "utf8");
  html = html.replace(/<script src="supabase-config\.js[^"]*" defer><\/script>\s*/, "");
  html = html.replace(
    /<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js[^"]*"[^>]*><\/script>\s*/,
    "",
  );
  html = html.replace(/<link[^>]+fonts\.(?:googleapis|gstatic)\.com[^>]*>\s*/g, "");
  const appScript = '<script src="app.js?v=10" defer></script>';
  if (!html.includes(appScript)) throw new Error("Could not find the application script in site/index.html");
  html = html.replace(appScript, `${mockClient}\n    ${appScript}`);
  html = html.replace("</body>", `${browserTest}\n  </body>`);
  writeFileSync(htmlPath, html, "utf8");
}

try {
  createTestPage();
  const result = spawnSync(chromePath, [
    "--headless=new",
    "--no-sandbox",
    "--disable-gpu",
    "--disable-dev-shm-usage",
    "--allow-file-access-from-files",
    `--user-data-dir=${profileDirectory}`,
    "--dump-dom",
    "--virtual-time-budget=12000",
    pathToFileURL(htmlPath).href,
  ], { encoding: "utf8", timeout: 30000, windowsHide: true, maxBuffer: 8 * 1024 * 1024 });

  const output = `${result.stdout || ""}\n${result.stderr || ""}`;
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Chrome exited with code ${result.status}: ${output.slice(-4000)}`);
  if (!output.includes('data-matchmaking-race="passed"')) {
    throw new Error(`Browser verification failed: ${output.slice(-4000)}`);
  }
  console.log("Matchmaking cancel race passed in headless Chrome.");
} finally {
  rmSync(htmlPath, { force: true });
  const tempRoot = path.resolve(os.tmpdir());
  const resolvedProfile = path.resolve(profileDirectory);
  if (path.dirname(resolvedProfile) !== tempRoot || !path.basename(resolvedProfile).startsWith("codex-matchmaking-chrome-")) {
    throw new Error("Refusing to remove a Chrome profile outside the dedicated temporary directory.");
  }
  rmSync(resolvedProfile, { recursive: true, force: true });
}
