function assertEquals(actual: unknown, expected: unknown, label: string) {
  if (actual !== expected) {
    throw new Error(
      `${label}: expected ${String(expected)}, got ${String(actual)}`,
    );
  }
}

Deno.test("delete-account enforces origin, method, auth, and caller identity", async (t) => {
  const userId = "00000000-0000-4000-8000-000000000123";
  const adminDeleteRequests: Array<{
    authorization: string | null;
    apikey: string | null;
    pathname: string;
  }> = [];
  const authRequests: Array<
    { authorization: string | null; pathname: string }
  > = [];

  const mockSupabase = Deno.serve(
    { hostname: "127.0.0.1", port: 0 },
    (request) => {
      const url = new URL(request.url);
      const authorization = request.headers.get("authorization");

      if (url.pathname === "/auth/v1/user" && request.method === "GET") {
        authRequests.push({ authorization, pathname: url.pathname });
        if (authorization !== "Bearer valid-user-token") {
          return Response.json({ message: "Invalid JWT" }, { status: 401 });
        }
        return Response.json({
          id: userId,
          aud: "authenticated",
          role: "authenticated",
          email: "",
          app_metadata: { provider: "anonymous", providers: ["anonymous"] },
          user_metadata: {},
          identities: [],
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
        });
      }

      if (
        request.method === "GET" &&
        url.pathname === `/auth/v1/admin/users/${userId}`
      ) {
        return Response.json({
          id: userId,
          aud: "authenticated",
          role: "authenticated",
          email: "",
          app_metadata: { provider: "anonymous", providers: ["anonymous"] },
          user_metadata: {},
          identities: [],
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
        });
      }

      if (
        request.method === "DELETE" &&
        url.pathname.startsWith("/auth/v1/admin/users/")
      ) {
        adminDeleteRequests.push({
          authorization,
          apikey: request.headers.get("apikey"),
          pathname: url.pathname,
        });
        return Response.json({ id: userId });
      }

      return Response.json({ message: "Not found" }, { status: 404 });
    },
  );

  Deno.env.set("SUPABASE_URL", `http://127.0.0.1:${mockSupabase.addr.port}`);
  Deno.env.set("SUPABASE_ANON_KEY", "unit-test-anon-key");
  const serviceRoleKey =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJleHAiOjk5OTk5OTk5OTl9.dGVzdC1zaWduYXR1cmU";
  Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", serviceRoleKey);
  Deno.env.set(
    "ALLOWED_ORIGINS",
    "https://game.example, http://localhost:8000",
  );

  try {
    const { handleRequest } = await import("./index.ts");

    await t.step(
      "allows preflight for an explicitly configured origin",
      async () => {
        const response = await handleRequest(
          new Request("https://edge.example/functions/v1/delete-account", {
            method: "OPTIONS",
            headers: { origin: "https://game.example" },
          }),
        );
        assertEquals(response.status, 200, "status");
        assertEquals(
          response.headers.get("Access-Control-Allow-Origin"),
          "https://game.example",
          "allowed origin",
        );
        assertEquals(
          response.headers.get("Access-Control-Allow-Methods"),
          "POST, OPTIONS",
          "allowed methods",
        );
      },
    );

    await t.step("rejects an unlisted request origin", async () => {
      const response = await handleRequest(
        new Request("https://edge.example/functions/v1/delete-account", {
          method: "POST",
          headers: { origin: "https://attacker.example" },
        }),
      );
      assertEquals(response.status, 403, "status");
      assertEquals(
        response.headers.get("Access-Control-Allow-Origin"),
        null,
        "CORS origin",
      );
    });

    await t.step("rejects preflight from an unlisted origin", async () => {
      const response = await handleRequest(
        new Request("https://edge.example/functions/v1/delete-account", {
          method: "OPTIONS",
          headers: { origin: "https://attacker.example" },
        }),
      );
      assertEquals(response.status, 403, "status");
      assertEquals(
        response.headers.get("Access-Control-Allow-Origin"),
        null,
        "CORS origin",
      );
    });

    await t.step("rejects methods other than POST", async () => {
      const response = await handleRequest(
        new Request("https://edge.example/functions/v1/delete-account", {
          method: "GET",
          headers: { origin: "https://game.example" },
        }),
      );
      assertEquals(response.status, 405, "status");
    });

    await t.step(
      "requires a bearer token before querying Supabase",
      async () => {
        const response = await handleRequest(
          new Request("https://edge.example/functions/v1/delete-account", {
            method: "POST",
            headers: { origin: "https://game.example" },
          }),
        );
        assertEquals(response.status, 401, "status");
        assertEquals(authRequests.length, 0, "authenticated user lookups");
      },
    );

    await t.step("rejects a token Supabase does not recognize", async () => {
      const response = await handleRequest(
        new Request("https://edge.example/functions/v1/delete-account", {
          method: "POST",
          headers: {
            origin: "https://game.example",
            authorization: "Bearer invalid-user-token",
          },
        }),
      );
      assertEquals(response.status, 401, "status");
      assertEquals(adminDeleteRequests.length, 0, "admin deletes");
    });

    await t.step(
      "deletes the authenticated user and ignores a client target id",
      async () => {
        const response = await handleRequest(
          new Request("https://edge.example/functions/v1/delete-account", {
            method: "POST",
            headers: {
              origin: "https://game.example",
              authorization: "Bearer valid-user-token",
              "content-type": "application/json",
            },
            body: JSON.stringify({
              user_id: "00000000-0000-4000-8000-000000000999",
            }),
          }),
        );
        const body = await response.json();
        assertEquals(response.status, 200, "status");
        assertEquals(body.status, "deleted", "response status");
        assertEquals(authRequests.length, 2, "authenticated user lookups");
        assertEquals(
          authRequests[1].authorization,
          "Bearer valid-user-token",
          "user token",
        );
        assertEquals(adminDeleteRequests.length, 1, "admin deletes");
        assertEquals(
          adminDeleteRequests[0].pathname,
          `/auth/v1/admin/users/${userId}`,
          "deleted account ID",
        );
        assertEquals(
          adminDeleteRequests[0].authorization,
          `Bearer ${serviceRoleKey}`,
          "admin authorization",
        );
        assertEquals(
          adminDeleteRequests[0].apikey,
          serviceRoleKey,
          "admin API key",
        );
      },
    );
  } finally {
    mockSupabase.shutdown();
    await mockSupabase.finished;
  }
});
