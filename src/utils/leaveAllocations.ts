import { isStaffingProjectTypeCode } from "@/utils/projectTypes";
import { pickRowField } from "@/utils/compOff";

/** Client approval required when on active staffing/client allocation. */
export function activeAllocationsRequireClientApproval(
  rows: Array<Record<string, unknown>>
): boolean {
  return rows.some((row) => {
    const active = row.is_active !== false && row.isActive !== false;
    if (!active) return false;
    const allocationType = String(
      pickRowField(row, "allocation_type", "allocationType") ?? ""
    ).toUpperCase();
    if (allocationType === "STAFFING") return true;
    const projectType = String(
      pickRowField(row, "project_type", "projectType") ?? ""
    ).toUpperCase();
    return isStaffingProjectTypeCode(projectType);
  });
}
