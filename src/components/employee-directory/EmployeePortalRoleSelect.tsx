"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { DropdownSelect } from "@/components/dashboard/ui/DropdownSelect";
import { AdaptiveSelectField } from "@/components/dashboard/ui/forms";
import { hrmsService } from "@/services/hrms.service";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import {
  PORTAL_ROLE_SELECT_OPTIONS,
  formatPrimaryPortalRoleLabel,
  normalizePortalRoles,
  pickPrimaryPortalRole,
} from "@/utils/roles";

type Props = {
  email: string;
  portalRoles: unknown;
  canEdit: boolean;
  compact?: boolean;
};

export function EmployeePortalRoleSelect({
  email,
  portalRoles,
  canEdit,
  compact = false,
}: Props) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const roles = useMemo(() => normalizePortalRoles(portalRoles), [portalRoles]);
  const currentRole = pickPrimaryPortalRole(roles);
  const displayLabel = formatPrimaryPortalRoleLabel(roles);
  const options = useMemo(
    () => PORTAL_ROLE_SELECT_OPTIONS.map((option) => ({ value: option.value, label: option.label })),
    []
  );

  const persistRole = async (nextRole: string) => {
    const targetEmail = email.trim();
    if (!targetEmail || !nextRole || nextRole === currentRole) return;
    setSaving(true);
    try {
      await hrmsService.setPortalRole({ target_email: targetEmail, role: nextRole });
      await queryClient.invalidateQueries({ queryKey: ["employee-directory", "onboard"] });
      await queryClient.invalidateQueries({ queryKey: ["employee-profile"] });
      showSuccessToast("Portal role updated successfully.");
    } catch (err) {
      showErrorToast(err instanceof Error ? err.message : "Could not update portal role.");
    } finally {
      setSaving(false);
    }
  };

  if (!canEdit) {
    return <span className="block truncate text-wt-text">{displayLabel}</span>;
  }

  if (compact) {
    return (
      <div
        className="min-w-[8.5rem] max-w-[11rem]"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <DropdownSelect
          value={currentRole}
          onChange={(next) => void persistRole(next)}
          options={options}
          disabled={saving}
          aria-label="Role"
          selectClassName="h-8 min-h-8 px-2.5 text-xs shadow-none"
        />
      </div>
    );
  }

  return (
    <div
      className="max-w-sm"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <AdaptiveSelectField
        label="Role"
        value={currentRole}
        placeholder="Select Role"
        options={[...PORTAL_ROLE_SELECT_OPTIONS]}
        disabled={saving}
        onChange={(next) => void persistRole(next)}
      />
    </div>
  );
}
