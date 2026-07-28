export type Theme = "light" | "dark";

const KEY = "matemax-theme";

export function getTheme(): Theme {
  if (typeof window === "undefined") return "light";
  // Dark je opt-in přes přepínač v profilu — nevnucujeme ho podle OS, dokud
  // není doladěný. Kdo si ho zapne, dostane ho; ostatní zůstávají ve světlém.
  return localStorage.getItem(KEY) === "dark" ? "dark" : "light";
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

// Aplikuje uložené téma před prvním vykreslením (žádné bliknutí). Dark jen
// když si ho žák výslovně zapnul; jinak světlé.
export const THEME_SCRIPT = `(function(){try{if(localStorage.getItem('matemax-theme')==='dark'){document.documentElement.setAttribute('data-theme','dark');}}catch(e){}})();`;
