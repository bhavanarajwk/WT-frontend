"use client";

import { useState } from "react";
import { resolveProfilePhotoSrc } from "@/components/dashboard/ui/profile";
import {
  formatProfileDisplayValue,
  pickEmployeeRole,
  pickProfileField,
} from "@/utils/employeeDirectory";

export function EmployeeProfileSummaryCard({
  profile,
  displayName,
  designation,
  email,
}: {
  profile: Record<string, unknown>;
  displayName: string;
  designation: string;
  department: string;
  email: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const photoSrc = resolveProfilePhotoSrc(profile);
  const initial = (displayName.charAt(0) || "?").toUpperCase();
  const phone = formatProfileDisplayValue(
    pickProfileField(profile, ["phone_number", "phoneNumber"])
  );
  const roleLine = designation || pickEmployeeRole(profile) || "—";
  const status = String(
    pickProfileField(profile, ["user_status", "status", "userStatus"]) ?? ""
  ).trim();

  return (
    <aside className="rounded-xl border border-wt-border bg-wt-surface-1 shadow-sm h-fit xl:sticky xl:top-24">
      <div className="border-b border-wt-border px-5 py-4">
        {status ? (
          <span className="inline-flex rounded-md border border-wt-border bg-wt-surface-2 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-wt-text-muted">
            {status}
          </span>
        ) : null}
      </div>

      <div className="flex flex-col items-center px-5 pb-4 pt-6">
        <div className="h-28 w-28 overflow-hidden rounded-full border border-wt-border bg-wt-surface-2">
          {photoSrc && !imageFailed ? (
            <img
              src={photoSrc}
              alt={`${displayName} profile`}
              className="h-full w-full object-cover"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-wt-surface-2 text-2xl font-semibold text-wt-text-muted">
              {initial}
            </div>
          )}
        </div>
        <p className="mt-4 text-base font-semibold text-wt-text">{displayName}</p>
        <p className="mt-0.5 text-sm text-wt-text-muted">{roleLine}</p>
      </div>

      <ul className="space-y-0 border-t border-wt-border text-sm">
        <li className="flex items-center justify-between gap-3 border-b border-wt-border px-5 py-3">
          <span className="text-wt-text-muted">Employee ID</span>
          <span className="font-medium text-right">
            {formatProfileDisplayValue(pickProfileField(profile, ["emp_id", "empId"]))}
          </span>
        </li>
        <li className="flex items-center justify-between gap-3 border-b border-wt-border px-5 py-3">
          <span className="text-wt-text-muted">User type</span>
          <span className="font-medium text-right">
            {formatProfileDisplayValue(pickProfileField(profile, ["user_type", "userType"]))}
          </span>
        </li>
        <li className="flex items-center justify-between gap-3 border-b border-wt-border px-5 py-3">
          <span className="text-wt-text-muted">Work mode</span>
          <span className="font-medium text-right">
            {formatProfileDisplayValue(pickProfileField(profile, ["work_mode", "workMode"]))}
          </span>
        </li>
        <li className="flex items-center justify-between gap-3 px-5 py-3">
          <span className="text-wt-text-muted">Location</span>
          <span className="font-medium text-right">
            {formatProfileDisplayValue(
              pickProfileField(profile, [
                "work_location",
                "work_location_type",
                "workLocationType",
              ])
            )}
          </span>
        </li>
      </ul>

      {(email || (phone && phone !== "—")) && (
        <div className="border-t border-wt-border px-5 py-4 text-sm space-y-1.5">
          {email ? (
            <a href={`mailto:${email}`} className="block truncate text-wt-text hover:underline">
              {email}
            </a>
          ) : null}
          {phone && phone !== "—" ? (
            <a href={`tel:${phone}`} className="block text-wt-text hover:underline">
              {phone}
            </a>
          ) : null}
        </div>
      )}
    </aside>
  );
}
