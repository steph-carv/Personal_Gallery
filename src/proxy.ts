import type { NextRequest } from "next/server";
import { refreshSession } from "@/lib/supabase/session";

/**
 * Runs before every page request (Next.js 16 calls middleware "proxy").
 * Its only job is keeping the Supabase sign-in session fresh; who can see
 * what is decided by the database's row-level security, not here.
 */
export async function proxy(request: NextRequest) {
  return refreshSession(request);
}

export const config = {
  matcher: [
    // Every path except static files, images and the painting images in /art.
    "/((?!_next/static|_next/image|favicon.ico|art/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
