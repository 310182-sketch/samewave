import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const siteDirectory = path.resolve(testDirectory, "../site");
const htmlPath = path.join(siteDirectory, `.matchmaking-resume-${process.pid}.html`);
const profileDirectory = mkdtempSync(path.join(os.tmpdir(), "codex-matchmaking-resume-chrome-"));
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
      const matchTest = window.__matchTest = { events: [], authReady: false, statusPollCount: 0, roomStateCount: 0 };
      const session = { user: { id: "test-user", identities: [], app_metadata: {}, user_metadata: {} } };
      const expiry = () => new Date(Date.now() + 12000).toISOString();
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
            async rpc(name, args = {}) {
              matchTest.events.push(name);
              if (name === "get_my_active_room") {
                return { data: { status: "none" }, error: null };
              }
              if (name === "get_my_matchmaking_ticket") {
                return {
                  data: {
                    status: "waiting",
                    ticket_id: "restored-ticket",
                    topic_choice: "travel",
                    nickname: "測試玩家",
                    expires_at: expiry()
                  },
                  error: null
                };
              }
              if (name === "get_match_status") {
                matchTest.statusPollCount += 1;
                matchTest.lastStatusArgs = args;
                if (matchTest.statusPollCount === 1) {
                  return {
                    data: { status: "waiting", ticket_id: "restored-ticket", expires_at: expiry() },
                    error: null
                  };
                }
                return {
                  data: {
                    status: "matched",
                    ticket_id: "restored-ticket",
                    room_id: "restored-match-room",
                    topic_key: "travel",
                    opponent_nickname: "朋友",
                    expires_at: expiry()
                  },
                  error: null
                };
              }
              if (name === "get_room_state") {
                matchTest.roomStateCount += 1;
                matchTest.roomStateArgs = args;
                return {
                  data: {
                    room_id: "restored-match-room",
                    status: "playing",
                    current_question: 1,
                    topic_key: "travel",
                    you: { nickname: "測試玩家", answered: false },
                    partner: { nickname: "朋友", answered: false },
                    question: { prompt: "重新接回配對測試題", choice_a: "選項甲", choice_b: "選項乙" },
                    reveal: false
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
                subscribe(callback) {
                  window.setTimeout(() => callback("SUBSCRIBED"), 0);
                  return this;
                },
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
      output.id = "matchmaking-resume-test-result";
      document.body.append(output);
      const fail = (message) => {
        output.textContent = "FAIL: " + message;
        document.documentElement.setAttribute("data-matchmaking-resume", "failed");
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
        await waitFor(() => window.__matchTest.authReady, "authenticated mock session");
        await waitFor(() => window.__matchTest.events.includes("get_my_matchmaking_ticket"), "ticket recovery RPC");
        await waitFor(() => window.__matchTest.statusPollCount === 1, "restored ticket status query");
        await waitFor(() => !document.querySelector('[data-view="matching"]').classList.contains("hidden"), "restored matching view");
        await waitFor(() => window.__matchTest.roomStateCount > 0, "matched room state query");
        await waitFor(() => !document.querySelector('[data-view="game"]').classList.contains("hidden"), "matched game view");
        const test = window.__matchTest;
        if (test.lastStatusArgs?.p_ticket_id !== "restored-ticket") {
          throw new Error("the restored ticket ID was not used for status polling");
        }
        if (test.statusPollCount < 2) throw new Error("the restored ticket was not polled after resuming the queue");
        if (test.roomStateArgs?.p_room_id !== "restored-match-room") {
          throw new Error("the matched room was not opened after ticket recovery");
        }
        if (!document.querySelector("[data-question]").textContent.includes("重新接回配對測試題")) {
          throw new Error("the game state was not rendered after restoring the match");
        }
        test.authCallback("SIGNED_OUT", null);
        document.documentElement.setAttribute("data-matchmaking-resume", "passed");
        output.textContent = "PASS: page reload resumed matchmaking and entered its matched room.";
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
  if (!output.includes('data-matchmaking-resume="passed"')) {
    throw new Error(`Browser verification failed: ${output.slice(-4000)}`);
  }
  console.log("Matchmaking recovery passed in headless Chrome.");
} finally {
  rmSync(htmlPath, { force: true });
  const tempRoot = path.resolve(os.tmpdir());
  const resolvedProfile = path.resolve(profileDirectory);
  if (path.dirname(resolvedProfile) !== tempRoot || !path.basename(resolvedProfile).startsWith("codex-matchmaking-resume-chrome-")) {
    throw new Error("Refusing to remove a Chrome profile outside the dedicated temporary directory.");
  }
  rmSync(resolvedProfile, { recursive: true, force: true });
}
