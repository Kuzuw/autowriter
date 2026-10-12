'use strict';
const assert = require('node:assert/strict');
const { humanType, neighborsFor, layoutForLanguage, LAYOUTS } = require('../engine.js');

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function fakeIO() {
  const buf = [];
  const io = {
    buf,
    inserts: 0,
    backspaces: 0,
    aborted: false,
    isAborted: () => io.aborted,
    sleep: () => Promise.resolve(),
    insert: (ch) => {
      buf.push(ch);
      io.inserts++;
    },
    backspace: () => {
      assert.ok(buf.length > 0, 'backspace on empty buffer');
      buf.pop();
      io.backspaces++;
    },
  };
  return io;
}

const samples = [
  'Merhaba dünya! Bu bir deneme metnidir.',
  'İstanbul\'da şöyle güzel bir gün: çay, simit, ağaçlar...\nİkinci satır.\n\nÜçüncü paragraf, ÇOK ÖNEMLİ.',
  'a',
  'ab',
  'The quick brown fox jumps over the lazy dog. 12345 !?',
  '   boşluklar   ve\n\nsatırlar   ',
  'ĞÜŞİÖÇ ğüşiöç ıI',
  'Ça va? Où êtes-vous, Mañana straße ÄÖÜ ñ ù',
];

(async () => {
  let totalTypos = 0;
  const layouts = Object.keys(LAYOUTS);
  for (let seed = 1; seed <= 300; seed++) {
    for (const text of samples) {
      const layout = layouts[seed % layouts.length];
      const io = fakeIO();
      const stats = await humanType(text, io, { rng: mulberry32(seed), typoRate: 35, wpm: 80, layout });
      assert.equal(io.buf.join(''), text, `seed ${seed}, ${layout}: output must equal the source text`);
      totalTypos += stats.typos;
      if (stats.typos > 0) assert.ok(io.backspaces > 0);
    }
  }
  assert.ok(totalTypos > 500, 'should produce plenty of typos: ' + totalTypos);

  // keyboard layouts: neighbours must follow the chosen layout
  const has = (layout, key, ...expected) => {
    const list = neighborsFor(layout)[key];
    for (const e of expected) assert.ok(list.includes(e), `${layout}: '${key}' should neighbour '${e}' (got ${list})`);
  };
  has('en', 'a', 'q', 'w', 's', 'z');
  has('fr', 'a', 'z', 'q');
  assert.ok(!neighborsFor('fr').a.includes('s'), 'fr: a is not next to s');
  has('de', 'z', 't', 'u');
  has('de', 'y', 'x');
  has('tr-q', 'ş', 'l', 'i');
  has('tr-q', 'ı', 'u', 'o');
  has('tr-f', 'a', 'e', 'ü');
  has('es', 'ñ', 'l');
  has('dvorak', 'a', 'o');
  assert.equal(neighborsFor('dvorak')[' '], undefined, 'gaps are not keys');
  assert.deepEqual(neighborsFor('nope'), neighborsFor('en'), 'unknown layout falls back to en');
  for (const [id, l] of Object.entries(LAYOUTS)) {
    for (const row of l.rows) for (const k of row) if (k !== ' ') assert.equal(k, k.toLocaleLowerCase(l.locale), `${id}: rows must be lowercase`);
  }

  // default layout from the browser language
  assert.equal(layoutForLanguage('tr'), 'tr-q');
  assert.equal(layoutForLanguage('de-AT'), 'de');
  assert.equal(layoutForLanguage('fr_CA'), 'fr');
  assert.equal(layoutForLanguage('en-US'), 'en');
  assert.equal(layoutForLanguage(''), 'en');
  for (const id of ['tr-q', 'de', 'fr', 'es', 'en']) assert.ok(LAYOUTS[id]);

  // Turkish dotted/dotless i: neighbour typos keep Turkish casing
  {
    const seen = new Set();
    for (let seed = 1; seed <= 400; seed++) {
      const io = fakeIO();
      const wrong = [];
      io.insert = (ch) => { io.buf.push(ch); wrong.push(ch); };
      await humanType('İİİİ', io, { rng: mulberry32(seed), typoRate: 40, layout: 'tr-q' });
      assert.equal(io.buf.join(''), 'İİİİ');
      wrong.filter((c) => c !== 'İ').forEach((c) => seen.add(c));
    }
    for (const c of seen) assert.ok('ŞĞÜ'.includes(c), `unexpected typo for İ on tr-q: ${c}`);
    assert.ok(seen.size > 0, 'should produce neighbour typos for İ');
  }

  // typo rate 0 means no backspaces at all
  {
    const io = fakeIO();
    await humanType(samples[1], io, { rng: mulberry32(7), typoRate: 0 });
    assert.equal(io.backspaces, 0);
    assert.equal(io.buf.join(''), samples[1]);
  }

  // CRLF normalisation
  {
    const io = fakeIO();
    await humanType('a\r\nb', io, { rng: mulberry32(3), typoRate: 0 });
    assert.equal(io.buf.join(''), 'a\nb');
  }

  // abort
  {
    const io = fakeIO();
    let count = 0;
    const origInsert = io.insert;
    io.insert = (ch) => {
      origInsert(ch);
      if (++count === 5) io.aborted = true;
    };
    await assert.rejects(() => humanType('A longer text is being typed here', io, { typoRate: 0 }), /aborted/);
    assert.equal(io.buf.length, 5);
  }

  console.log('engine OK, typos simulated:', totalTypos);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
