import { toast } from "sonner";

export const TOAST_DURATION_MS = 2800;

export function showSuccessToast(message: string) {
  toast.success(message, { duration: TOAST_DURATION_MS });
}

export function showErrorToast(message: string) {
  toast.error(message, { duration: TOAST_DURATION_MS });
}
