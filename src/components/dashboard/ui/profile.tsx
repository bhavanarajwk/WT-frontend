"use client";

import { useState } from "react";
import { formatUILabel } from "@/utils/titleCase";

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
  if (raw.startsWith("local://uploads/")) {
    const filename = raw.slice("local://uploads/".length);
    return `${base}/api/v1/profile/photo/${encodeURIComponent(filename)}`;
  }
  return raw.startsWith("/") ? `${base}${raw}` : `${base}/${raw}`;
}

export function readProfileField(
  profile: Record<string, unknown> | null | undefined,
  snakeKey: string,
  camelKey?: string
): string {
  if (!profile) return "";
  const camel = camelKey ?? snakeKey.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
  const value = profile[snakeKey] ?? profile[camel];
  if (value === null || value === undefined || value === "") return "";
  return String(value).trim();
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

async function downloadImage(src: string, filename: string) {
  const response = await fetch(src, { credentials: "include" });
  if (!response.ok) throw new Error("Unable to download profile image");
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
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
    <div className="flex flex-col items-center gap-2">
      <div
        className="h-28 w-28 shrink-0 overflow-hidden rounded-full border border-wt-border bg-wt-surface-2 flex items-center justify-center"
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

      {src && !imageFailed ? (
        <button
          type="button"
          className="btn-secondary text-xs px-3 py-1.5"
          onClick={() => void downloadImage(src, `${displayName.replace(/\s+/g, "_")}.jpg`)}
        >
          Download
        </button>
      ) : null}
    </div>
  );
}

function formatProfileFieldValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || "—";
  }
  if (Array.isArray(value)) {
    const parts = value.map((item) => String(item ?? "").trim()).filter(Boolean);
    return parts.length ? parts.join(", ") : "—";
  }
  return String(value);
}

export function ProfileField({
  label,
  value,
  fullWidth = false,
  link = false,
}: {
  label: string;
  value: unknown;
  fullWidth?: boolean;
  link?: boolean;
}) {
  const formatted = formatProfileFieldValue(value);
  const href = link && formatted !== "—" ? formatted : null;
  const spanClass = fullWidth ? "sm:col-span-2" : "";

  return (
    <div className={`flex items-baseline gap-x-4 gap-y-1 text-sm ${fullWidth ? "w-full" : ""} ${spanClass}`}>
      <dt className="w-40 shrink-0 text-wt-text-muted">{formatUILabel(label)}</dt>
      <dd className="min-w-0 flex-1 font-medium text-wt-text break-words">
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            {formatted}
          </a>
        ) : (
          formatted
        )}
      </dd>
    </div>
  );
}
