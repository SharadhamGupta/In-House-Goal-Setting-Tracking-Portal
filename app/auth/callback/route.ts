import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Fetch user profile to see what their role is and redirect them appropriately
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
        if (profile?.role) {
          if (profile.role === "admin") {
            return NextResponse.redirect(`${origin}/admin`);
          } else if (profile.role === "manager") {
            return NextResponse.redirect(`${origin}/manager`);
          } else {
            return NextResponse.redirect(`${origin}/employee`);
          }
        }
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=Could not authenticate user`);
}
