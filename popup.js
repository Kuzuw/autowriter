'use strict';

const DEFAULTS = { wpm: 55, typoRate: 4, startDelay: 2, source: 'clipboard', customText: '', preset: 'natural' };

const PRESETS = {
  calm: { wpm: 35, typoRate: 2 },
  natural: { wpm: 55, typoRate: 4 },
  fast: { wpm: 85, typoRate: 6 },
  pro: { wpm: 125, typoRate: 2 },
};

const SAMPLE = 'Merhaba! Bu satırları ben yazmıyorum, Autowriter yazıyor. Arada bir tuşu kaçırıyor, fark edip düzeltiyor.';

const $ = (id) => document.getElementById(id);
const sourceValue = () => document.querySelector('input[name="source"]:checked').value;

let clipboardText = '';

// ------------------------------------------------------------------ mesaj

function setMsg(text, ok) {
  const el = $('msg');
  el.textContent = text || '';
  el.classList.toggle('ok', !!ok);
}

// --------------------------------------------------------------- ayarlar

function collect() {
  return {
    wpm: Number($('wpm').value),
    typoRate: Number($('typoRate').value),
    startDelay: Number($('startDelay').value),
    source: sourceValue(),
    customText: $('customText').value,
    preset: currentPreset(),
  };
}

function currentPreset() {
  const wpm = Number($('wpm').value);
  const typo = Number($('typoRate').value);
  for (const [name, p] of Object.entries(PRESETS)) {
    if (p.wpm === wpm && p.typoRate === typo) return name;
  }
  return 'custom';
}

function render() {
  $('wpmVal').textContent = `${$('wpm').value} kelime/dk`;
  $('typoVal').textContent = `%${$('typoRate').value}`;
  $('delayVal').textContent = Number($('startDelay').value) === 0 ? 'hemen' : `${$('startDelay').value} sn`;
  $('metaSpeed').textContent = `${$('wpm').value} kelime/dk, %${$('typoRate').value} hata`;

  const preset = currentPreset();
  document.querySelectorAll('.key').forEach((k) => {
    k.setAttribute('aria-checked', String(k.dataset.preset === preset));
  });

  const custom = sourceValue() === 'custom';
  $('customText').hidden = !custom;
  $('clipInfo').hidden = custom;
}

let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => chrome.storage.local.set(collect()), 150);
}

// ----------------------------------------------------------------- pano

async function refreshClipboard() {
  const info = $('clipInfo');
  try {
    clipboardText = await navigator.clipboard.readText();
  } catch (e) {
    clipboardText = '';
  }
  info.classList.toggle('empty', !clipboardText.trim());
  info.textContent = '';
  if (!clipboardText.trim()) {
    info.textContent = 'Pano boş. Önce yazdırmak istediğin metni kopyala.';
    return;
  }
  const flat = clipboardText.replace(/\s+/g, ' ').trim();
  const q = document.createElement('q');
  q.textContent = flat.length > 34 ? flat.slice(0, 34) + '…' : flat;
  info.append(`${clipboardText.length} karakter: `, q);
}

// -------------------------------------------------------- canlı önizleme

const preview = (() => {
  const box = $('preview');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let token = 0;
  let caret;
  let live = [];
  let fixes = 0;
  let caretTimer = null;

  function sampleText() {
    const own = sourceValue() === 'custom' ? $('customText').value : clipboardText;
    const t = (own || '').replace(/\s+/g, ' ').trim();
    if (t.length < 12) return SAMPLE;
    return t.length > 120 ? t.slice(0, 120).replace(/\s+\S*$/, '') + '…' : t;
  }

  function reset() {
    box.textContent = '';
    live = [];
    fixes = 0;
    $('metaFixes').textContent = '0 düzeltme';
    caret = document.createElement('span');
    caret.className = 'caret';
    box.append(caret);
  }

  function wait(ms, my) {
    return new Promise((resolve, reject) =>
      setTimeout(() => (my === token ? resolve() : reject(new Error('aborted'))), ms)
    );
  }

  function markTyping() {
    caret.classList.add('typing');
    clearTimeout(caretTimer);
    caretTimer = setTimeout(() => caret.classList.remove('typing'), 450);
  }

  async function loop(my) {
    const s = collect();
    for (;;) {
      reset();
      const text = sampleText();
      if (reduced) {
        caret.before(text);
        return;
      }
      let erasing = false;
      try {
        await wait(400, my);
        await AutowriterEngine.humanType(
          text,
          {
            isAborted: () => my !== token,
            sleep: (ms) => wait(ms, my),
            insert(ch) {
              if (erasing) {
                erasing = false;
                caret.classList.remove('fixing');
              }
              const span = document.createElement('span');
              span.textContent = ch;
              caret.before(span);
              live.push(span);
              markTyping();
            },
            backspace() {
              const span = live.pop();
              if (!span) return;
              if (!erasing) {
                erasing = true;
                fixes++;
                const m = $('metaFixes');
                m.textContent = `${fixes} düzeltme`;
                m.classList.add('bump');
                setTimeout(() => m.classList.remove('bump'), 600);
              }
              caret.classList.add('fixing');
              span.classList.add('struck');
              setTimeout(() => span.remove(), 140);
            },
          },
          { wpm: s.wpm, typoRate: s.typoRate }
        );
        await wait(2200, my);
        box.classList.add('fading');
        await wait(380, my);
        box.classList.remove('fading');
      } catch (e) {
        return;
      }
    }
  }

  let restartTimer = null;
  function restart() {
    clearTimeout(restartTimer);
    restartTimer = setTimeout(() => {
      token++;
      box.classList.remove('fading');
      loop(token);
    }, 250);
  }

  return { restart };
})();

// ------------------------------------------------------------- başlatma

async function sendToTab(tabId, message) {
  try {
    await chrome.tabs.sendMessage(tabId, message);
  } catch (e) {
    // Eklenti kurulmadan önce açılmış sekme: içerik betiğini elle ekle
    await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      files: ['engine.js', 'content.js'],
    });
    await chrome.tabs.sendMessage(tabId, message);
  }
}

$('start').addEventListener('click', async () => {
  setMsg('');
  const settings = collect();
  await chrome.storage.local.set(settings);

  let text = settings.customText;
  if (settings.source === 'clipboard') {
    await refreshClipboard();
    text = clipboardText;
  }
  if (!text || !text.trim()) {
    setMsg(
      settings.source === 'clipboard'
        ? 'Pano boş. Önce yazdırmak istediğin metni kopyala.'
        : 'Yazılacak metin boş. Kutucuğa bir metin yapıştır.'
    );
    return;
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || tab.id == null) {
    setMsg('Açık bir sekme bulunamadı.');
    return;
  }
  try {
    await sendToTab(tab.id, { type: 'start-pick', text, settings });
    window.close();
  } catch (e) {
    setMsg('Tarayıcı bu sayfada eklentilere izin vermiyor. Normal bir web sayfasında dene.');
  }
});

$('stop').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab && tab.id != null) chrome.tabs.sendMessage(tab.id, { type: 'stop' }).catch(() => {});
  setMsg('Yazma durduruldu.', true);
});

// ------------------------------------------------------------------ ilk yük

async function init() {
  try {
    $('version').textContent = 'v' + chrome.runtime.getManifest().version;
  } catch (e) {
    /* önizleme sayfasında manifest yok */
  }

  const s = await chrome.storage.local.get(DEFAULTS);
  $('wpm').value = s.wpm;
  $('typoRate').value = s.typoRate;
  $('startDelay').value = s.startDelay;
  $('customText').value = s.customText;
  const radio = document.querySelector(`input[name="source"][value="${s.source}"]`) || document.querySelector('input[name="source"]');
  radio.checked = true;
  if (currentPreset() === 'custom') $('tune').open = true;
  render();

  await refreshClipboard();
  preview.restart();

  document.querySelectorAll('.key').forEach((k) =>
    k.addEventListener('click', () => {
      const p = PRESETS[k.dataset.preset];
      $('wpm').value = p.wpm;
      $('typoRate').value = p.typoRate;
      render();
      save();
      preview.restart();
    })
  );

  document.querySelectorAll('input[type="range"]').forEach((el) =>
    el.addEventListener('input', () => {
      render();
      save();
      if (el.id !== 'startDelay') preview.restart();
    })
  );

  document.querySelectorAll('input[name="source"]').forEach((el) =>
    el.addEventListener('change', () => {
      render();
      save();
      preview.restart();
      if (sourceValue() === 'custom') $('customText').focus();
    })
  );

  $('customText').addEventListener('input', () => {
    save();
    preview.restart();
  });
}

init();
