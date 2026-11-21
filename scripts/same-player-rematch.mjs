import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const siteDirectory = path.resolve(testDirectory, "../site");
const htmlPath = path.join(siteDirectory, `.same-player-rematch-${process.pid}.html`);
const profileDirectory = mkdtempSync(path.join(os.tmpdir(), "codex-samewave-rematch-chrome-"));
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
    const session = { user: { id: "test-user", identities: [], app_metadata: {}, user_metadata: {} } };
    const test = window.__rematchTest = {
      authReady: false,
      events: [],
      channels: [],
      rematchStatus: { status: "none" },
      sourceRoomId: "completed-room",
      newRoomId: "rematch-room"
    };
    const channel = (name) => {
      const item = {
        name,
        callback: null,
        filter: null,
        on(_event, options, callback) {
          this.filter = options.filter;
          this.callback = callback;
          return this;
        },
        subscribe(callback) {
          test.channels.push(this);
          if (callback) window.setTimeout(() => callback("SUBSCRIBED"), 0);
          return this;
        }
      };
      return item;
    };
    window.supabase = {
      createClient() {
        return {
          auth: {
            onAuthStateChange(callback) {
              test.authCallback = callback;
              window.setTimeout(() => {
                test.authReady = true;
                callback("SIGNED_IN", session);
              }, 0);
              return { data: { subscription: { unsubscribe() {} } } };
            },
            async getSession() {
              test.authReady = true;
              return { data: { session }, error: null };
            },
            async signOut() { return { error: null }; }
          },
          channel,
          removeChannel() { return Promise.resolve("ok"); },
          async rpc(name, args = {}) {
            test.events.push({ name, args });
            if (name === "get_my_active_room") {
              return {
                data: {
                  room_id: test.sourceRoomId,
                  status: "playing",
                  topic_key: "travel",
                  created_by: false,
                  nickname: "小芯",
                  opponent_nickname: "朋友",
                  expires_at: new Date(Date.now() + 300000).toISOString()
                },
                error: null
              };
            }
            if (name === "get_my_matchmaking_ticket") return { data: { status: "none" }, error: null };
            if (name === "get_room_state") {
              if (args.p_room_id === test.sourceRoomId) return { data: { status: "completed" }, error: null };
              return {
                data: {
                  room_id: test.newRoomId,
                  status: "playing",
                  current_question: 1,
                  topic_key: "travel",
                  you: { nickname: "小芯", answered: false },
                  partner: { nickname: "朋友", answered: false },
                  question: { prompt: "續玩題目", choice_a: "選項甲", choice_b: "選項乙" },
                  reveal: false
                },
                error: null
              };
            }
            if (name === "get_room_results") {
              return {
                data: {
                  topic_key: "travel",
                  common_choices: [{ question_no: 1, prompt: "共同點測試題", choice: "選項甲" }]
                },
                error: null
              };
            }
            if (name === "get_same_player_rematch_status") {
              return { data: test.rematchStatus, error: null };
            }
            if (name === "request_same_player_rematch") {
              test.requestArgs = args;
              test.rematchStatus = { status: "pending", requested_by_you: true };
              return { data: test.rematchStatus, error: null };
            }
            return { data: null, error: null };
          }
        };
      }
    };
  </script>`;

const browserTest = String.raw`
  <script>
    window.addEventListener("load", () => {
      const output = document.createElement("output");
      output.id = "same-player-rematch-test-result";
      document.body.append(output);
      const fail = (message) => {
        output.textContent = "FAIL: " + message;
        document.documentElement.setAttribute("data-same-player-rematch", "failed");
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
        const test = window.__rematchTest;
        await waitFor(() => test.authReady, "authenticated mock session");
        await waitFor(() => test.events.some((event) => event.name === "get_room_results"), "completed source result");
        await waitFor(() => !document.querySelector('[data-view="results"]').classList.contains("hidden"), "result view");
        await waitFor(() => test.events.some((event) => event.name === "get_same_player_rematch_status"), "rematch status RPC");
        const invite = document.querySelector("[data-request-rematch]");
        if (invite.disabled) throw new Error("invite button should be enabled when no request exists");
        invite.click();
        await waitFor(() => test.events.some((event) => event.name === "request_same_player_rematch"), "rematch request RPC");
        await waitFor(() => invite.disabled && invite.textContent.includes("等待"), "pending invite state");
        if (test.requestArgs?.p_source_room_id !== test.sourceRoomId) {
          throw new Error("request did not reference the completed source room");
        }
        test.rematchStatus = {
          status: "matched",
          room_id: test.newRoomId,
          topic_key: "travel",
          expires_at: new Date(Date.now() + 300000).toISOString()
        };
        const sourceChannel = test.channels.find((item) => item.filter === "id=eq." + test.sourceRoomId);
        if (!sourceChannel?.callback) throw new Error("source room change subscription was not created");
        sourceChannel.callback({});
        await waitFor(() => !document.querySelector('[data-view="game"]').classList.contains("hidden"), "rematch game view");
        await waitFor(() => test.events.some((event) => event.name === "get_room_state" && event.args.p_room_id === test.newRoomId), "new room state RPC");
        const gameChannel = test.channels.find((item) => item.filter === "id=eq." + test.newRoomId);
        if (!gameChannel) throw new Error("new game room subscription was not created");
        test.authCallback("SIGNED_OUT", null);
        document.documentElement.setAttribute("data-same-player-rematch", "passed");
        output.textContent = "PASS: mutual-consent request enters a fresh same-topic room.";
      })().catch((error) => fail(error?.message || String(error)));
    });
  </script>`;

function createTestPage() {
  let html = readFileSync(path.join(siteDirectory, "index.html"), "utf8");
  html = html.replace(/<script src="supabase-config\.js[^\"]*" defer><\/script>\s*/, "");
  html = html.replace(
    /<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js[^\"]*"[^>]*><\/script>\s*/,
    "",
  );
  html = html.replace(/<link[^>]+fonts\.(?:googleapis|gstatic)\.com[^>]*>\s*/g, "");
  const appScript = html.match(/<script src="app\.js[^\"]*" defer><\/script>/)?.[0];
  if (!appScript) throw new Error("Could not find the application script in site/index.html");
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
    "--virtual-time-budget=16000",
    pathToFileURL(htmlPath).href,
  ], { encoding: "utf8", timeout: 30000, windowsHide: true, maxBuffer: 8 * 1024 * 1024 });

  const output = `${result.stdout || ""}\n${result.stderr || ""}`;
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Chrome exited with code ${result.status}: ${output.slice(-4000)}`);
  if (!output.includes('data-same-player-rematch="passed"')) {
    throw new Error(`Browser verification failed: ${output.slice(-4000)}`);
  }
  console.log("Same-player rematch passed in headless Chrome.");
} finally {
  rmSync(htmlPath, { force: true });
  const tempRoot = path.resolve(os.tmpdir());
  const resolvedProfile = path.resolve(profileDirectory);
  if (path.dirname(resolvedProfile) !== tempRoot || !path.basename(resolvedProfile).startsWith("codex-samewave-rematch-chrome-")) {
    throw new Error("Refusing to remove a Chrome profile outside the dedicated temporary directory.");
  }
  rmSync(resolvedProfile, { recursive: true, force: true });
}
