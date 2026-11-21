import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const siteDirectory = path.resolve(scriptDirectory, "../site");
const htmlPath = path.join(siteDirectory, `.invite-room-codes-${process.pid}.html`);
const profileDirectory = mkdtempSync(path.join(os.tmpdir(), "codex-invite-codes-chrome-"));
const chromePath = process.env.CHROME_BIN || (process.platform === "win32"
  ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
  : "google-chrome");

const mockClient = String.raw`
  <script>
    window.SAMEWAVE_SUPABASE_CONFIG = {
      url: "http://localhost:54321",
      anonKey: "public-test-key",
      accountDeletionEnabled: false,
      providers: { google: false }
    };
    const inviteTest = window.__inviteTest = {
      ready: false,
      joinRequests: [],
      joinResponses: []
    };
    const session = {
      user: {
        id: "invite-test-user",
        is_anonymous: true,
        identities: [],
        app_metadata: { provider: "anonymous" },
        user_metadata: {}
      }
    };
    window.supabase = {
      createClient() {
        return {
          auth: {
            onAuthStateChange(callback) {
              window.setTimeout(() => callback("SIGNED_IN", session), 0);
              return { data: { subscription: { unsubscribe() {} } } };
            },
            async getSession() {
              inviteTest.ready = true;
              return { data: { session }, error: null };
            },
            async signOut() { return { error: null }; }
          },
          async rpc(name, args = {}) {
            if (name === "get_my_active_room" || name === "get_my_matchmaking_ticket") {
              return { data: null, error: null };
            }
            if (name === "get_my_blocked_players") return { data: [], error: null };
            if (name === "join_invite_room") {
              inviteTest.joinRequests.push(args);
              return {
                data: inviteTest.joinResponses.shift() || { status: "not_found" },
                error: null
              };
            }
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
    window.addEventListener("load", async () => {
      const output = document.createElement("output");
      output.id = "invite-room-codes-test-result";
      document.body.append(output);
      const fail = (message) => {
        output.textContent = "FAIL: " + message;
        document.documentElement.setAttribute("data-invite-room-codes", "failed");
      };
      const waitFor = (check, message, timeout = 5000) => new Promise((resolve, reject) => {
        const started = Date.now();
        const poll = () => {
          if (check()) return resolve();
          if (Date.now() - started > timeout) return reject(new Error("Timed out: " + message));
          window.setTimeout(poll, 20);
        };
        poll();
      });
      try {
        const test = window.__inviteTest;
        const input = document.querySelector("#invite-code");
        const joinButton = document.querySelector("[data-join-room]");
        const toast = document.querySelector("[data-toast]");
        const toggle = document.querySelector("[data-toggle-join]");
        if (!input || !joinButton || !toast || !toggle) throw new Error("invite controls are missing");
        const setCode = (value) => {
          input.value = value;
          input.dispatchEvent(new Event("input", { bubbles: true }));
        };
        if (!document.querySelector("label[for='invite-code']").textContent.includes("6 位數字")) {
          throw new Error("the invite field does not describe six-digit codes");
        }
        await waitFor(() => test.ready, "authenticated Supabase test session");
        toggle.click();

        setCode("12345");
        joinButton.click();
        await waitFor(() => toast.textContent.includes("請輸入 6 位數字"), "invalid code message");
        if (test.joinRequests.length !== 0) throw new Error("invalid code reached the room RPC");

        test.joinResponses.push({ status: "rate_limited", retry_after_seconds: 45 });
        setCode("000007");
        joinButton.click();
        await waitFor(() => test.joinRequests.length === 1 && toast.textContent.includes("45 秒"), "rate-limit response");
        if (test.joinRequests[0].p_invite_code !== "000007") {
          throw new Error("leading zeroes were not preserved");
        }

        test.joinResponses.push({ status: "not_found" });
        setCode("123456");
        input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
        await waitFor(() => test.joinRequests.length === 2, "Enter submits the invite code");
        if (test.joinRequests[1].p_invite_code !== "123456") {
          throw new Error("Enter submitted the wrong invite code");
        }

        test.joinResponses.push({ status: "not_found" });
        setCode("abcdef123456");
        joinButton.click();
        await waitFor(() => test.joinRequests.length === 3, "legacy invite code submission");
        if (test.joinRequests[2].p_invite_code !== "ABCDEF123456") {
          throw new Error("legacy hexadecimal codes were not normalized or accepted");
        }

        document.documentElement.setAttribute("data-invite-room-codes", "passed");
        output.textContent = "PASS: six-digit and legacy invite codes, rate-limit feedback, and Enter submission.";
      } catch (error) {
        fail(error?.message || String(error));
      }
    });
  </script>`;

function createTestPage() {
  let html = readFileSync(path.join(siteDirectory, "index.html"), "utf8");
  html = html.replace(/<script src="supabase-config\.js[^"]*" defer><\/script>\s*/, "");
  html = html.replace(/<script src="auth-provider-status\.js[^"]*" defer><\/script>\s*/, "");
  html = html.replace(
    /<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js[^"]*"[^>]*><\/script>\s*/,
    "",
  );
  html = html.replace(/<link[^>]+fonts\.(?:googleapis|gstatic)\.com[^>]*>\s*/g, "");
  const appScript = html.match(/<script src="app\.js[^"]*" defer><\/script>/)?.[0];
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
    "--virtual-time-budget=8000",
    pathToFileURL(htmlPath).href,
  ], { encoding: "utf8", timeout: 30000, windowsHide: true, maxBuffer: 8 * 1024 * 1024 });

  const output = `${result.stdout || ""}\n${result.stderr || ""}`;
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Chrome exited with code ${result.status}: ${output.slice(-4000)}`);
  if (!output.includes('data-invite-room-codes="passed"')) {
    throw new Error(`Browser verification failed: ${output.slice(-4000)}`);
  }
  console.log("Invite room code flow passed in headless Chrome.");
} finally {
  rmSync(htmlPath, { force: true });
  const tempRoot = path.resolve(os.tmpdir());
  const resolvedProfile = path.resolve(profileDirectory);
  if (path.dirname(resolvedProfile) !== tempRoot || !path.basename(resolvedProfile).startsWith("codex-invite-codes-chrome-")) {
    throw new Error("Refusing to remove a Chrome profile outside the dedicated temporary directory.");
  }
  rmSync(resolvedProfile, { recursive: true, force: true });
}
