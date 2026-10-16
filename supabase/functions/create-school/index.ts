// Supabase Edge Function: create-school
//
// Operator-only tool for onboarding a brand-new school: creates the
// `schools` row and that school's first admin account together. There's no
// existing admin to authenticate as at this point (the school doesn't exist
// yet), so this is gated by a shared secret instead of a user JWT — it is
// never called from the app's UI, only by whoever runs the platform when
// bringing a new school on.
//
// Deploy: supabase functions deploy create-school
// Requires secrets SUPABASE_SERVICE_ROLE_KEY and PLATFORM_PROVISION_SECRET.
//
// Usage:
//   curl -X POST https://<project>.supabase.co/functions/v1/create-school \
//     -H "apikey: <anon key>" \
//     -H "x-provision-secret: <PLATFORM_PROVISION_SECRET>" \
//     -H "Content-Type: application/json" \
//     -d '{"schoolName":"Riverside High","adminName":"Jane Doe","adminEmail":"jane@riverside.edu","adminPassword":"..."}'

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

    const { schoolName, adminName, adminEmail, adminPassword } = await req.json();
    if (!schoolName || !adminName || !adminEmail || !adminPassword) {
      return json({ error: "schoolName, adminName, adminEmail, and adminPassword are required" }, 400);
    }
    if (String(adminPassword).length < 6) {
      return json({ error: "adminPassword must be at least 6 characters" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: school, error: schoolError } = await admin
      .from("schools")
      .insert([{ name: schoolName }])
      .select()
      .single();
    if (schoolError || !school) {
      return json({ error: schoolError?.message ?? "Failed to create school" }, 400);
    }

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
    });
    if (createError || !created.user) {
      await admin.from("schools").delete().eq("id", school.id);
      return json({ error: createError?.message ?? "Failed to create admin auth user" }, 400);
    }

    const { data: profile, error: profileError } = await admin
      .from("users")
      .insert([
        {
          id: created.user.id,
          name: adminName,
          email: adminEmail,
          role: "admin",
          school_id: school.id,
        },
      ])
      .select()
      .single();

    if (profileError) {
      await admin.auth.admin.deleteUser(created.user.id);
      await admin.from("schools").delete().eq("id", school.id);
      return json({ error: profileError.message }, 400);
    }

    return json({ school, admin: profile }, 200);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});
