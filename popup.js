'use strict';

const DEFAULTS = { wpm: 55, typoRate: 4, startDelay: 2, source: 'clipboard', customText: '' };
const $ = (id) => document.getElementById(id);
const setMsg = (t) => {
  $('msg').textContent = t || '';
};

function collect() {
  return {
    wpm: Number($('wpm').value),
    typoRate: Number($('typoRate').value),
    startDelay: Number($('startDelay').value),
    source: document.querySelector('input[name="source"]:checked').value,
    customText: $('customText').value,
  };
}

function refreshLabels() {
  $('wpmVal').textContent = $('wpm').value;
  $('typoVal').textContent = $('typoRate').value;
  $('delayVal').textContent = $('startDelay').value;
  $('customText').disabled = document.querySelector('input[name="source"]:checked').value !== 'custom';
}

const save = () => chrome.storage.local.set(collect());

async function refreshClipboardInfo() {
  try {
    const t = await navigator.clipboard.readText();
    $('clipInfo').textContent = t
      ? `${t.length} karakter: “${t.replace(/\s+/g, ' ').slice(0, 40)}${t.length > 40 ? '…' : ''}”`
      : 'Pano boş görünüyor.';
  } catch (e) {
    $('clipInfo').textContent = '';
  }
}

async function init() {
  const s = await chrome.storage.local.get(DEFAULTS);
  $('wpm').value = s.wpm;
  $('typoRate').value = s.typoRate;
  $('startDelay').value = s.startDelay;
  $('customText').value = s.customText;
  document.querySelector(`input[name="source"][value="${s.source}"]`).checked = true;
  refreshLabels();
  refreshClipboardInfo();

  document.querySelectorAll('input, textarea').forEach((el) =>
    el.addEventListener('input', () => {
      refreshLabels();
      save();
    })
  );
}

async function sendToTab(tabId, message) {
  try {
    await chrome.tabs.sendMessage(tabId, message);
  } catch (e) {
    // Eklenti yüklenmeden önce açılmış sekme: içerik betiğini elle enjekte et
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
  await save();

  let text = settings.customText;
  if (settings.source === 'clipboard') {
    try {
      text = await navigator.clipboard.readText();
    } catch (e) {
      text = '';
    }
  }
  if (!text || !text.trim()) {
    setMsg(
      settings.source === 'clipboard'
        ? 'Pano boş. Önce bir metin kopyala.'
        : 'Özel metin alanı boş.'
    );
    return;
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || tab.id == null) {
    setMsg('Aktif sekme bulunamadı.');
    return;
  }
  try {
    await sendToTab(tab.id, { type: 'start-pick', text, settings });
    window.close();
  } catch (e) {
    setMsg('Bu sayfada çalışamaz (chrome://, mağaza vb.). Normal bir sayfada dene.');
  }
});

$('stop').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab && tab.id != null) chrome.tabs.sendMessage(tab.id, { type: 'stop' }).catch(() => {});
  setMsg('Durdurma isteği gönderildi.');
});

init();
