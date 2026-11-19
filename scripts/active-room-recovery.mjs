import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const siteDirectory = path.resolve(testDirectory, "../site");
const htmlPath = path.join(siteDirectory, `.active-room-recovery-${process.pid}.html`);
const profileDirectory = mkdtempSync(path.join(os.tmpdir(), "codex-room-recovery-chrome-"));
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
      const roomTest = window.__roomTest = { events: [], authReady: false, roomStateCount: 0, roomId: "restored-room" };
      const session = { user: { id: "test-user", identities: [], app_metadata: {}, user_metadata: {} } };
      window.supabase = {
        createClient() {
          return {
            auth: {
              onAuthStateChange(callback) {
                roomTest.authCallback = callback;
                window.setTimeout(() => {
                  roomTest.authReady = true;
                  callback("SIGNED_IN", session);
                }, 0);
                return { data: { subscription: { unsubscribe() {} } } };
              },
              async getSession() {
                roomTest.authReady = true;
                return { data: { session }, error: null };
              },
              async signOut() { return { error: null }; }
            },
            async rpc(name, args = {}) {
              roomTest.events.push(name);
              if (name === "get_my_active_room") {
                roomTest.restoreArgs = args;
                return {
                  data: {
                    room_id: roomTest.roomId,
                    status: "playing",
                    topic_key: "travel",
                    invite_code: null,
                    expires_at: new Date(Date.now() + 300000).toISOString(),
                    created_by: false,
                    nickname: "小星",
                    opponent_nickname: "朋友"
                  },
                  error: null
                };
              }
              if (name === "get_room_state") {
                roomTest.roomStateCount += 1;
                roomTest.roomStateArgs = args;
                return {
                  data: {
                    room_id: roomTest.roomId,
                    status: "playing",
                    current_question: 1,
                    topic_key: "travel",
                    you: { nickname: "小星", answered: false },
                    partner: { nickname: "朋友", answered: false },
                    question: { prompt: "恢復房間測試題", choice_a: "選項甲", choice_b: "選項乙" },
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
      output.id = "room-recovery-test-result";
      document.body.append(output);
      const fail = (message) => {
        output.textContent = "FAIL: " + message;
        document.documentElement.setAttribute("data-room-recovery", "failed");
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
        await waitFor(() => window.__roomTest.authReady, "authenticated mock session");
        await waitFor(() => window.__roomTest.events.includes("get_my_active_room"), "active room recovery RPC");
        await waitFor(() => !document.querySelector('[data-view="game"]').classList.contains("hidden"), "restored game view");
        await waitFor(() => window.__roomTest.roomStateCount > 0, "restored room state RPC");
        const test = window.__roomTest;
        if (test.roomStateArgs?.p_room_id !== test.roomId) {
          throw new Error("the restored room ID was not passed to get_room_state");
        }
        const recoveryIndex = test.events.indexOf("get_my_active_room");
        const stateIndex = test.events.indexOf("get_room_state");
        if (recoveryIndex < 0 || stateIndex < recoveryIndex) {
          throw new Error("room state was not loaded after active room recovery");
        }
        if (!document.querySelector("[data-question]").textContent.includes("恢復房間測試題")) {
          throw new Error("the restored game question was not rendered");
        }
        test.authCallback("SIGNED_OUT", null);
        document.documentElement.setAttribute("data-room-recovery", "passed");
        output.textContent = "PASS: page reload restored the authenticated player's active room.";
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
  if (!output.includes('data-room-recovery="passed"')) {
    throw new Error(`Browser verification failed: ${output.slice(-4000)}`);
  }
  console.log("Active room recovery passed in headless Chrome.");
} finally {
  rmSync(htmlPath, { force: true });
  const tempRoot = path.resolve(os.tmpdir());
  const resolvedProfile = path.resolve(profileDirectory);
  if (path.dirname(resolvedProfile) !== tempRoot || !path.basename(resolvedProfile).startsWith("codex-room-recovery-chrome-")) {
    throw new Error("Refusing to remove a Chrome profile outside the dedicated temporary directory.");
  }
  rmSync(resolvedProfile, { recursive: true, force: true });
}
