/*
Created: 2026-01-02
Author: @marcinmajsc
Repository: https://github.com/marcinmajsc/streamdelay-gui
*/

/* Optional PWA SW (works on HTTPS/localhost only). */
(function(){
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/static/sw.js').catch(function(){});
  });
})();
