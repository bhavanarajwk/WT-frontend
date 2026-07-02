export function themeInitScript() {
  return `(function(){try{var s=localStorage.getItem("wt-theme");var d=s==="dark"||(s==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);if(s==="light")d=false;document.documentElement.setAttribute("data-theme",d?"dark":"light");document.documentElement.classList.toggle("dark",d);}catch(e){}})();`;
}
