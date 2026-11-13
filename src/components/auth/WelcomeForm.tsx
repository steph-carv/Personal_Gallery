"use client";

import { useActionState } from "react";
import { finishWelcome, type WelcomeState } from "@/app/welcome/actions";

export function WelcomeForm({
  username,
  collectionName,
}: {
  username: string;
  collectionName: string;
}) {
  const [state, save, saving] = useActionState<WelcomeState, FormData>(finishWelcome, {});
  const errors = state.errors ?? {};

  return (
    <form action={save} className="mt-8 flex flex-col gap-5" noValidate>
      {errors.form && (
        <p
          role="alert"
          className="rounded-sm border border-[#d98a7a]/50 bg-[#5e1d20]/40 p-3 text-sm"
        >
          {errors.form}
        </p>
      )}
      <Field
        id="username"
        label="Gallery address"
        prefix="salon/g/"
        defaultValue={username}
        hint="Letters, numbers and hyphens."
        error={errors.username}
        autoComplete="username"
      />
      <Field
        id="collectionName"
        label="Collection name"
        defaultValue={collectionName}
        hint='Shown at the top of your gallery, e.g. "The Carvalho Collection".'
        error={errors.collectionName}
      />
      <button
        type="submit"
        disabled={saving}
        className="bg-gilt text-ink focus-visible:outline-cream min-h-11 rounded-sm px-4 text-sm font-semibold transition hover:bg-[#e6c47a] focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60"
      >
        {saving ? "Opening your gallery…" : "Open my gallery"}
      </button>
    </form>
  );
}

function Field({
  id,
  label,
  prefix,
  defaultValue,
  hint,
  error,
  autoComplete,
}: {
  id: string;
  label: string;
  prefix?: string;
  defaultValue: string;
  hint: string;
  error?: string;
  autoComplete?: string;
}) {
  const describedBy = `${id}-hint${error ? ` ${id}-error` : ""}`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <div className="border-cream/30 focus-within:border-gilt flex min-h-11 items-center rounded-sm border">
        {prefix && <span className="text-cream/50 pl-3 text-sm">{prefix}</span>}
        <input
          id={id}
          name={id}
          defaultValue={defaultValue}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className="text-cream min-h-11 flex-1 bg-transparent px-3 focus-visible:outline-none"
        />
      </div>
      <p id={`${id}-hint`} className="text-cream/60 text-xs">
        {hint}
      </p>
      {error && (
        <p id={`${id}-error`} className="text-xs text-[#f0a898]">
          {error}
        </p>
      )}
    </div>
  );
}
