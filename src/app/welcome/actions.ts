"use server";

import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth";
import { collectionNameSchema, usernameSchema } from "@/lib/gallery/schemas";
import { createClient } from "@/lib/supabase/server";

export interface WelcomeState {
  errors?: { username?: string; collectionName?: string; form?: string };
}

/** Save the chosen username and collection name, then open the gallery. */
export async function finishWelcome(_: WelcomeState, formData: FormData): Promise<WelcomeState> {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");

  const username = usernameSchema.safeParse(formData.get("username") ?? "");
  const collectionName = collectionNameSchema.safeParse(formData.get("collectionName") ?? "");
  if (!username.success || !collectionName.success) {
    return {
      errors: {
        username: username.error?.issues[0].message,
        collectionName: collectionName.error?.issues[0].message,
      },
    };
  }

  const supabase = await createClient();
  // Row-level security only lets you update your own profile.
  const { error } = await supabase
    .from("profiles")
    .update({ username: username.data, collection_name: collectionName.data, onboarded: true })
    .eq("id", viewer.id);
  if (error) {
    // 23505: unique_violation (someone already has that username).
    if (error.code === "23505")
      return { errors: { username: "That username is taken. Try another." } };
    return { errors: { form: "Couldn't save that. Please try again." } };
  }
  redirect(`/g/${username.data}`);
}
