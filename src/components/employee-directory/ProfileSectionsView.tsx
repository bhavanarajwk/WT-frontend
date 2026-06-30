"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ProfileFieldGrid } from "@/components/employee-directory/ProfileFieldGrid";
import {
  buildProfileViewSections,
  type ProfileDisplaySection,
} from "@/utils/employeeDirectory";

export function ProfileSectionsView({
  profile,
  resumeShareHref,
  sections: sectionsOverride,
}: {
  profile: Record<string, unknown>;
  resumeShareHref?: string | null;
  sections?: ProfileDisplaySection[];
  layout?: "stack" | "split";
}) {
  const sections = sectionsOverride ?? buildProfileViewSections(profile, resumeShareHref);

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 xl:items-stretch">
      {sections.map((section) => (
        <Card key={section.title} className="flex h-full w-full flex-col p-0">
          <CardHeader className="px-5 py-3 sm:px-6">
            <CardTitle className="text-base">{section.title}</CardTitle>
          </CardHeader>
          <Separator />
          <CardContent className="flex flex-1 flex-col px-5 py-3 sm:px-6">
            <ProfileFieldGrid entries={section.entries} variant="table" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
