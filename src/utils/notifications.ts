import type { NotificationItem } from "@/services/hrms.service";
import { toRows } from "@/utils/apiRows";

export function parseNotificationItems(input: unknown): NotificationItem[] {
  if (Array.isArray(input)) {
    return input as NotificationItem[];
  }
  if (input && typeof input === "object") {
    const record = input as Record<string, unknown>;
    if (Array.isArray(record.items)) {
      return record.items as NotificationItem[];
    }
    const nested = record.data;
    if (nested && typeof nested === "object" && Array.isArray((nested as { items?: unknown }).items)) {
      return (nested as { items: NotificationItem[] }).items;
    }
  }
  return toRows(input) as unknown as NotificationItem[];
}

export function formatNotificationTimestamp(value: string | undefined): string {
  if (!value?.trim()) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function notificationRowId(row: NotificationItem | Record<string, unknown>): string {
  const raw = row.id ?? (row as Record<string, unknown>).notification_id ?? (row as Record<string, unknown>).notificationId;
  return String(raw ?? "").trim();
}

export function notificationIsRead(row: NotificationItem | Record<string, unknown>): boolean {
  return Boolean(row.is_read ?? (row as Record<string, unknown>).isRead ?? false);
}

export function notificationMessage(row: NotificationItem | Record<string, unknown>): string {
  const message = String(row.message ?? (row as Record<string, unknown>).body ?? "").trim();
  if (message) return message;
  return String(row.title ?? "").trim() || "—";
}

export function notificationTitle(row: NotificationItem | Record<string, unknown>): string {
  return String(row.title ?? "").trim();
}
