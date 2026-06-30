"use client";

import type { ReactNode } from "react";
import { EmployeeProfileHeaderCard } from "@/components/employee-directory/EmployeeProfileHeaderCard";
import { ProfileSectionsView } from "@/components/employee-directory/ProfileSectionsView";
import { EmployeeTrainingMarksCard } from "@/components/learning-development/EmployeeTrainingMarksCard";
import { EmployeeLeaveBalancesCard } from "@/components/employee-directory/EmployeeLeaveBalancesCard";

type EmployeeProfileViewProps = {
  profile: Record<string, unknown>;
  displayName: string;
  designation: string;
  department: string;
  empId: string;
  empIdDisplay: string;
  email: string;
  phone: string;
  profileUserId: string;
  resumeShareHref?: string | null;
  queriesEnabled: boolean;
  headerAction?: ReactNode;
};

export function EmployeeProfileView({
  profile,
  displayName,
  designation,
  department,
  empId,
  empIdDisplay,
  email,
  phone,
  profileUserId,
  resumeShareHref,
  queriesEnabled,
  headerAction,
}: EmployeeProfileViewProps) {
  return (
    <div className="w-full space-y-4">
      <EmployeeProfileHeaderCard
        profile={profile}
        displayName={displayName}
        designation={designation}
        department={department}
        empId={empIdDisplay}
        email={email}
        phone={phone}
        resumeShareHref={resumeShareHref}
        headerAction={headerAction}
      />

      <ProfileSectionsView profile={profile} resumeShareHref={resumeShareHref} />

      <EmployeeTrainingMarksCard
        variant="hr"
        targetUserId={profileUserId}
        targetEmail={email}
        enabled={queriesEnabled && Boolean(profileUserId)}
      />

      <EmployeeLeaveBalancesCard empId={empId} enabled={queriesEnabled} />
    </div>
  );
}
