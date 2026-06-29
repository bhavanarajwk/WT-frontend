"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { EmployeeStatusBadge } from "@/components/employee-directory/EmployeeStatusBadge";
import { resolveProfilePhotoSrc } from "@/components/dashboard/ui/profile";
import { EmployeeResumeLink } from "@/components/resumes/EmployeeResumeLink";
import {
  formatProfileDisplayValue,
  pickProfileField,
} from "@/utils/employeeDirectory";
import { FileText, Mail, Phone } from "lucide-react";

function ProfileHeaderAvatar({
  profile,
  displayName,
}: {
  profile: Record<string, unknown>;
  displayName: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const photoSrc = resolveProfilePhotoSrc(profile);
  const initial = (displayName.charAt(0) || "?").toUpperCase();

  return (
    <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-wt-border bg-wt-surface-2 sm:h-[5.5rem] sm:w-[5.5rem]">
      {photoSrc && !imageFailed ? (
        <img
          src={photoSrc}
          alt={`${displayName} profile`}
          className="h-full w-full object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span className="text-2xl font-semibold text-wt-text-muted">{initial}</span>
      )}
    </div>
  );
}

function InlineMetaItem({
  icon,
  label,
  value,
}: {
  icon?: ReactNode;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="inline-flex min-w-0 max-w-full items-center gap-1.5">
      {icon ? <span className="shrink-0 text-wt-text-muted/80">{icon}</span> : null}
      <span className="shrink-0 text-wt-text-muted">{label}:</span>
      <span className="min-w-0 font-medium text-wt-text break-all">{value}</span>
    </div>
  );
}

export function EmployeeProfileHeaderCard({
  profile,
  displayName,
  designation,
  department,
  empId,
  email,
  phone,
  resumeShareHref,
  headerAction,
  editModeLabel,
}: {
  profile: Record<string, unknown>;
  displayName: string;
  designation: string;
  department: string;
  empId: string;
  email: string;
  phone: string;
  resumeShareHref?: string | null;
  headerAction?: ReactNode;
  editModeLabel?: string | null;
}) {
  const roleLine =
    designation ||
    formatProfileDisplayValue(
      pickProfileField(profile, ["role", "designation", "designation_name"])
    );
  const departmentLine =
    department || formatProfileDisplayValue(pickProfileField(profile, ["department"]));
  const subtitle = [roleLine !== "—" ? roleLine : "", departmentLine !== "—" ? departmentLine : ""]
    .filter(Boolean)
    .join(" · ");

  const status = String(
    pickProfileField(profile, ["user_status", "status", "userStatus"]) ?? ""
  ).trim();

  const metaItems = [
    {
      key: "emp-id",
      label: "Employee ID",
      value: empId,
    },
    {
      key: "email",
      icon: <Mail className="h-3.5 w-3.5" aria-hidden />,
      label: "Email",
      value: email ? (
        <a href={`mailto:${email}`} className="text-blue-600 hover:underline">
          {email}
        </a>
      ) : (
        "—"
      ),
    },
    {
      key: "phone",
      icon: <Phone className="h-3.5 w-3.5" aria-hidden />,
      label: "Phone",
      value:
        phone && phone !== "—" ? (
          <a href={`tel:${phone}`} className="hover:underline">
            {phone}
          </a>
        ) : (
          "—"
        ),
    },
    {
      key: "resume",
      icon: <FileText className="h-3.5 w-3.5" aria-hidden />,
      label: "Resume",
      value: <EmployeeResumeLink href={resumeShareHref} />,
    },
  ];

  return (
    <Card className="w-full p-0">
      <CardContent className="px-5 py-4 sm:px-6">
        <div className="flex items-start gap-4 sm:gap-5">
          <ProfileHeaderAvatar profile={profile} displayName={displayName} />

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {editModeLabel ? (
                  <span className="mb-1.5 inline-flex rounded-md bg-blue-600 px-2 py-0.5 text-xs font-semibold text-white">
                    {editModeLabel}
                  </span>
                ) : null}
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-bold tracking-tight text-wt-text sm:text-2xl">
                    {displayName}
                  </h1>
                  {status ? <EmployeeStatusBadge status={status} /> : null}
                </div>
                {subtitle ? (
                  <p className="mt-0.5 text-sm text-wt-text-muted">{subtitle}</p>
                ) : null}
              </div>
              {headerAction ? <div className="shrink-0">{headerAction}</div> : null}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-wt-border pt-3 text-sm">
              {metaItems.map((item, index) => (
                <div key={item.key} className="flex min-w-0 items-center gap-4">
                  {index > 0 ? (
                    <span className="hidden text-wt-border sm:inline" aria-hidden>
                      |
                    </span>
                  ) : null}
                  <InlineMetaItem icon={item.icon} label={item.label} value={item.value} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
