import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { createServer } from "node:http";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const siteDirectory = path.resolve(scriptDirectory, "../site");
const profileDirectory = mkdtempSync(path.join(os.tmpdir(), "codex-auth-login-flows-chrome-"));
const chromePath = process.env.CHROME_BIN || (process.platform === "win32"
  ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
  : "google-chrome");

const mockClient = String.raw`
    <script>
      window.SAMEWAVE_SUPABASE_CONFIG = {
        url: "http://127.0.0.1:54321",
        anonKey: "public-test-key",
        accountDeletionEnabled: false,
      providers: {}
      };
      const authTest = window.__authLoginTest = { calls: [], session: null, authCallback: null };
      window.supabase = {
        createClient() {
          return {
            auth: {
              onAuthStateChange(callback) {
                authTest.authCallback = callback;
                return { data: { subscription: { unsubscribe() {} } } };
              },
              async getSession() { return { data: { session: authTest.session }, error: null }; },
              async signInWithOAuth(options) {
                authTest.calls.push({ method: "signInWithOAuth", options });
                return { data: { url: "https://accounts.google.com/mock" }, error: null };
              },
              async signInAnonymously() {
                authTest.calls.push({ method: "signInAnonymously" });
                const user = {
                  id: "mock-anonymous-player-id",
                  is_anonymous: true,
                  identities: [],
                  app_metadata: { provider: "anonymous" },
                  user_metadata: {}
                };
                authTest.session = { user, access_token: "mock-access-token" };
                authTest.authCallback("SIGNED_IN", authTest.session);
                return { data: { user, session: authTest.session }, error: null };
              },
              async linkIdentity(options) {
                authTest.calls.push({
                  method: "linkIdentity",
                  userId: authTest.session?.user?.id,
                  options
                });
                return { data: { url: "https://accounts.google.com/mock-link" }, error: null };
              }
            },
            async rpc() { return { data: null, error: null }; }
          };
        }
      };
    </script>`;

const browserTest = String.raw`
  <script>
    window.addEventListener("load", () => {
      const output = document.createElement("output");
      output.id = "auth-login-test-result";
      document.body.append(output);
      const fail = (message) => {
        output.textContent = "FAIL: " + message;
        document.documentElement.setAttribute("data-auth-login-flows", "failed");
      };
      const waitFor = (check, message, timeout = 7000) => new Promise((resolve, reject) => {
        const started = Date.now();
        const poll = () => {
          if (check()) return resolve();
          if (Date.now() - started > timeout) return reject(new Error("Timed out: " + message));
          window.setTimeout(poll, 25);
        };
        poll();
      });
      (async () => {
        const test = window.__authLoginTest;
        const anonymousButton = document.querySelector("[data-auth-anonymous]");
        const socialButtons = document.querySelectorAll("[data-auth-provider]");
        if (!anonymousButton || socialButtons.length) {
          throw new Error("Expected an anonymous control without social sign-in buttons");
        }
        await waitFor(() => !anonymousButton.disabled, "enabled anonymous auth control");

        anonymousButton.click();
        await waitFor(() => test.session?.user?.id === "mock-anonymous-player-id", "anonymous session");
        if (!test.session.user.is_anonymous) throw new Error("anonymous sign-in returned a non-anonymous user");
        if (!anonymousButton.textContent.includes("已匿名登入")) {
          throw new Error("anonymous login state was not reflected in the UI");
        }
        if (test.calls.some((call) => call.method === "signInWithOAuth" || call.method === "linkIdentity")) {
          throw new Error("the player page invoked a social sign-in or identity-linking flow");
        }

        document.documentElement.setAttribute("data-auth-login-flows", "passed");
        output.textContent = "PASS: anonymous sign-in works without social sign-in or identity-linking controls.";
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
  const appScript = html.match(/<script src="app\.js[^\"]*" defer><\/script>/)?.[0];
  if (!appScript) throw new Error("Could not find the application script in site/index.html");
  html = html.replace(appScript, `${mockClient}\n    ${appScript}`);
  if (!html.includes("data-auth-anonymous") || html.includes('data-auth-provider="google"')) {
    throw new Error("The page must expose anonymous sign-in without Google player sign-in");
  }
  return html.replace("</body>", `${browserTest}\n  </body>`);
}

function runChrome(url) {
  return new Promise((resolve, reject) => {
    const child = spawn(chromePath, [
      "--headless=new",
      "--no-sandbox",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      `--user-data-dir=${profileDirectory}`,
      "--dump-dom",
      "--virtual-time-budget=18000",
      url,
    ], { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, 35000);
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
  if (!output.includes('data-auth-login-flows="passed"')) {
    throw new Error(`Browser verification failed: ${output.slice(-5000)}`);
  }
  console.log("Anonymous-only player auth flow passed in headless Chrome.");
} finally {
  await new Promise((resolve) => server.close(resolve));
  const tempRoot = path.resolve(os.tmpdir());
  const resolvedProfile = path.resolve(profileDirectory);
  if (
    path.dirname(resolvedProfile) !== tempRoot ||
    !path.basename(resolvedProfile).startsWith("codex-auth-login-flows-chrome-") ||
    !statSync(resolvedProfile, { throwIfNoEntry: false })?.isDirectory()
  ) {
    throw new Error("Refusing to remove a Chrome profile outside the dedicated temporary directory.");
  }
  rmSync(resolvedProfile, { recursive: true, force: true });
}
