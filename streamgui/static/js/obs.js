/*
Created: 2026-01-02
Author: @marcinmajsc
Repository: https://github.com/marcinmajsc/streamdelay-gui
*/

(function(){
  var el = document.getElementById("srtUri");
  var btn = document.getElementById("copyObsBtn");
  if (!el || !btn) return;

  var host = window.location.hostname || "0.0.0.0";
  var uri = "srt://" + host + ":9000?mode=caller&latency=200000";
  el.textContent = uri;

  btn.addEventListener("click", async function(){
    try{
      await navigator.clipboard.writeText(uri);
      var old = btn.textContent;
      btn.textContent = "COPIED";
      setTimeout(()=>{ btn.textContent = old; }, 900);
    }catch(e){
      var ta = document.createElement("textarea");
      ta.value = uri;
      document.body.appendChild(ta);
      ta.select();
      try{ document.execCommand("copy"); }catch(_){}
      document.body.removeChild(ta);
      var old2 = btn.textContent;
      btn.textContent = "COPIED";
      setTimeout(()=>{ btn.textContent = old2; }, 900);
    }
  });
})();
