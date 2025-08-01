(function() {
  let lastTouchEnd = 0;

  // prevent pinch zoom
  document.addEventListener(
    'touchstart',
    function(e) {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    },
    { passive: false }
  );

  // prevent double-tap zoom while still letting the tap fire
  document.addEventListener(
    'touchend',
    function(e) {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        e.preventDefault();
        e.target.dispatchEvent(new Event('click', { bubbles: true }));
      }
      lastTouchEnd = now;
    },
    { passive: false }
  );
})();
