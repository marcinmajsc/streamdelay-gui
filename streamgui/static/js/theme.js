/*
Created: 2026-01-02
Author: @marcinmajsc
Repository: https://github.com/marcinmajsc/streamdelay-gui
*/

(function(){
  const root = document.documentElement;
  const ddBtn = document.getElementById("ddBtn");
  const ddMenu = document.getElementById("ddMenu");
  const ddState = document.getElementById("ddState");
  const stateIcon = document.getElementById("stateIcon");
  const mAuto = document.getElementById("mAuto");
  const mLight = document.getElementById("mLight");
  const mDark = document.getElementById("mDark");

  function sysPref(){
    return (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light";
  }

  function iconFor(mode){
    if (!stateIcon || !ddState) return;
    if (mode === "auto") {
      stateIcon.innerHTML = '<path fill="currentColor" d="M12 2a10 10 0 1 0 0 20a10 10 0 0 0 0-20Zm0 18a8 8 0 1 1 0-16a8 8 0 0 1 0 16Zm0-12a4 4 0 1 0 0 8a4 4 0 0 0 0-8Z"/>';
      ddState.textContent = "Auto";
      return;
    }
    if (mode === "light") {
      stateIcon.innerHTML = '<path fill="currentColor" d="M12 18a6 6 0 1 0 0-12a6 6 0 0 0 0 12Zm0-14h0.01ZM12 22h0.01ZM2 12h0.01ZM22 12h0.01ZM4.22 4.22h0.01ZM19.78 19.78h0.01ZM4.22 19.78h0.01ZM19.78 4.22h0.01"/>';
      ddState.textContent = "Light";
      return;
    }
    stateIcon.innerHTML = '<path fill="currentColor" d="M21 14.5A7.5 7.5 0 0 1 9.5 3a8.5 8.5 0 1 0 11.5 11.5Z"/>';
    ddState.textContent = "Dark";
  }

  function setActive(mode){
    if (!mAuto || !mLight || !mDark) return;
    mAuto.classList.toggle("active", mode === "auto");
    mLight.classList.toggle("active", mode === "light");
    mDark.classList.toggle("active", mode === "dark");
  }

  function apply(mode){
    let actual = mode === "auto" ? sysPref() : mode;
    root.setAttribute("data-theme", actual);
    setActive(mode);
    iconFor(mode);
    try { localStorage.setItem("theme_mode", mode); } catch(e) {}
  }

  function openMenu(open){
    if (!ddMenu) return;
    ddMenu.classList.toggle("open", !!open);
    if (ddBtn) ddBtn.setAttribute("aria-expanded", !!open ? "true" : "false");
  }
  function toggleMenu(){
    if (!ddMenu) return;
    openMenu(!ddMenu.classList.contains("open"));
  }

  // init
  (function initTheme(){
    let mode = "auto";
    try{
      const m = localStorage.getItem("theme_mode");
      if (m === "auto" || m === "light" || m === "dark") mode = m;
    }catch(e){}
    apply(mode);

    if (window.matchMedia) {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      mq.addEventListener?.("change", () => {
        let m = null;
        try { m = localStorage.getItem("theme_mode"); } catch(e) {}
        if (m === "auto") apply("auto");
      });
    }
  })();

  if (ddBtn && ddMenu && mAuto && mLight && mDark) {
    ddBtn.addEventListener("click", toggleMenu);

    document.addEventListener("click", (e) => {
      const dd = document.getElementById("themeDD");
      if (dd && !dd.contains(e.target)) openMenu(false);
    });

    mAuto.addEventListener("click", () => { apply("auto"); openMenu(false); });
    mLight.addEventListener("click", () => { apply("light"); openMenu(false); });
    mDark.addEventListener("click", () => { apply("dark"); openMenu(false); });

    ddBtn.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleMenu(); }
      if (e.key === "Escape") openMenu(false);
    });
    [mAuto,mLight,mDark].forEach(el => {
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); el.click(); }
        if (e.key === "Escape") openMenu(false);
      });
    });
  }
})();
