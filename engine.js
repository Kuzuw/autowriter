/*
 * Autowriter - insan gibi yazma motoru.
 *
 * DOM'dan bağımsızdır: yazma/silme/bekleme işlemleri `io` nesnesi üzerinden
 * yapılır, böylece Node'da test edilebilir.
 *
 * io = {
 *   insert(ch)        // bir karakter yaz ('\n' = Enter)
 *   backspace()       // bir karakter sil
 *   sleep(ms)         // Promise döndürür
 *   isAborted()       // true ise yazma durur
 *   onProgress(i, n)  // opsiyonel
 * }
 */
(function (root) {
  'use strict';

  // Türkçe Q klavye düzeni (komşu tuşlardan yanlış tuşa basma hataları için)
  const ROWS = ['qwertyuıopğü', 'asdfghjklşi', 'zxcvbnmöç'];

  const NEIGHBORS = (() => {
    const map = {};
    ROWS.forEach((row, r) => {
      Array.from(row).forEach((key, c) => {
        const list = [];
        const add = (rr, cc) => {
          const rw = ROWS[rr];
          if (rw && cc >= 0 && cc < rw.length) list.push(rw[cc]);
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
    return map;
  })();

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const isLetter = (ch) => !!ch && /\p{L}/u.test(ch);

  function neighborOf(ch, rng) {
    const lower = ch.toLowerCase();
    const list = NEIGHBORS[lower];
    if (!list || !list.length) return null;
    const pick = list[Math.floor(rng() * list.length)];
    return ch !== lower ? pick.toUpperCase() : pick;
  }

  async function humanType(text, io, opts) {
    opts = opts || {};
    const rng = opts.rng || Math.random;
    const rand = (a, b) => a + rng() * (b - a);
    const pickFrom = (arr) => arr[Math.floor(rng() * arr.length)];

    const wpm = clamp(Number(opts.wpm) || 55, 5, 400);
    const typoRate = clamp(opts.typoRate == null ? 4 : Number(opts.typoRate), 0, 40) / 100;
    const base = 60000 / (wpm * 5); // karakter başına ms

    const chars = Array.from(String(text).replace(/\r\n?/g, '\n'));
    const stats = { chars: chars.length, typos: 0 };

    let rhythm = 1; // zamanla yavaşlayıp hızlanan yazma ritmi
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
      if (rng() < 0.015) d += rand(500, 1600); // ara sıra düşünme molası
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

    // i. karakter için bir hata planı üretir (ya da null)
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
        const nb = neighborOf(ch, rng);
        if (!nb) return null;
        wrong = [nb];
      } else if (kind === 'double') {
        wrong = [ch, ch];
      } else if (kind === 'skip') {
        wrong = [];
      }

      // Hatayı fark etmeden önce yazılan doğru karakter sayısı
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

          // hatayı fark etme, silme, yeniden yazma
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

  const api = { humanType, NEIGHBORS };
  root.AutowriterEngine = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : self);
