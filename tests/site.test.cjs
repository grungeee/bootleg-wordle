const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

for (const file of ["index.html", "play/index.html", "world/index.html"]) {
  test(file + ": no unrelated repositories or unlocked personal extras", () => {
    const text = read(file);
    assert.doesNotMatch(text, /href=["'][^"']*github\.com/i);
    assert.doesNotMatch(
      text,
      /oasis|nxnative|orderlist|mailto:|mechanical engineer|background in mechatronics|The word game was the first project/,
    );
    assert.doesNotMatch(text, /<canvas|id="about"|id="contact"|id="story"/);
  });
}

test("both public game routes contain the same working game structure", () => {
  for (const file of ["index.html", "play/index.html"]) {
    const text = read(file);
    for (const id of [
      "board",
      "keyboard",
      "dialog-help",
      "dialog-stats",
      "dialog-result",
      "shareBtn",
      "againBtn",
    ])
      assert.ok(text.includes('id="' + id + '"'), file + ": " + id);
    assert.match(text, /href="\/world\/"/);
    assert.match(text, /\/js\/game.js/);
    assert.match(text, /\/css\/style.css/);
  }
});

test("every local HTML link and asset has a real target", () => {
  for (const page of [
    "index.html",
    "play/index.html",
    "world/index.html",
    "404.html",
  ]) {
    for (const match of read(page).matchAll(/(?:href|src)=["']([^"']+)["']/g)) {
      const href = match[1];
      if (/^(?:https?:|mailto:|data:)/.test(href)) continue;
      const url = new URL(
        href,
        "https://www.sharapa.io/" + (page === "index.html" ? "" : page),
      );
      let file = decodeURIComponent(url.pathname).replace(/^\//, "");
      if (!file || file.endsWith("/")) file += "index.html";
      assert.ok(
        fs.existsSync(path.join(root, file)),
        page + ": missing " + href,
      );
      if (url.hash)
        assert.ok(read(file).includes('id="' + url.hash.slice(1) + '"'), href);
    }
  }
});

test("gate serves an authenticated encrypted envelope, not plain portfolio markup", () => {
  const envelope = JSON.parse(read("world/payload.json"));
  assert.equal(envelope.version, 1);
  assert.equal(envelope.algorithm, "AES-GCM");
  assert.equal(envelope.iterations, 600000);
  assert.equal(Buffer.from(envelope.salt, "base64").length, 16);
  assert.equal(Buffer.from(envelope.iv, "base64").length, 12);
  assert.ok(Buffer.from(envelope.ciphertext, "base64").length > 10000);
  assert.doesNotMatch(
    read("world/payload.json"),
    /nikita@|mechanical|<html|<canvas|passcode/,
  );
});

test("passcode and decrypted content are not persisted or embedded in unlock source", () => {
  const text = read("js/unlock.js");
  assert.doesNotMatch(text, /localStorage|sessionStorage|document.cookie/);
  assert.match(text, /crypto.subtle.decrypt/);
  assert.match(text, /allow-scripts allow-top-navigation-by-user-activation/);
  assert.doesNotMatch(text, /allow-same-origin/);
  assert.match(text, /world.replaceChildren\(\)/);
  assert.match(read("world/index.html"), /noindex,nofollow,noarchive/);
});

test("the former plaintext portfolio assets are no longer deployed", () => {
  for (const file of [
    "css/portfolio.css",
    "css/game-portfolio.css",
    "js/orbit.js",
    "img/avatar-study.svg",
    "img/portfolio-og.png",
  ])
    assert.equal(fs.existsSync(path.join(root, file)), false, file);
});

test("share URL still reaches the public game", () => {
  assert.match(read("js/game.js"), /location\.origin\s*\+\s*['"]\/play\/['"]/);
});
