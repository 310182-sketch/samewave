import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";

const helperSource = readFileSync(new URL("../site/auth-provider-status.js", import.meta.url), "utf8");
const indexSource = readFileSync(new URL("../site/index.html", import.meta.url), "utf8");
const moderationSource = readFileSync(new URL("../site/moderation.html", import.meta.url), "utf8");
const projectUrl = "https://example.supabase.co";
const publicKey = "sb_publishable_test_key";

function loadProviderHelper(fetchImplementation, config = { url: projectUrl, anonKey: publicKey }) {
  const clearedTimers = [];
  let nextTimer = 0;
  const window = {
    SAMEWAVE_SUPABASE_CONFIG: config,
    setTimeout() {
      nextTimer += 1;
      return nextTimer;
    },
    clearTimeout(timer) {
      clearedTimers.push(timer);
    }
  };
  const context = {
    AbortController,
    URL,
    fetch: fetchImplementation,
    window
  };
  runInNewContext(helperSource, context);
  return { load: window.SAMEWAVE_AUTH_PROVIDER_STATUS.load, clearedTimers };
}

test("returns only the Google provider flag and clears the timeout", async () => {
  let request;
  const helper = loadProviderHelper(async (url, options) => {
    request = { url: String(url), options };
    return {
      ok: true,
      async json() {
        return { external: { google: true, facebook: true, twitter: true } };
      }
    };
  });

  const providers = await helper.load();

  assert.deepEqual({ ...providers }, { google: true });
  assert.equal(request.url, `${projectUrl}/auth/v1/settings`);
  assert.equal(request.options.method, "GET");
  assert.equal(request.options.headers.apikey, publicKey);
  assert.equal(request.options.cache, "no-store");
  assert.equal(helper.clearedTimers.length, 1);
});

test("keeps player sign-in anonymous and reviewer sign-in Google-only", () => {
  assert.deepEqual(
    [...indexSource.matchAll(/data-auth-provider="([^"]+)"/g)].map((match) => match[1]),
    []
  );
  assert.deepEqual(
    [...moderationSource.matchAll(/data-auth-provider="([^"]+)"/g)].map((match) => match[1]),
    ["google"]
  );
  assert.doesNotMatch(moderationSource, /data-auth-provider="(?:facebook|x|instagram|threads)"/);
});

test("rejects unsuccessful responses and clears the timeout", async () => {
  const helper = loadProviderHelper(async () => ({ ok: false, status: 503 }));

  await assert.rejects(helper.load(), /Supabase Auth settings request failed/);
  assert.equal(helper.clearedTimers.length, 1);
});

test("rejects missing public configuration without making a request", async () => {
  let requested = false;
  const helper = loadProviderHelper(async () => {
    requested = true;
    return { ok: true, async json() { return { external: {} }; } };
  }, {});

  await assert.rejects(helper.load(), /public configuration is unavailable/);
  assert.equal(requested, false);
  assert.equal(helper.clearedTimers.length, 0);
});

test("rejects incomplete provider settings", async () => {
  const helper = loadProviderHelper(async () => ({
    ok: true,
    async json() { return { external: null }; }
  }));

  await assert.rejects(helper.load(), /provider settings are missing/);
  assert.equal(helper.clearedTimers.length, 1);
});
