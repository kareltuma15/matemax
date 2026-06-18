export type Theme = "light" | "dark";

const KEY = "matemax-theme";

export function getTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = localStorage.getItem(KEY);
  if (stored === "dark" || stored === "light") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(theme: Theme) {
  if (theme === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
}

export function setTheme(theme: Theme) {
  localStorage.setItem(KEY, theme);
  applyTheme(theme);
}

export function toggleTheme(): Theme {
  const next = getTheme() === "dark" ? "light" : "dark";
  setTheme(next);
  return next;
}

// Dark mode temporarily disabled — always enforce light
// To re-enable: restore the original THEME_SCRIPT with dark branch
export const THEME_SCRIPT = `(function(){try{localStorage.removeItem('matemax-theme');document.documentElement.removeAttribute('data-theme');}catch(e){}})();`;
