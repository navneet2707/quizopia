import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } =
      await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return json({ error: "Unauthorized" }, 401);
    }
    const userId = claimsData.claims.sub as string;

    const body = await req.json().catch(() => ({}));
    const role = body?.role;
    const code = typeof body?.code === "string" ? body.code.trim() : "";

    if (role !== "admin" && role !== "head_admin") {
      return json({ error: "Invalid role" }, 400);
    }
    if (!code) {
      return json({ error: "Access code is required" }, 400);
    }

    const expected =
      role === "head_admin"
        ? Deno.env.get("HEAD_ADMIN_ACCESS_CODE")
        : Deno.env.get("ADMIN_ACCESS_CODE");

    if (!expected || code !== expected) {
      return json({ error: "Invalid access code" }, 403);
    }

    // Use service role to update the role (bypasses RLS)
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { error: delErr } = await admin
      .from("user_roles")
      .delete()
      .eq("user_id", userId);
    if (delErr) return json({ error: delErr.message }, 500);

    const { error: insErr } = await admin
      .from("user_roles")
      .insert({ user_id: userId, role });
    if (insErr) return json({ error: insErr.message }, 500);

    return json({ success: true, role });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
