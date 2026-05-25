export function applyTheme(nextTheme: "light" | "dark" | "system") {
  const root = document.documentElement;
  if (nextTheme === "system") {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.setAttribute("data-theme", prefersDark ? "dark" : "light");
  } else {
    root.setAttribute("data-theme", nextTheme);
  }
  window.localStorage.setItem("wt-theme", nextTheme);
}
