/* Authenticated portfolio gate. No passcode, key or plaintext is persisted. */
"use strict";
(function () {
  const form = document.getElementById("unlock-form");
  const input = document.getElementById("passcode");
  const status = document.getElementById("unlock-status");
  const button = document.getElementById("unlock-button");
  const gate = document.getElementById("gate");
  const world = document.getElementById("unlocked-world");
  const lock = document.getElementById("lock-again");
  let pending = false, failures = 0, generation = 0;
  const pause = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  const decode = text => Uint8Array.from(atob(text), c => c.charCodeAt(0));

  async function decrypt(payload, passcode) {
    if (payload.version !== 1 || payload.algorithm !== "AES-GCM" || payload.iterations !== 600000)
      throw new Error("Unsupported envelope");
    const salt = decode(payload.salt), iv = decode(payload.iv);
    if (salt.length !== 16 || iv.length !== 12) throw new Error("Invalid envelope");
    const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(passcode), "PBKDF2", false, ["deriveKey"]);
    const key = await crypto.subtle.deriveKey(
      { name: "PBKDF2", salt, iterations: payload.iterations, hash: "SHA-256" },
      material, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv, additionalData: new TextEncoder().encode("sharapa-world-v1") },
      key, decode(payload.ciphertext));
    return new TextDecoder("utf-8", { fatal: true }).decode(plain);
  }

  function lockWorld() {
    generation++;
    pending = false;
    button.disabled = false;
    gate.inert = false;
    document.body.classList.remove("portal-preparing", "portal-open", "portal-crossing");
    world.replaceChildren();
    world.hidden = true;
    gate.hidden = false;
    lock.hidden = true;
    document.title = "SHARAPA - locked world";
    input.value = "";
  }

  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (pending) return;
    if (!/^[0-9]{5}$/.test(input.value)) {
      status.textContent = "Enter the five-digit invitation code.";
      status.className = "error"; return;
    }
    if (!window.isSecureContext || !crypto.subtle) {
      status.textContent = "Unlocking requires a secure connection. Open https://www.sharapa.io/world/.";
      status.className = "error"; return;
    }
    pending = true;
    const attempt = ++generation;
    button.disabled = true;
    status.className = "";
    status.textContent = "UNLOCKING...";
    let code = input.value;
    input.value = "";
    try {
      const response = await fetch("/world/payload.json", { cache: "no-store", credentials: "omit" });
      if (!response.ok) throw new Error("Network");
      const payload = await response.json();
      if (attempt !== generation) return;
      let html;
      try {
        html = await decrypt(payload, code);
        if (attempt !== generation) return;
      } catch (error) {
        failures++;
        await pause(Math.min(failures * 350, 2500));
        if (attempt !== generation) return;
        status.textContent = "That code did not open this world. Try again.";
        status.className = "error"; input.focus(); return;
      }
      code = "";
      const frame = document.createElement("iframe");
      frame.title = "Nikita's unlocked world";
      frame.setAttribute("sandbox", "allow-scripts allow-top-navigation-by-user-activation");
      frame.referrerPolicy = "no-referrer";
      // The old surface stays visible until the isolated document loads.
      let finishLoad;
      const loaded = new Promise(resolve => { finishLoad = resolve; });
      frame.addEventListener("load", () => finishLoad(), { once: true });
      frame.srcdoc = html;
      html = "";
      document.body.classList.add("portal-preparing");
      world.replaceChildren(frame);
      world.hidden = false;
      await Promise.race([loaded, pause(5000)]);
      if (attempt !== generation) return;
      gate.inert = true;
      document.body.classList.add("portal-open", "portal-crossing");
      lock.hidden = false;
      document.title = "SHARAPA - unlocked world";
      window.scrollTo(0, 0);
      await pause(window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 700);
      if (attempt !== generation) return;
      gate.hidden = true;
      gate.inert = false;
      document.body.classList.remove("portal-preparing", "portal-crossing");
      lock.focus();
    } catch (error) {
      if (attempt !== generation) return;
      lockWorld();
      status.textContent = "The encrypted world could not load. Check your connection and try again.";
      status.className = "error";
    } finally {
      code = "";
      if (attempt === generation) { pending = false; button.disabled = false; }
    }
  });
  lock.addEventListener("click", () => {
    lockWorld();
    status.textContent = "World locked. Enter the invitation code to open it again.";
    status.className = ""; input.focus();
  });
  window.addEventListener("pagehide", lockWorld);
  window.addEventListener("pageshow", event => { if (event.persisted) lockWorld(); });
})();
