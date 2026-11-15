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
  assert.match(gate, /unlock\.js\?v=gate-theme-1/);
  assert.match(gate, /analytics\.js\?v=cookie-1/);
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
  assert.match(css, /\.topbar \.world-entry\s*\{\s*margin-left:\s*12px/);
  assert.match(css, /\.topbar #modeChip\s*\{[^}]*left:\s*50%/s);
  assert.match(css, /@media \(max-width: 560px\)[\s\S]*?\.topbar \.chip\s*\{\s*display:\s*none/s);
});

test("the visit-data banner informs, links the notice and closes on one cookie", () => {
  for (const page of ["index.html", "play/index.html", "scores/index.html", "world/index.html"]) {
    const html = read(page);
    assert.match(html, /id="privacyNotice"/);
    assert.match(html, /data-privacy-cookie/);
    assert.match(html, /href="\/privacy\/"/);
    assert.match(html, /No ads,\s+fingerprinting or analytics cookies/);
    assert.doesNotMatch(html, /data-privacy-choice/);
  }
  for (const page of ["index.html", "play/index.html", "scores/index.html", "privacy/index.html"]) {
    assert.match(read(page), /data-privacy-settings/);
  }
  const noticePage = read("privacy/index.html");
  assert.match(noticePage, /id="visit-data"/);
  assert.match(noticePage, /data-privacy-choice="essential"/);
  assert.match(noticePage, /data-privacy-choice="allow"/);
  assert.match(noticePage, /id="visitState"/);
  assert.doesNotMatch(noticePage, /id="privacyNotice"/);
  const analytics = read("js/analytics.js");
  assert.match(analytics, /consent !== 'allow'/);
  assert.match(analytics, /sharapa\.analytics\.consent\.v1/);
  assert.match(analytics, /function playBite\(\)/);
  assert.match(analytics, /url\(#cookieBiteMask\)/);
  assert.match(analytics, /choose\('essential'\)/);
  assert.match(analytics, /navigator\.sendBeacon/);
  assert.doesNotMatch(analytics, /document\.cookie|canvas\.toDataURL/i);
  assert.match(read("privacy/index.html"), /nikita@sharapa\.io/);
});

test("player hub uses optional registration and public scores are opt-in", () => {
  const html = read("scores/index.html");
  assert.match(html, /id="registerForm"/);
  assert.match(html, /id="loginForm"/);
  assert.match(html, /No confirmation email is required or sent/);
  assert.match(html, /scores\.js\?v=accounts-3/);
  assert.match(html, /leaderboard_public/);
  assert.match(html, /id="deleteForm"/);
  assert.match(read("js/scores.js"), /credentials: 'include'/);
  assert.match(read("api/app.py"), /@app\.post\("\/api\/v1\/account\/leaderboard"\)/);
});

test("sign-in and registration share one card instead of stacking two", () => {
  const html = read("scores/index.html");
  const source = read("js/scores.js");
  const css = read("css/account.css");
  const login = html.slice(html.indexOf('id="loginForm"'), html.indexOf('id="registerForm"'));
  const register = html.slice(html.indexOf('id="registerForm"'), html.indexOf('id="accountPanel"'));
  assert.doesNotMatch(login, /\shidden[\s>]/, "the sign-in card is the default view");
  assert.match(register, /id="registerForm"[^>]*hidden|hidden[^>]*id="registerForm"/,
    "the registration card starts hidden");
  assert.match(html, /data-auth-switch="register"/);
  assert.match(html, /data-auth-switch="login"/);
  assert.match(css, /\.auth-grid\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/s);
  assert.match(css, /\.form-card\[hidden\]\s*\{\s*display:\s*none/);
  assert.match(source, /function showAuth\(view\)/);
  assert.match(source, /loginForm\.hidden = register/);
  assert.match(source, /registerForm\.hidden = !register/);
  assert.match(source, /endpoint\.endsWith\('\/login'\) && error\.status === 401/);
  assert.match(source, /showAuth\('register'\)/);
  assert.doesNotMatch(source, /scrollIntoView/);
});

test("tiles close before they colour in, then the row bounces", () => {
  const css = read("css/style.css");
  const game = read("js/game.js");
  assert.match(css, /\.tile\.flip-close\s*\{\s*animation:\s*tile-close\s+150ms[^}]*forwards/);
  assert.match(css, /\.tile\.flip-open\s*\{\s*animation:\s*tile-open/);
  assert.match(css, /@keyframes tile-close\s*\{[\s\S]*?scaleY\(1\)[\s\S]*?scaleY\(0\.04\)/);
  assert.match(css, /\.row--bounce\s+\.tile\s*\{\s*animation:\s*tile-pop/);
  // The typing pop must not outrank the flip, or the close half never plays.
  assert.match(css, /\.tile:not\(:empty\):not\(\[data-state\]\):not\(\.flip-close\):not\(\.flip-open\)/);
  // The colour is written only after the closing half has finished.
  assert.match(game, /setTimeout\(\(\) => tile\.classList\.add\('flip-close'\), at\)/);
  assert.match(game, /tile\.dataset\.state = states\[i\];\s*\n\s*tile\.classList\.remove\('flip-close'\)/);
  assert.match(game, /\}, at \+ closeMs\)/);
  assert.doesNotMatch(game, /flip-out|flip-in/);
  assert.match(game, /row\.classList\.add\('row--bounce'\), revealDuration\)/);
  assert.match(game, /setTimeout\(resolve, revealDuration \+ bounceDuration\)/);
  for (const page of ["index.html", "play/index.html"]) {
    const html = read(page);
    assert.match(html, /style\.css\?v=win-4/);
    assert.match(html, /game\.js\?v=win-3/);
  }
});

test("the splash word holds long enough and its letters sit centred", () => {
  const css = read("css/style.css");
  const game = read("js/game.js");
  assert.match(css, /\.splash-word\s*\{[^}]*animation:\s*splash-in 2\.2s/s);
  assert.match(css, /@keyframes splash-in\s*\{[\s\S]*?27%[\s\S]*?74%/);
  assert.match(css, /\.splash-tile > span\s*\{[^}]*line-height:\s*1[^}]*translateY\(0\.02em\)/s);
  assert.match(game, /setTimeout\(done, 2600\)/);
  for (const page of ["index.html", "play/index.html"]) {
    const html = read(page);
    assert.equal((html.match(/<div class="splash-tile"><span>[A-Z]<\/span><\/div>/g) || []).length, 6, page);
  }
});

test("a winning row jumps tile by tile before the result opens", () => {
  const css = read("css/style.css");
  const game = read("js/game.js");
  assert.match(css, /\.row--win \.tile\s*\{\s*animation:\s*tile-win 460ms/);
  for (const [n, delay] of [[2, 70], [3, 140], [4, 210], [5, 280]]) {
    assert.match(css, new RegExp(`\\.row--win \\.tile:nth-child\\(${n}\\)\\s*\\{\\s*animation-delay:\\s*${delay}ms`));
  }
  assert.match(css, /@keyframes tile-win\s*\{[\s\S]*?translateY\(-18px\)[\s\S]*?translateY\(0\) scale\(1\)/);
  assert.match(game, /if \(word === state\.answer\) \{\s*\n\s*state\.status = 'won';\s*\n\s*await winRow\(rowEl\(row\)\);/);
  assert.match(game, /function winRow\(row\) \{\s*\n\s*if \(!row \|\| reduceMotion\(\)\) return Promise\.resolve\(\);/);
  assert.match(game, /row\.classList\.add\('row--win'\)/);
  assert.match(game, /row\.classList\.remove\('row--win', 'row--bounce'\)/);
  assert.match(game, /\}, 780\);/);
});

test("the locked world is a thick-stroke globe icon instead of a text link", () => {
  for (const page of ["index.html", "play/index.html"]) {
    const html = read(page);
    assert.doesNotMatch(html, /EXPLORE MY WORLD/);
    assert.match(html, /class="primary-btn world-icon-btn"/);
    assert.match(html, /aria-label="Explore my world\. Invitation code required\."/);
    assert.match(html, /stroke-width="2\.6"/);
    assert.equal((html.match(/<circle cx="12" cy="12" r="9" \/>/g) || []).length, 1, page);
  }
});

test("the how-to-play panel is darker than the default dialog", () => {
  const css = read("css/style.css");
  assert.match(css, /:root\s*\{[^}]*--panel-deep:\s*#17161f/s);
  assert.match(css, /body\.theme-cream(?:,\s*html\.theme-cream body)?\s*\{[^}]*--panel-deep:\s*#241610/s);
  assert.match(css, /#dialog-help\s*\{\s*background:\s*var\(--panel-deep\)/);
});

test("the lavender theme is called EVA-01", () => {
  const game = read("js/game.js");
  assert.match(game, /themeBtn\.textContent = cream \? 'CREAM' : 'EVA-01';/);
  assert.match(game, /Switch to EVA-01 theme/);
  assert.doesNotMatch(game, /'LAVENDER'/);
  // The stored preference key stays "lavender" so saved themes keep working.
  assert.match(game, /localStorage\.getItem\(THEME_KEY\) \|\| 'lavender'/);
});

test("cream keeps the letters readable on the pale absent keys", () => {
  const css = read("css/style.css");
  assert.match(css, /body\.theme-cream \.key\[data-state='absent'\]\s*\{\s*color: #3a2019/);
  assert.match(css, /body\.theme-cream \.tile\[data-state='absent'\]\s*\{\s*color: #3a2019/);
});

test("the visit-data note follows the active theme", () => {
  const css = read("css/style.css");
  const pub = read("css/public-game.css");
  assert.match(css, /body\.game-page\s*\{\s*--note-bg:\s*#21202b/);
  assert.match(css, /body\.game-page\.theme-cream\s*\{\s*--note-bg:\s*#fff8ea/);
  assert.match(pub, /background: var\(--note-bg, #fff8ea\)/);
  assert.match(pub, /color: var\(--note-ink, #24140e\)/);
  assert.match(pub, /color: var\(--note-head, #4a2b20\)/);
  assert.match(pub, /color: var\(--note-muted, #684a3b\)/);
  assert.match(pub, /\.visit-choices \.ghost-btn,\s*\.visit-choices \.ghost-btn:hover \{\s*background: var\(--yellow, #f4dda0\);\s*color: #17161f/);
  assert.match(pub, /\.visit-choices \.primary-btn,\s*\.visit-choices \.primary-btn:hover \{\s*background: var\(--green, #b8e7c5\);\s*color: #17161f/);
  for (const page of ["index.html", "play/index.html"]) {
    assert.match(read(page), /<body class="game-page">/);
  }
  // Pages without the toggle keep the cream card.
  assert.doesNotMatch(read("privacy/index.html"), /game-page/);
});

test("the world gate and the sealed world follow the picked theme", () => {
  const gate = read("world/index.html");
  assert.match(gate, /localStorage\.getItem\("sharapa\.wordle\.theme"\) === "cream"/);
  assert.match(gate, /classList\.add\("theme-cream"\)/);
  const lock = read("css/lock.css");
  assert.match(lock, /html\.theme-cream\s*\{[\s\S]*?--purple: #efe4d2/);
  assert.match(lock, /html\.theme-cream\s*\{[\s\S]*?--paper: #fff6e9/);
  const unlock = read("js/unlock.js");
  assert.match(gate, /dataset\.worldTheme = "cream"/);
  assert.match(unlock, /documentElement\.dataset\.worldTheme === "cream"/);
  assert.match(unlock, /html\.replace\('<html lang="en">', '<html lang="en" class="theme-cream">'\)/);
});

test("the notice says no ads, follows the theme and keeps the real wordmark", () => {
  const page = read("privacy/index.html");
  assert.match(page, /<h1>NO ADS\.<br \/>NOTHING SOLD\.<\/h1>/);
  assert.doesNotMatch(page, /YOUR DATA\.<br \/>YOUR CHOICE/);
  assert.match(page, /data brokers/);
  assert.match(page, /localStorage\.getItem\("sharapa\.wordle\.theme"\) === "cream"/);
  const css = read("css/style.css");
  assert.match(css, /body\.theme-cream,\s*html\.theme-cream body \{/);
  const account = read("css/account.css");
  assert.doesNotMatch(account, /\.sitebar \.brand \{/);
  assert.match(account, /\.privacy-article a:not\(\.primary-btn\) \{ color: var\(--accent-ink\)/);
  assert.match(account, /html\.theme-cream \{\s*--accent-ink: #7a3f24/);
});
