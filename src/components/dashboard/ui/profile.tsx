"use client";

import { useState } from "react";

export function resolveProfilePhotoSrc(profile: Record<string, unknown> | null | undefined): string | null {
  if (!profile) return null;
  const raw = String(
    profile.profile_photo_url ??
      profile.profilePhotoUrl ??
      profile.profile_pic_url ??
      profile.profilePicUrl ??
      profile.photo_url ??
      profile.photoUrl ??
      profile.avatar_url ??
      profile.avatarUrl ??
      profile.image_url ??
      profile.imageUrl ??
      profile.profile_photo ??
      profile.profilePhoto ??
      ""
  ).trim();
  if (!raw) return null;
  if (raw.startsWith("http://") || raw.startsWith("https://") || raw.startsWith("data:")) {
    return raw;
  }
  const base = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080").replace(/\/$/, "");
  return raw.startsWith("/") ? `${base}${raw}` : `${base}/${raw}`;
}

export function formatSecondarySkillsForProfile(profile: Record<string, unknown> | null | undefined): string {
  if (!profile) return "—";
  const raw =
    profile.secondary_skills ?? profile.secondarySkills ?? profile.secondary_skill;
  if (Array.isArray(raw)) {
    const parts = raw
      .map((item) => {
        if (item && typeof item === "object") {
          const rec = item as Record<string, unknown>;
          const skill = String(rec.skill ?? rec.name ?? "").trim();
          const rating = rec.rating ?? rec.level;
          if (!skill) return "";
          return rating !== undefined && String(rating).trim() !== ""
            ? `${skill} (${String(rating)}/5)`
            : skill;
        }
        return String(item ?? "").trim();
      })
      .filter(Boolean);
    return parts.length ? parts.join(", ") : "—";
  }
  const single = String(raw ?? "").trim();
  return single || "—";
}

export function ProfilePhotoAvatar({
  profile,
  fallbackName,
}: {
  profile: Record<string, unknown> | null | undefined;
  fallbackName?: string | null;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const src = resolveProfilePhotoSrc(profile);
  const displayName = String(profile?.name ?? fallbackName ?? "User").trim();
  const initial = (displayName.charAt(0) || "?").toUpperCase();

  return (
    <div
      className="h-28 w-28 shrink-0 overflow-hidden rounded-2xl border border-wt-border bg-wt-surface-2 flex items-center justify-center"
      aria-hidden={!src || imageFailed}
    >
      {src && !imageFailed ? (
        <img
          src={src}
          alt={`${displayName} profile photo`}
          className="h-full w-full object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span className="text-3xl font-semibold text-wt-text-muted">{initial}</span>
      )}
    </div>
  );
}

export function ProfileField({
  label,
  value,
  fullWidth = false,
}: {
  label: string;
  value: unknown;
  fullWidth?: boolean;
}) {
  const spanClass = fullWidth ? "sm:col-span-2" : "";
  return (
    <>
      <dt className={`text-wt-text-muted ${spanClass}`}>{label}</dt>
      <dd className={`font-medium ${spanClass}`}>{value ? String(value) : "—"}</dd>
    </>
  );
}
