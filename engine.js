/*
 * Autowriter - human-like typing engine.
 *
 * DOM-independent: typing, erasing and waiting go through an `io` object,
 * so the engine can be tested in Node.
 *
 * io = {
 *   insert(ch)        // type one character ('\n' = Enter)
 *   backspace()       // erase one character
 *   sleep(ms)         // returns a Promise
 *   isAborted()       // typing stops when this returns true
 *   onProgress(i, n)  // optional
 * }
 */
(function (root) {
  'use strict';

  /*
   * Keyboard layouts, used for "pressed the key next to it" typos.
   * Only letter keys matter. Rows are aligned like a real staggered keyboard:
   * row 0 starts at the key right of Tab, row 1 right of Caps Lock, row 2
   * right of Left Shift. A space marks a non-letter key.
   */
  const LAYOUTS = {
    'en': { locale: 'en', rows: ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'] },
    'tr-q': { locale: 'tr', rows: ['qwertyuıopğü', 'asdfghjklşi', 'zxcvbnmöç'] },
    'tr-f': { locale: 'tr', rows: ['fgğıodrnhpqw', 'uieaütkmlyşx', 'jövcçzsb'] },
    'de': { locale: 'de', rows: ['qwertzuiopü', 'asdfghjklöä', 'yxcvbnm'] },
    'fr': { locale: 'fr', rows: ['azertyuiop', 'qsdfghjklmù', 'wxcvbn'] },
    'es': { locale: 'es', rows: ['qwertyuiop', 'asdfghjklñ', 'zxcvbnm'] },
    'dvorak': { locale: 'en', rows: ['   pyfgcrl', 'aoeuidhtns', ' qjkxbmwvz'] },
  };

  const DEFAULT_LAYOUT = 'en';

  // A sensible default layout for a browser UI language such as "tr" or "de-AT".
  function layoutForLanguage(lang) {
    const code = String(lang || '').toLowerCase().split(/[-_]/)[0];
    return { tr: 'tr-q', de: 'de', fr: 'fr', es: 'es' }[code] || DEFAULT_LAYOUT;
  }
  const neighborCache = {};

  function neighborsFor(layoutId) {
    const id = LAYOUTS[layoutId] ? layoutId : DEFAULT_LAYOUT;
    if (neighborCache[id]) return neighborCache[id];
    const rows = LAYOUTS[id].rows.map((r) => Array.from(r));
    const map = {};
    rows.forEach((row, r) => {
      row.forEach((key, c) => {
        if (key === ' ') return;
        const list = [];
        const add = (rr, cc) => {
          const k = rows[rr] && rows[rr][cc];
          if (k && k !== ' ') list.push(k);
        };
        add(r, c - 1);
        add(r, c + 1);
        add(r - 1, c);
        add(r - 1, c + 1);
        add(r + 1, c - 1);
        add(r + 1, c);
        map[key] = list;
      });
    });
    return (neighborCache[id] = map);
  }

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const isLetter = (ch) => !!ch && /\p{L}/u.test(ch);

  function neighborOf(ch, rng, layoutId) {
    const layout = LAYOUTS[layoutId] || LAYOUTS[DEFAULT_LAYOUT];
    const lower = ch.toLocaleLowerCase(layout.locale);
    const list = neighborsFor(layoutId)[lower];
    if (!list || !list.length) return null;
    const pick = list[Math.floor(rng() * list.length)];
    return ch !== lower ? pick.toLocaleUpperCase(layout.locale) : pick;
  }

  async function humanType(text, io, opts) {
    opts = opts || {};
    const rng = opts.rng || Math.random;
    const rand = (a, b) => a + rng() * (b - a);
    const pickFrom = (arr) => arr[Math.floor(rng() * arr.length)];

    const wpm = clamp(Number(opts.wpm) || 55, 5, 400);
    const typoRate = clamp(opts.typoRate == null ? 4 : Number(opts.typoRate), 0, 40) / 100;
    const layoutId = LAYOUTS[opts.layout] ? opts.layout : DEFAULT_LAYOUT;
    const base = 60000 / (wpm * 5); // ms per character

    const chars = Array.from(String(text).replace(/\r\n?/g, '\n'));
    const stats = { chars: chars.length, typos: 0 };

    let rhythm = 1; // overall pace that drifts slower/faster over time
    let sinceRhythm = 0;

    const check = () => {
      if (io.isAborted()) throw new Error('aborted');
    };

    function delayFor(ch) {
      if (++sinceRhythm >= 15) {
        sinceRhythm = 0;
        rhythm = clamp(rhythm * rand(0.85, 1.18), 0.7, 1.45);
      }
      let d = base * rhythm * rand(0.55, 1.6);
      if (ch === ' ') d *= rand(1, 1.5);
      if (/[.!?…]/.test(ch)) d += rand(180, 500);
      else if (/[,;:]/.test(ch)) d += rand(80, 250);
      else if (ch === '\n') d += rand(250, 700);
      if (rng() < 0.015) d += rand(500, 1600); // the occasional thinking pause
      return d;
    }

    async function typeOne(ch) {
      check();
      await io.sleep(delayFor(ch));
      check();
      io.insert(ch);
    }

    async function eraseOne() {
      check();
      await io.sleep(rand(45, 120));
      check();
      io.backspace();
    }

    // Builds a typo plan for character i (or returns null)
    function planTypo(i) {
      const ch = chars[i];
      const next = chars[i + 1];

      const r = rng();
      let kind = r < 0.5 ? 'neighbor' : r < 0.7 ? 'double' : r < 0.85 ? 'swap' : 'skip';

      let wrong;
      let consumed = 1;
      if (kind === 'swap') {
        if (isLetter(next) && next !== ch) {
          wrong = [next, ch];
          consumed = 2;
        } else kind = 'neighbor';
      }
      if (kind === 'neighbor') {
        const nb = neighborOf(ch, rng, layoutId);
        if (!nb) return null;
        wrong = [nb];
      } else if (kind === 'double') {
        wrong = [ch, ch];
      } else if (kind === 'skip') {
        wrong = [];
      }

      // How many correct characters get typed before the typo is noticed
      let n = kind === 'skip' ? pickFrom([1, 1, 2, 3]) : pickFrom([0, 0, 1, 1, 2, 3]);
      let avail = 0;
      for (let k = i + consumed; k < chars.length && chars[k] !== '\n' && avail < n; k++) avail++;
      n = Math.min(n, avail);
      if (kind === 'skip' && n === 0) return null;

      return { wrong, consumed, n };
    }

    let i = 0;
    while (i < chars.length) {
      check();
      if (io.onProgress) io.onProgress(i, chars.length);
      const ch = chars[i];

      if (isLetter(ch) && rng() < typoRate) {
        const plan = planTypo(i);
        if (plan) {
          const { wrong, consumed, n } = plan;
          const following = chars.slice(i + consumed, i + consumed + n);
          const correct = chars.slice(i, i + consumed + n);

          for (const c of wrong) await typeOne(c);
          for (const c of following) await typeOne(c);

          // notice the typo, erase, retype
          check();
          await io.sleep(rand(220, 650));
          for (let k = 0; k < wrong.length + following.length; k++) await eraseOne();
          check();
          await io.sleep(rand(100, 320));
          for (const c of correct) await typeOne(c);

          stats.typos++;
          i += consumed + n;
          continue;
        }
      }

      await typeOne(ch);
      i++;
    }

    if (io.onProgress) io.onProgress(chars.length, chars.length);
    return stats;
  }

  const api = { humanType, neighborsFor, layoutForLanguage, LAYOUTS, DEFAULT_LAYOUT };
  root.AutowriterEngine = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : self);
