import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const siteDirectory = path.resolve(scriptDirectory, "../site");
const htmlPath = path.join(siteDirectory, `.moderation-access-lock-${process.pid}.html`);
const profileDirectory = mkdtempSync(path.join(os.tmpdir(), "codex-moderation-access-chrome-"));
const chromePath = process.env.CHROME_BIN || (process.platform === "win32"
  ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
  : "google-chrome");

const mockClient = String.raw`
    <script>
      window.SAMEWAVE_SUPABASE_CONFIG = {
        url: "http://localhost:54321",
        anonKey: "public-test-key",
        providers: { google: true, facebook: false, x: false, instagram: "", threads: "" }
      };
      const moderationTest = window.__moderationTest = {
        permissionModes: [], pendingPermission: null, authCallback: null, signOutCount: 0
      };
      const session = {
        user: {
          id: "reviewer-test-id",
          identities: [{ provider: "google" }],
          app_metadata: { provider: "google" },
          user_metadata: {}
        }
      };
      const report = {
        report_id: "report-test-id",
        category: "harassment",
        status: "pending",
        created_at: "2026-11-20T12:00:00.000Z"
      };
      window.supabase = {
        createClient() {
          return {
            auth: {
              onAuthStateChange(callback) {
                moderationTest.authCallback = callback;
                return { data: { subscription: { unsubscribe() {} } } };
              },
              async getSession() { return { data: { session }, error: null }; },
              async signOut() {
                moderationTest.signOutCount += 1;
                window.setTimeout(() => moderationTest.authCallback("SIGNED_OUT", null), 0);
                return { error: null };
              }
            },
            async rpc(name, args = {}) {
              if (name === "list_moderation_reports" && args.p_page_size === 1) {
                const mode = moderationTest.permissionModes.shift() || "allow";
                if (mode === "deny") return { data: null, error: { message: "not allowed" } };
                if (mode === "reject") throw new Error("permission request failed");
                if (mode === "pending") {
                  return new Promise((resolve) => {
                    moderationTest.pendingPermission = () => resolve({ data: [], error: null });
                  });
                }
                return { data: [], error: null };
              }
              if (name === "list_moderation_reports") return { data: [report], error: null };
              if (name === "get_moderation_report") {
                return {
                  data: {
                    ...report,
                    room_id: "room-test-id",
                    reporter_user_id: "reporter-test-id",
                    reported_user_id: "reported-test-id",
                    assigned_reviewer_id: null,
                    details: "PRIVATE moderation evidence"
                  },
                  error: null
                };
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
      output.id = "moderation-access-test-result";
      document.body.append(output);
      const fail = (message) => {
        output.textContent = "FAIL: " + message;
        document.documentElement.setAttribute("data-moderation-access", "failed");
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
      const app = document.querySelector("[data-review-app]");
      const details = document.querySelector("[data-case-details]");
      const sensitiveFields = [
        "[data-case-id]", "[data-case-category]", "[data-case-status]", "[data-case-created]",
        "[data-case-room]", "[data-case-reporter]", "[data-case-reported]", "[data-case-assignee]",
        "[data-case-details]"
      ];
      const assertLockedAndCleared = (label) => {
        if (!app.classList.contains("hidden")) throw new Error(label + ": workspace is visible");
        for (const selector of sensitiveFields) {
          if (document.querySelector(selector).textContent !== "") {
            throw new Error(label + ": sensitive DOM text remains in " + selector);
          }
        }
        if (document.querySelector("[data-report-list]").children.length !== 0) {
          throw new Error(label + ": queue rows remain in the DOM");
        }
        if (document.querySelector("[data-confirm-dialog]").open) {
          throw new Error(label + ": resolution dialog remains open");
        }
      };
      const openSensitiveCase = async () => {
        await waitFor(() => !app.classList.contains("hidden"), "reviewer workspace");
        await waitFor(() => document.querySelector("[data-report-id]"), "report queue row");
        document.querySelector("[data-report-id]").click();
        await waitFor(() => details.textContent === "PRIVATE moderation evidence", "report details");
      };
      (async () => {
        const test = window.__moderationTest;
        await openSensitiveCase();

        test.permissionModes.push("deny");
        test.authCallback("TOKEN_REFRESHED", { user: { ...testSession.user, id: "reviewer-test-id" } });
        await waitFor(() => app.classList.contains("hidden"), "workspace hidden after allowlist denial");
        assertLockedAndCleared("allowlist denial");

        test.permissionModes.push("allow");
        test.authCallback("TOKEN_REFRESHED", testSession);
        await openSensitiveCase();
        test.permissionModes.push("reject");
        test.authCallback("TOKEN_REFRESHED", testSession);
        await waitFor(() => app.classList.contains("hidden"), "workspace hidden after rejected permission request");
        assertLockedAndCleared("rejected permission request");

        test.permissionModes.push("allow");
        test.authCallback("TOKEN_REFRESHED", testSession);
        await openSensitiveCase();
        test.permissionModes.push("pending");
        test.authCallback("TOKEN_REFRESHED", testSession);
        await waitFor(() => typeof test.pendingPermission === "function", "pending reviewer permission check");
        document.querySelector("[data-auth-signout]").click();
        assertLockedAndCleared("sign-out start");
        test.pendingPermission();
        await waitFor(() => test.signOutCount === 1, "sign-out request");
        await new Promise((resolve) => window.setTimeout(resolve, 50));
        assertLockedAndCleared("late reviewer permission response after sign-out");

        document.documentElement.setAttribute("data-moderation-access", "passed");
        output.textContent = "PASS: reviewer revocation, rejected permission checks, DOM clearing, and sign-out races fail closed.";
      })().catch((error) => fail(error?.message || String(error)));
      const testSession = {
        user: {
          id: "reviewer-test-id",
          identities: [{ provider: "google" }],
          app_metadata: { provider: "google" },
          user_metadata: {}
        }
      };
    });
  </script>`;

function createTestPage() {
  let html = readFileSync(path.join(siteDirectory, "moderation.html"), "utf8");
  html = html.replace(/<script src="supabase-config\.js[^"]*" defer><\/script>\s*/, "");
  html = html.replace(
    /<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js[^"]*"[^>]*><\/script>\s*/,
    "",
  );
  const moderationScript = html.match(/<script src="moderation\.js[^"]*" defer><\/script>/)?.[0];
  if (!moderationScript) throw new Error("Could not find the moderation script in site/moderation.html");
  html = html.replace(moderationScript, `${mockClient}\n    ${moderationScript}`);
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
    "--virtual-time-budget=20000",
    pathToFileURL(htmlPath).href,
  ], { encoding: "utf8", timeout: 35000, windowsHide: true, maxBuffer: 8 * 1024 * 1024 });

  const output = `${result.stdout || ""}\n${result.stderr || ""}`;
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Chrome exited with code ${result.status}: ${output.slice(-4000)}`);
  if (!output.includes('data-moderation-access="passed"')) {
    throw new Error(`Browser verification failed: ${output.slice(-4000)}`);
  }
  console.log("Moderation access lock passed in headless Chrome.");
} finally {
  rmSync(htmlPath, { force: true });
  const tempRoot = path.resolve(os.tmpdir());
  const resolvedProfile = path.resolve(profileDirectory);
  if (
    path.dirname(resolvedProfile) !== tempRoot ||
    !path.basename(resolvedProfile).startsWith("codex-moderation-access-chrome-")
  ) {
    throw new Error("Refusing to remove a Chrome profile outside the dedicated temporary directory.");
  }
  rmSync(resolvedProfile, { recursive: true, force: true });
}
