// Supabase Edge Function: create-owner
//
// Operator-only tool for provisioning the platform owner account — the single
// login that sees every school and toggles per-school feature flags. There's
// no admin/owner to authenticate as yet, so this is gated by the same shared
// secret as create-school, never called from the app's UI.
//
// Deploy: supabase functions deploy create-owner
// Requires secrets SUPABASE_SERVICE_ROLE_KEY and PLATFORM_PROVISION_SECRET.
//
// Usage:
//   curl -X POST https://<project>.supabase.co/functions/v1/create-owner \
//     -H "apikey: <anon key>" \
//     -H "x-provision-secret: <PLATFORM_PROVISION_SECRET>" \
//     -H "Content-Type: application/json" \
//     -d '{"name":"Jane Doe","email":"jane@schola.app","password":"..."}'

import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req: Request) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-provision-secret",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const json = (body: unknown, status: number) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const expectedSecret = Deno.env.get("PLATFORM_PROVISION_SECRET");
    const providedSecret = req.headers.get("x-provision-secret");
    if (!expectedSecret || providedSecret !== expectedSecret) {
      return json({ error: "Unauthorized" }, 401);
    }

    const { name, email, password } = await req.json();
    if (!name || !email || !password) {
      return json({ error: "name, email, and password are required" }, 400);
    }
    if (String(password).length < 6) {
      return json({ error: "password must be at least 6 characters" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createError || !created.user) {
      return json({ error: createError?.message ?? "Failed to create auth user" }, 400);
    }

    const { data: owner, error: ownerError } = await admin
      .from("owners")
      .insert([{ id: created.user.id, name, email }])
      .select()
      .single();

    if (ownerError) {
      await admin.auth.admin.deleteUser(created.user.id);
      return json({ error: ownerError.message }, 400);
    }

    return json({ owner }, 200);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});
