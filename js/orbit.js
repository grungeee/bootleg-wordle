/* A small depth-sorted orbit, with real links and a non-animated fallback. */
"use strict";
(function () {
  const scene = document.getElementById("orbit-scene");
  const folders = Array.from(document.querySelectorAll("[data-orbit]"));
  const toolbar = document.getElementById("orbit-toolbar");
  const toggle = document.getElementById("orbit-toggle");
  if (!scene || !folders.length) return;
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let angle = 2.55;
  let manualPause = false;
  let pointerInside = false;
  let focusInside = false;
  let drag = null;
  let suppressClick = false;
  let lastTime = 0;
  let frame = 0;
  let width = scene.clientWidth;
  let height = scene.clientHeight;
  const TAU = Math.PI * 2;
  scene.classList.add("is-orbit");
  toolbar.hidden = false;

  function paused() {
    return (
      manualPause ||
      motion.matches ||
      pointerInside ||
      focusInside ||
      !!drag ||
      document.hidden
    );
  }
  function buttonState() {
    const stopped = manualPause || motion.matches;
    toggle.textContent = motion.matches
      ? "Motion reduced"
      : stopped
        ? "Resume motion"
        : "Pause motion";
    toggle.setAttribute("aria-pressed", String(stopped));
    toggle.disabled = motion.matches;
  }
  function render() {
    width = scene.clientWidth;
    height = scene.clientHeight;
    const folderWidth = folders[0].offsetWidth;
    const radiusX = Math.max(
      30,
      Math.min(width * 0.34, 405, (width - folderWidth * 1.04) / 2 - 12),
    );
    const radiusY = width < 700 ? 68 : 91;
    folders.forEach((folder, index) => {
      const theta = angle + (index * TAU) / folders.length;
      const depth = Math.sin(theta);
      const x = Math.cos(theta) * radiusX;
      const y = depth * radiusY;
      const scale = 0.84 + (depth + 1) * 0.09;
      folder.style.transform =
        "translate(-50%, -50%) translate(" +
        x.toFixed(2) +
        "px, " +
        y.toFixed(2) +
        "px) scale(" +
        scale.toFixed(3) +
        ")";
      folder.style.zIndex = depth < 0 ? "2" : "10";
      folder.style.opacity = depth < 0 ? "0.84" : "1";
      folder.dataset.depth = depth < 0 ? "behind" : "front";
    });
  }
  function animate(now) {
    frame = 0;
    if (!paused()) {
      if (lastTime)
        angle = (angle + Math.min(now - lastTime, 50) * 0.00009) % TAU;
      render();
      lastTime = now;
      frame = requestAnimationFrame(animate);
    } else lastTime = 0;
  }
  function schedule() {
    if (!frame && !paused()) frame = requestAnimationFrame(animate);
  }
  function rotate(direction) {
    angle += (direction * Math.PI) / 4;
    render();
  }
  document
    .getElementById("orbit-prev")
    .addEventListener("click", () => rotate(-1));
  document
    .getElementById("orbit-next")
    .addEventListener("click", () => rotate(1));
  toggle.addEventListener("click", () => {
    manualPause = !manualPause;
    buttonState();
    schedule();
  });
  scene.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    rotate(event.key === "ArrowLeft" ? -1 : 1);
  });
  scene.addEventListener("pointerenter", (event) => {
    if (event.pointerType === "mouse") pointerInside = true;
  });
  scene.addEventListener("pointerleave", () => {
    pointerInside = false;
    schedule();
  });
  scene.addEventListener("focusin", (event) => {
    focusInside = true;
    const index = folders.indexOf(event.target.closest("[data-orbit]"));
    if (index >= 0) {
      // Bring a keyboard-focused folder in front of the avatar, never behind it.
      angle = Math.PI / 2 - (index * TAU) / folders.length;
      render();
    }
  });
  scene.addEventListener("focusout", (event) => {
    if (!scene.contains(event.relatedTarget)) {
      focusInside = false;
      schedule();
    }
  });
  scene.addEventListener("pointerdown", (event) => {
    if (!event.isPrimary || event.button !== 0) return;
    // Keep normal link tapping and scrolling. Only capture after a horizontal drag.
    drag = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      angle,
      moved: false,
      cancelled: false,
    };
    suppressClick = false;
  });
  scene.addEventListener("pointermove", (event) => {
    if (!drag || event.pointerId !== drag.id || drag.cancelled) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (!drag.moved && Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 8) {
      drag.cancelled = true;
      return;
    }
    if (!drag.moved && Math.abs(dx) < 8) return;
    if (!drag.moved) {
      drag.moved = true;
      scene.setPointerCapture(event.pointerId);
      scene.classList.add("is-dragging");
    }
    angle = drag.angle + (dx / Math.max(width, 260)) * TAU;
    render();
  });
  function endDrag(event) {
    if (!drag || event.pointerId !== drag.id) return;
    suppressClick = drag.moved;
    if (scene.hasPointerCapture(event.pointerId))
      scene.releasePointerCapture(event.pointerId);
    scene.classList.remove("is-dragging");
    drag = null;
    schedule();
    // A drag must not accidentally open the folder where the pointer lands.
    if (suppressClick)
      setTimeout(() => {
        suppressClick = false;
      }, 100);
  }
  scene.addEventListener("pointerup", endDrag);
  scene.addEventListener("pointercancel", endDrag);
  scene.addEventListener("lostpointercapture", (event) => {
    if (drag && event.pointerId === drag.id) {
      drag = null;
      scene.classList.remove("is-dragging");
      schedule();
    }
  });
  scene.addEventListener(
    "click",
    (event) => {
      if (suppressClick) {
        event.preventDefault();
        event.stopImmediatePropagation();
        suppressClick = false;
      }
    },
    true,
  );
  scene.addEventListener("dragstart", (event) => event.preventDefault());
  new ResizeObserver(() => {
    width = scene.clientWidth;
    height = scene.clientHeight;
    render();
  }).observe(scene);
  motion.addEventListener("change", () => {
    buttonState();
    render();
    schedule();
  });
  document.addEventListener("visibilitychange", schedule);
  buttonState();
  render();
  schedule();
})();
