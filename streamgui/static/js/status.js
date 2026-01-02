/*
Created: 2026-01-02
Author: @marcinmajsc
Repository: https://github.com/marcinmajsc/streamdelay-gui
*/

(function(){
  function setBadge(el, state, okStates, warnStates) {
    if (!el) return;
    var s = (state === null || state === undefined) ? "unknown" : String(state);
    s = s.toLowerCase();
    el.classList.remove("ok","bad","warn");
    if (okStates.indexOf(s) >= 0) el.classList.add("ok");
    else if (warnStates.indexOf(s) >= 0) el.classList.add("warn");
    else el.classList.add("bad");
    el.textContent = s.toUpperCase();
  }

  function attachStopConfirm() {
    var stopForm = document.getElementById("stopForm");
    var stopBtn = document.getElementById("stopBtn");
    if (!stopForm || !stopBtn) return;

    stopForm.addEventListener("submit", function (e) {
      if (stopBtn.disabled) { e.preventDefault(); return; }
      if (!window.confirm("Stop the stream now?")) e.preventDefault();
    });
  }

  async function refreshStatus() {
    try {
      var r = await fetch("/status.json", {cache: "no-store"});
      var s = await r.json();

      var streamBadge = document.getElementById("streamBadge");
      var streamDetail = document.getElementById("streamDetail");
      var live = !!s.isStreamRunning;
      setBadge(streamBadge, live ? "live" : "offline", ["live"], []);
      if (streamDetail) streamDetail.textContent = "";

      var startBtn = document.getElementById("startBtn");
      var stopBtn  = document.getElementById("stopBtn");
      if (startBtn && stopBtn) {
        if (live) { startBtn.disabled = true; stopBtn.disabled = false; }
        else { startBtn.disabled = false; stopBtn.disabled = true; }
      }

      var censorBadge = document.getElementById("censorBadge");
      var censorDetail = document.getElementById("censorDetail");
      var isC = !!s.isCensored;

      var censorUiState = isC ? "censored" : "normal";
      setBadge(censorBadge, censorUiState, ["normal"], ["censored"]);

      var detail = isC ? " (ON)" : " (OFF)";
      var cs = (s.censorship_state === null || s.censorship_state === undefined) ? "" : String(s.censorship_state);
      if (cs) {
        var csLower = cs.toLowerCase();
        if (!(csLower === "normal" && !isC)) detail += " / state:" + cs;
      }
      if (censorDetail) censorDetail.textContent = detail;

      var onBtn = document.getElementById("censorOnBtn");
      var offBtn = document.getElementById("censorOffBtn");
      var countdown = document.getElementById("toggleCountdown");

      if (onBtn && offBtn && countdown) {
        if (s.locked) {
          onBtn.disabled = true;
          offBtn.disabled = true;
          countdown.textContent = String(s.seconds_left) + "s";
        } else {
          if (isC) { onBtn.disabled = true; offBtn.disabled = false; }
          else { onBtn.disabled = false; offBtn.disabled = true; }
          countdown.textContent = "inactive";
        }
      }

      var pbar = document.getElementById("pbar");
      if (pbar) {
        var pct = Number((s.progress === undefined || s.progress === null) ? 100 : s.progress);
        if (pct < 0) pct = 0;
        if (pct > 100) pct = 100;
        pbar.style.width = pct + "%";
      }

    } catch (e) {
      console.error("Status refresh failed", e);
    }
  }

  attachStopConfirm();

  // Only run on pages where status elements exist (i.e. yt_configured)
  if (document.getElementById("streamBadge")) {
    setInterval(refreshStatus, 1000);
    refreshStatus();
  }
})();
