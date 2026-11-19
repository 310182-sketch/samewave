import { createClient } from "https://esm.sh/@supabase/supabase-js@2.119.2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const allowedOrigins = new Set(
  (Deno.env.get("ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
);

function corsHeaders(origin: string) {
  const headers = new Headers({
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  });
  if (allowedOrigins.has(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
  }
  return headers;
}

function jsonResponse(
  origin: string,
  status: number,
  body: Record<string, string>,
) {
  const headers = corsHeaders(origin);
  headers.set("Content-Type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(body), { status, headers });
}

export async function handleRequest(request: Request): Promise<Response> {
  const origin = request.headers.get("origin") ?? "";
  const headers = corsHeaders(origin);

  if (request.method === "OPTIONS") {
    if (!allowedOrigins.has(origin)) {
      return new Response(null, { status: 403, headers });
    }
    return new Response("ok", { headers });
  }
  if (!allowedOrigins.has(origin)) {
    return jsonResponse(origin, 403, {
      error: "This website is not allowed to delete accounts.",
    });
  }
  if (request.method !== "POST") {
    return jsonResponse(origin, 405, { error: "Method not allowed." });
  }
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse(origin, 500, {
      error: "Account deletion is not configured.",
    });
  }

  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return jsonResponse(origin, 401, { error: "Authentication required." });
  }

  try {
    const userClient = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: authorization } },
    });
    const { data, error: userError } = await userClient.auth.getUser();
    if (userError || !data.user) {
      return jsonResponse(origin, 401, { error: "Authentication required." });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(
      data.user.id,
    );
    if (deleteError) {
      console.error(
        "Account deletion failed",
        deleteError.code ?? "unknown error",
      );
      return jsonResponse(origin, 500, {
        error: "Account deletion could not be completed.",
      });
    }

    return jsonResponse(origin, 200, { status: "deleted" });
  } catch {
    return jsonResponse(origin, 500, {
      error: "Account deletion could not be completed.",
    });
  }
}

if (import.meta.main) {
  Deno.serve(handleRequest);
}
