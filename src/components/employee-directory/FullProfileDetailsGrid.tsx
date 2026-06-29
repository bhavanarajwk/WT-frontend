"use client";

import { ProfileSectionsView } from "@/components/employee-directory/ProfileSectionsView";
import { buildGroupedProfileSections } from "@/utils/employeeDirectory";

/** @deprecated Use ProfileSectionsView for the directory profile layout. */
export function FullProfileDetailsGrid({
  profile,
  resumeShareHref,
}: {
  profile: Record<string, unknown>;
  resumeShareHref?: string | null;
  scrollChain?: boolean;
}) {
  return (
    <ProfileSectionsView
      profile={profile}
      resumeShareHref={resumeShareHref}
      sections={buildGroupedProfileSections(profile, resumeShareHref)}
    />
  );
}
