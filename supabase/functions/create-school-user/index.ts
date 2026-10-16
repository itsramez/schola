// Supabase Edge Function: create-school-user
//
// Creates a real, login-capable account (auth user + profile row) for a
// student, teacher, parent, or admin, inside the CALLING ADMIN's own school.
// Runs server-side with the service-role key, which is why this can't live
// in the browser: it must be able to create a confirmed login for someone
// else without touching the calling admin's own session (client-side
// supabase.auth.signUp() always operates on the current browser's session,
// which would log the admin out).
//
// Only an authenticated admin may call this, and the new account always
// lands in that admin's own school_id — the caller cannot choose a
// different school, which is what keeps every school's roster isolated.
//
// Deploy: supabase functions deploy create-school-user
// Requires the secret SUPABASE_SERVICE_ROLE_KEY to be set (see README steps).

import { createClient } from "jsr:@supabase/supabase-js@2";

const ALLOWED_ROLES = ["admin", "teacher", "parent", "student"];

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
    if (callerProfile.role !== "admin") return json({ error: "Only an admin can create accounts" }, 403);

    const body = await req.json();
    const {
      name,
      email,
      password,
      role,
      subject_name = null,
      grade = null,
      section = null,
      section_id = null,
      guardian_name = null,
      linked_student_id = null,
    } = body;

    if (!name || !email || !password || !role) {
      return json({ error: "name, email, password, and role are required" }, 400);
    }
    if (!ALLOWED_ROLES.includes(role)) {
      return json({ error: `role must be one of ${ALLOWED_ROLES.join(", ")}` }, 400);
    }
    if (String(password).length < 6) {
      return json({ error: "password must be at least 6 characters" }, 400);
    }

    // If linking a parent to a student, the student must belong to the same school.
    if (linked_student_id) {
      const { data: linkedStudent } = await admin
        .from("users")
        .select("school_id")
        .eq("id", linked_student_id)
        .single();
      if (!linkedStudent || linkedStudent.school_id !== callerProfile.school_id) {
        return json({ error: "linked_student_id must belong to your own school" }, 400);
      }
    }

    // A chosen class section must belong to the caller's own school.
    if (section_id) {
      const { data: sectionRow } = await admin
        .from("class_sections")
        .select("school_id")
        .eq("id", section_id)
        .single();
      if (!sectionRow || sectionRow.school_id !== callerProfile.school_id) {
        return json({ error: "section_id must belong to your own school" }, 400);
      }
    }

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // no confirmation email needed — the admin hands the password to the person directly
    });
    if (createError || !created.user) {
      return json({ error: createError?.message ?? "Failed to create auth user" }, 400);
    }

    const { data: profile, error: profileError } = await admin
      .from("users")
      .insert([
        {
          id: created.user.id,
          name,
          email,
          role,
          subject_name,
          grade,
          section,
          section_id,
          guardian_name,
          linked_student_id,
          school_id: callerProfile.school_id, // always the caller's own school — never client-chosen
        },
      ])
      .select()
      .single();

    if (profileError) {
      // Roll back the auth user so we don't leave an orphaned login with no profile.
      await admin.auth.admin.deleteUser(created.user.id);
      return json({ error: profileError.message }, 400);
    }

    return json({ user: profile }, 200);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});
