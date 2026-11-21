import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";

const helperSource = readFileSync(new URL("../site/auth-provider-status.js", import.meta.url), "utf8");
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

test("maps Supabase provider flags and clears the timeout", async () => {
  let request;
  const helper = loadProviderHelper(async (url, options) => {
    request = { url: String(url), options };
    return {
      ok: true,
      async json() {
        return { external: { google: true, facebook: false, twitter: true } };
      }
    };
  });

  const providers = await helper.load();

  assert.deepEqual({ ...providers }, { google: true, facebook: false, x: true });
  assert.equal(request.url, `${projectUrl}/auth/v1/settings`);
  assert.equal(request.options.method, "GET");
  assert.equal(request.options.headers.apikey, publicKey);
  assert.equal(request.options.cache, "no-store");
  assert.equal(helper.clearedTimers.length, 1);
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
