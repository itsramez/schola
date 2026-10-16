// Supabase Edge Function: delete-school-user
//
// Removes both the auth login and the profile row for a user — but only
// if the caller is an admin AND the target belongs to the caller's own
// school. Has to run server-side with the service-role key, same reason as
// create-school-user: deleting someone else's auth account isn't possible
// from the browser client.
//
// Deploy: supabase functions deploy delete-school-user

import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req: Request) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const json = (body: unknown, status: number) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const authHeader = req.headers.get("Authorization");
    const jwt = authHeader?.replace(/^Bearer\s+/i, "");
    if (!jwt) return json({ error: "Missing Authorization header" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: callerAuth, error: callerAuthError } = await admin.auth.getUser(jwt);
    if (callerAuthError || !callerAuth.user) return json({ error: "Invalid or expired session" }, 401);

    const { data: callerProfile, error: callerProfileError } = await admin
      .from("users")
      .select("role, school_id")
      .eq("id", callerAuth.user.id)
      .single();
    if (callerProfileError || !callerProfile) return json({ error: "Caller profile not found" }, 403);
    if (callerProfile.role !== "admin") return json({ error: "Only an admin can delete accounts" }, 403);

    const { id } = await req.json();
    if (!id) return json({ error: "id is required" }, 400);

    const { data: target, error: targetError } = await admin
      .from("users")
      .select("school_id")
      .eq("id", id)
      .single();
    if (targetError || !target) return json({ error: "User not found" }, 404);
    if (target.school_id !== callerProfile.school_id) {
      return json({ error: "You can only delete accounts in your own school" }, 403);
    }

    // Unlink any parent account pointing at this user first (e.g. deleting a
    // student who still has a linked parent) so the delete below doesn't hit
    // the linked_student_id foreign key constraint.
    await admin.from("users").update({ linked_student_id: null }).eq("linked_student_id", id);

    const { error: profileError } = await admin.from("users").delete().eq("id", id);
    if (profileError) return json({ error: profileError.message }, 400);

    const { error: authError } = await admin.auth.admin.deleteUser(id);
    if (authError) return json({ error: authError.message }, 400);

    return json({ success: true }, 200);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});
