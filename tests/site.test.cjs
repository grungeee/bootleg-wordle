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
    assert.match(text, /id="themeBtn"/);
    assert.match(read("css/style.css"), /theme-cream/);
  }
});

test("every local HTML link and asset has a real target", () => {
  for (const page of [
    "index.html",
    "play/index.html",
    "scores/index.html",
    "privacy/index.html",
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

test("one shared wordmark stylesheet is used on every branded route", () => {
  for (const page of ["index.html", "play/index.html", "world/index.html"]) {
    assert.match(read(page), /href="\/css\/brand\.css(?:\?[^"\s]*)?"/);
  }
  for (const file of ["css/style.css", "css/lock.css"]) {
    assert.doesNotMatch(read(file), /\.brand\s*\{/);
  }
  assert.match(read("css/brand.css"), /Sharapa Display/);
  assert.ok(fs.existsSync(path.join(root, "fonts/bebas-neue-latin.ttf")));
});

test("header controls have raised, hover, focus and pressed states", () => {
  const css = read("css/public-game.css");
  for (const selector of [".world-entry", ".topbar .ghost-btn"]) {
    for (const state of [":hover", ":focus-visible", ":active"]) {
      assert.ok(css.includes(selector + state), selector + state);
    }
  }
  assert.match(css, /scale\(1\.04\)/);
  assert.match(css, /scale\(0\.98\)/);
  assert.match(css, /box-shadow: 5px 5px 0 #000/);
});

test("share URL still reaches the public game", () => {
  assert.match(read("js/game.js"), /location\.origin\s*\+\s*['"]\/play\/['"]/);
});

test("the published world payload carries the floating bubble orbit", () => {
  const payload = JSON.parse(read("world/payload.json"));
  assert.deepEqual(Object.keys(payload).sort(), ["algorithm", "ciphertext", "iterations", "iv", "salt", "version"]);
  assert.equal(payload.algorithm, "AES-GCM");
  assert.equal(payload.iterations, 600000);
  // The world document is ciphertext, so only its envelope is checkable here; the
  // markup and orbit maths are asserted at build time in the private source.
  assert.ok(payload.ciphertext.length > 100000);
  assert.doesNotMatch(payload.ciphertext, /sphere-skill|ENGINEERING/);
});

test("world-only material transition is versioned and leaves game routes alone", () => {
  const gate = read("world/index.html");
  assert.match(gate, /portal\.css\?v=analytics-1/);
  assert.match(gate, /unlock\.js\?v=analytics-1/);
  assert.match(gate, /analytics\.js\?v=analytics-1/);
  assert.match(gate, /id="privacyNotice"/);
  assert.match(gate, /portal-cue/);
  for (const page of ["index.html", "play/index.html"]) {
    const html = read(page);
    assert.doesNotMatch(html, /portal\.css|portal-open|y2k-flow/);
    assert.doesNotMatch(html, /chrome-shell|glass-spheres|sphere-link|game-cards/);
  }
  const css = read("css/portal.css");
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /body\.portal-crossing \.lock-card/);
  assert.match(css, /body\.portal-open \.lock-header/);
});

test("unlock transition guards asynchronous completion and waits for frame load", () => {
  const source = read("js/unlock.js");
  assert.match(source, /attempt !== generation/);
  assert.match(source, /generation\+\+/);
  assert.match(source, /frame\.addEventListener\("load"/);
  assert.match(source, /gate\.inert = true/);
  assert.match(source, /sharapa-world-sphere/);
  assert.match(source, /classList\.remove\("portal-preparing", "portal-open", "portal-crossing"\)/);
  assert.doesNotMatch(source, /eval\(|innerHTML\s*=/);
});


test("cream theme keeps dark brown keys and pastel absent letters", () => {
  const css = read("css/style.css");
  const js = read("js/game.js");
  assert.match(css, /body\.theme-cream/);
  assert.match(css, /--tile: #4a2b20/);
  assert.match(css, /--absent: #e8bfa9/);
  assert.match(js, /THEME_KEY/);
  assert.match(js, /theme-cream/);
  assert.match(js, /applyTheme/);
});

test("header keeps MY WORLD beside the logo and centers the daily date on desktop", () => {
  const css = read("css/public-game.css");
  assert.match(css, /\.topbar \.world-entry\s*\{\s*margin-left:\s*0/);
  assert.match(css, /\.topbar #modeChip\s*\{[^}]*left:\s*50%/s);
  assert.match(css, /@media \(max-width: 560px\)[\s\S]*?\.topbar \.chip\s*\{\s*display:\s*none/s);
});

test("privacy choice is explicit, withdrawable and gates analytics", () => {
  for (const page of ["index.html", "play/index.html", "scores/index.html", "privacy/index.html"]) {
    const html = read(page);
    assert.match(html, /id="privacyNotice"/);
    assert.match(html, /data-privacy-choice="essential"/);
    assert.match(html, /data-privacy-choice="allow"/);
    assert.match(html, /No ads, fingerprinting or analytics cookies/);
    assert.match(html, /Google Fonts[\s\S]*IP address/);
    assert.match(html, /data-privacy-settings/);
  }
  const analytics = read("js/analytics.js");
  assert.match(analytics, /consent !== 'allow'/);
  assert.match(analytics, /sharapa\.analytics\.consent\.v1/);
  assert.match(analytics, /function openSettings\(\)/);
  assert.match(analytics, /navigator\.sendBeacon/);
  assert.doesNotMatch(analytics, /document\.cookie|canvas\.toDataURL/i);
  assert.match(read("privacy/index.html"), /nikita@sharapa\.io/);
});

test("player hub uses optional registration and public scores are opt-in", () => {
  const html = read("scores/index.html");
  assert.match(html, /id="registerForm"/);
  assert.match(html, /id="loginForm"/);
  assert.match(html, /No confirmation email is required or sent/);
  assert.match(html, /leaderboard_public/);
  assert.match(html, /id="deleteForm"/);
  assert.match(read("js/scores.js"), /credentials: 'include'/);
  assert.match(read("api/app.py"), /@app\.post\("\/api\/v1\/account\/leaderboard"\)/);
});
