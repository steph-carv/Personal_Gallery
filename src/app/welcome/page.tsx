import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { WelcomeForm } from "@/components/auth/WelcomeForm";
import { getViewer } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Welcome · Salon" };

/** First sign-in: choose the name in your gallery's link, and its title. */
export default function WelcomePage() {
  return (
    <main className="bg-ink text-cream grid min-h-dvh place-items-center px-4 py-12">
      <div className="w-full max-w-md">
        <p className="font-serif text-3xl font-semibold tracking-[0.22em]">SALON</p>
        <h1 className="mt-8 font-serif text-4xl italic">Welcome to your museum</h1>
        <p className="text-cream/75 mt-2 text-sm leading-relaxed">
          Three rooms are ready with famous works to start you off. Choose your gallery&apos;s
          address and name; you can change them later. Your gallery stays private until you decide
          to share it.
        </p>
        <Suspense fallback={<div className="mt-8 h-64" />}>
          <WelcomePanel />
        </Suspense>
      </div>
    </main>
  );
}

async function WelcomePanel() {
  if (!isSupabaseConfigured()) redirect("/");
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (viewer.onboarded) redirect(`/g/${viewer.username}`);

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("collection_name")
    .eq("id", viewer.id)
    .single();
  return (
    <WelcomeForm
      username={viewer.username}
      collectionName={data?.collection_name ?? "My Collection"}
    />
  );
}
