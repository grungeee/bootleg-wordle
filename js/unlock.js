/* Encrypted portfolio gate. No passcode, derived key or plaintext is persisted. */
"use strict";
(function () {
  const form = document.getElementById("unlock-form");
  const input = document.getElementById("passcode");
  const status = document.getElementById("unlock-status");
  const button = document.getElementById("unlock-button");
  const gate = document.getElementById("gate");
  const world = document.getElementById("unlocked-world");
  const lock = document.getElementById("lock-again");
  let pending = false;
  let failures = 0;
  const decode = (text) =>
    Uint8Array.from(atob(text), (char) => char.charCodeAt(0));

  async function decrypt(payload, passcode) {
    if (
      payload.version !== 1 ||
      payload.algorithm !== "AES-GCM" ||
      payload.iterations !== 600000
    ) {
      throw new Error("Unsupported envelope");
    }
    const salt = decode(payload.salt);
    const iv = decode(payload.iv);
    if (salt.length !== 16 || iv.length !== 12)
      throw new Error("Invalid envelope");
    const material = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(passcode),
      "PBKDF2",
      false,
      ["deriveKey"],
    );
    const key = await crypto.subtle.deriveKey(
      { name: "PBKDF2", salt, iterations: payload.iterations, hash: "SHA-256" },
      material,
      { name: "AES-GCM", length: 256 },
      false,
      ["decrypt"],
    );
    const plain = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv,
        additionalData: new TextEncoder().encode("sharapa-world-v1"),
      },
      key,
      decode(payload.ciphertext),
    );
    return new TextDecoder("utf-8", { fatal: true }).decode(plain);
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (pending) return;
    if (!/^[0-9]{5}$/.test(input.value)) {
      status.textContent = "Enter the five-digit invitation code.";
      status.className = "error";
      return;
    }
    if (!window.isSecureContext || !crypto.subtle) {
      status.textContent =
        "Unlocking requires a secure connection. Open https://www.sharapa.io/world/.";
      status.className = "error";
      return;
    }
    pending = true;
    button.disabled = true;
    status.className = "";
    status.textContent = "UNLOCKING...";
    let code = input.value;
    input.value = "";
    try {
      const response = await fetch("/world/payload.json", {
        cache: "no-store",
        credentials: "omit",
      });
      if (!response.ok) throw new Error("Network");
      const payload = await response.json();
      let html;
      try {
        html = await decrypt(payload, code);
      } catch (error) {
        failures++;
        await new Promise((resolve) =>
          setTimeout(resolve, Math.min(failures * 350, 2500)),
        );
        status.textContent = "That code did not open this world. Try again.";
        status.className = "error";
        input.focus();
        return;
      }
      const frame = document.createElement("iframe");
      frame.title = "Nikita's unlocked world";
      // Keep decrypted content in an opaque origin, separate from parent storage.
      frame.setAttribute(
        "sandbox",
        "allow-scripts allow-top-navigation-by-user-activation",
      );
      frame.referrerPolicy = "no-referrer";
      frame.srcdoc = html;
      html = "";
      world.replaceChildren(frame);
      gate.hidden = true;
      world.hidden = false;
      lock.hidden = false;
      document.title = "SHARAPA - unlocked world";
      window.scrollTo(0, 0);
      lock.focus();
    } catch (error) {
      status.textContent =
        "The encrypted world could not load. Check your connection and try again.";
      status.className = "error";
    } finally {
      code = "";
      pending = false;
      button.disabled = false;
    }
  });
  lock.addEventListener("click", () => {
    world.replaceChildren();
    world.hidden = true;
    gate.hidden = false;
    lock.hidden = true;
    status.textContent =
      "World locked. Enter the invitation code to open it again.";
    status.className = "";
    document.title = "SHARAPA - locked world";
    input.focus();
  });
  function lockWorld() {
    world.replaceChildren();
    world.hidden = true;
    gate.hidden = false;
    lock.hidden = true;
    document.title = "SHARAPA - locked world";
    input.value = "";
  }
  window.addEventListener("pagehide", lockWorld);
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) lockWorld();
  });
})();
