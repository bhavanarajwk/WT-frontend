export type ResolvedTheme = "light" | "dark";

export function resolveThemePreference(
  preference: "light" | "dark" | "system" | null | undefined
): ResolvedTheme {
  if (preference === "dark") return "dark";
  if (preference === "light") return "light";
  if (typeof window !== "undefined" && preference === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  if (typeof window !== "undefined") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return "light";
}

export function readStoredThemePreference(): "light" | "dark" | "system" {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem("wt-theme");
  if (stored === "dark" || stored === "light" || stored === "system") return stored;
  return "light";
}

export function readStoredTheme(): ResolvedTheme {
  return resolveThemePreference(readStoredThemePreference());
}

export function applyResolvedTheme(resolved: ResolvedTheme) {
  const root = document.documentElement;
  root.setAttribute("data-theme", resolved);
  root.classList.toggle("dark", resolved === "dark");
}

export function applyTheme(nextTheme: "light" | "dark" | "system") {
  applyResolvedTheme(resolveThemePreference(nextTheme));
  window.localStorage.setItem("wt-theme", nextTheme);
}
