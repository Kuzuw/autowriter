'use strict';
const assert = require('node:assert/strict');
const { humanType } = require('../engine.js');

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
      assert.ok(buf.length > 0, 'boş tamponda backspace');
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
];

(async () => {
  let totalTypos = 0;
  for (let seed = 1; seed <= 300; seed++) {
    for (const text of samples) {
      const io = fakeIO();
      const stats = await humanType(text, io, { rng: mulberry32(seed), typoRate: 35, wpm: 80 });
      assert.equal(io.buf.join(''), text, `seed ${seed}: sonuç metinle aynı olmalı`);
      totalTypos += stats.typos;
      if (stats.typos > 0) assert.ok(io.backspaces > 0);
    }
  }
  assert.ok(totalTypos > 500, 'yeterince hata üretilmeli: ' + totalTypos);

  // hata oranı 0 iken hiç silme olmamalı
  {
    const io = fakeIO();
    await humanType(samples[1], io, { rng: mulberry32(7), typoRate: 0 });
    assert.equal(io.backspaces, 0);
    assert.equal(io.buf.join(''), samples[1]);
  }

  // CRLF normalizasyonu
  {
    const io = fakeIO();
    await humanType('a\r\nb', io, { rng: mulberry32(3), typoRate: 0 });
    assert.equal(io.buf.join(''), 'a\nb');
  }

  // iptal
  {
    const io = fakeIO();
    let count = 0;
    const origInsert = io.insert;
    io.insert = (ch) => {
      origInsert(ch);
      if (++count === 5) io.aborted = true;
    };
    await assert.rejects(() => humanType('Uzun bir metin yazılıyor burada', io, { typoRate: 0 }), /aborted/);
    assert.equal(io.buf.length, 5);
  }

  console.log('OK - toplam hata sayısı:', totalTypos);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
