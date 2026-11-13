import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import { getViewer, homeFor } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = { title: "Sign in · Salon" };

const ERRORS: Record<string, string> = {
  not_invited: "Salon is invite-only for now, and that account isn't on the guest list.",
  link: "That sign-in link has expired or was opened in a different browser. Request a new one below.",
  failed: "Signing in didn't work. Please try again.",
  not_configured: "Sign-in isn't set up yet.",
};

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="bg-ink text-cream grid min-h-dvh place-items-center px-4 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="font-serif text-3xl font-semibold tracking-[0.22em]">
          SALON
        </Link>
        <h1 className="mt-8 font-serif text-4xl italic">Sign in</h1>
        <p className="text-cream/70 mt-2 text-sm">
          Your own museum: walk it, hang it, share it. Salon is invite-only at the moment.
        </p>
        {/* Reads the session and the URL, so it waits inside Suspense. */}
        <Suspense fallback={<div className="mt-8 h-56" />}>
          <LoginPanel searchParams={searchParams} />
        </Suspense>
        <p className="text-cream/60 mt-10 text-sm">
          Just looking?{" "}
          <Link href="/g/demo" className="text-gilt underline underline-offset-2">
            Walk the demo gallery
          </Link>
        </p>
      </div>
    </main>
  );
}

async function LoginPanel({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const viewer = await getViewer();
  if (viewer) redirect(homeFor(viewer));
  const { error } = await searchParams;
  const message = typeof error === "string" ? (ERRORS[error] ?? ERRORS.failed) : undefined;

  if (!isSupabaseConfigured()) {
    return (
      <p className="border-cream/20 text-cream/80 mt-8 rounded-sm border p-4 text-sm">
        Sign-in isn&apos;t set up on this copy of Salon yet (no Supabase project). See the README.
      </p>
    );
  }
  return <LoginForm initialError={message} />;
}
