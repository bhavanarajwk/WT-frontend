/** Shared dashboard domain types (extend as modules are slimmed). */

export type DashboardRow = Record<string, unknown>;

export type TimelogSubTab = "my" | "team";
export type LeaveSubTab = "my" | "team";
export type AllocationHrSubTab = "project" | "allocate" | "list";

export type ThemePreference = "light" | "dark" | "system";
