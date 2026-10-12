(() => {
  'use strict';
  if (window.__autowriterLoaded) return;
  window.__autowriterLoaded = true;

  const Engine = self.AutowriterEngine;
  const DEFAULTS = { wpm: 55, typoRate: 4, startDelay: 2, source: 'clipboard', customText: '' };

  const state = { running: false, abort: false };
  let cancelSleep = null;
  let lastContextTarget = null;

  const getSettings = () =>
    new Promise((resolve) => {
      try {
        chrome.storage.local.get(DEFAULTS, (v) => resolve({ ...DEFAULTS, ...v }));
      } catch (e) {
        resolve({ ...DEFAULTS });
      }
    });

  // ---------------------------------------------------------------- yardımcılar

  const abortError = () => new Error('aborted');

  function sleep(ms) {
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => {
        cancelSleep = null;
        resolve();
      }, ms);
      cancelSleep = () => {
        clearTimeout(t);
        cancelSleep = null;
        reject(abortError());
      };
    });
  }

  function stop() {
    if (!state.running) return;
    state.abort = true;
    if (cancelSleep) cancelSleep();
  }

  const TEXT_TYPES = new Set(['text', 'search', 'url', 'email', 'tel', '']);

  function isTextControl(el) {
    if (el instanceof HTMLTextAreaElement) return !el.readOnly && !el.disabled;
    if (el instanceof HTMLInputElement) {
      return TEXT_TYPES.has((el.getAttribute('type') || '').toLowerCase()) && !el.readOnly && !el.disabled;
    }
    return false;
  }

  // Yazılabilir en yakın öğeyi bulur (input/textarea ya da contenteditable "host")
  function closestEditable(node) {
    while (node) {
      if (node.nodeType === 1) {
        if (isTextControl(node)) return node;
        if (node.isContentEditable) {
          let host = node;
          while (host.parentElement && host.parentElement.isContentEditable) host = host.parentElement;
          return host;
        }
      }
      node = node.parentElement || (node.getRootNode && node.getRootNode().host) || null;
    }
    return null;
  }

  function deepActive() {
    let a = document.activeElement;
    while (a && a.shadowRoot && a.shadowRoot.activeElement) a = a.shadowRoot.activeElement;
    return a;
  }

  const isPassword = (el) =>
    el instanceof HTMLInputElement && (el.getAttribute('type') || '').toLowerCase() === 'password';

  function placeCaretEnd(el) {
    try {
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        const n = el.value.length;
        el.setSelectionRange(n, n);
      } else {
        const sel = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    } catch (e) {
      /* bazı input türleri seçimi desteklemez */
    }
  }

  function saveCaret(el) {
    try {
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        return { s: el.selectionStart, e: el.selectionEnd };
      }
      const sel = window.getSelection();
      if (sel.rangeCount) return { range: sel.getRangeAt(0).cloneRange() };
    } catch (e) {
      /* yoksay */
    }
    return null;
  }

  function restoreCaret(el, saved) {
    if (!saved) return;
    try {
      if (saved.range) {
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(saved.range);
      } else if (saved.s != null) {
        el.setSelectionRange(saved.s, saved.e);
      }
    } catch (e) {
      /* yoksay */
    }
  }

  // ------------------------------------------------------------------ pano

  async function readClipboard(restoreEl) {
    let text = '';
    const saved = restoreEl ? saveCaret(restoreEl) : null;
    try {
      const ta = document.createElement('textarea');
      ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0;';
      document.documentElement.appendChild(ta);
      ta.focus();
      if (document.execCommand('paste')) text = ta.value;
      ta.remove();
    } catch (e) {
      /* yoksay */
    }
    if (restoreEl) {
      restoreEl.focus({ preventScroll: true });
      restoreCaret(restoreEl, saved);
    }
    if (!text) {
      try {
        text = await navigator.clipboard.readText();
      } catch (e) {
        /* izin yok */
      }
    }
    return text || '';
  }

  async function resolveText(settings, el) {
    if (settings.source === 'custom') return settings.customText || '';
    return readClipboard(el);
  }

  // ------------------------------------------------------------ durum balonu

  let overlay = null;
  let overlayLabel = null;
  let overlayBtn = null;
  let hideTimer = null;

  function ensureOverlay() {
    if (overlay && overlay.isConnected) return;
    overlay = document.createElement('div');
    overlay.setAttribute('data-autowriter', '');
    overlay.style.cssText =
      'position:fixed;right:16px;bottom:16px;z-index:2147483647;display:flex;gap:10px;align-items:center;' +
      'background:#111827;color:#fff;font:13px/1.4 system-ui,-apple-system,Segoe UI,sans-serif;' +
      'padding:8px 12px;border-radius:10px;box-shadow:0 6px 24px rgba(0,0,0,.35);max-width:80vw;';
    overlayLabel = document.createElement('span');
    overlayBtn = document.createElement('button');
    overlayBtn.textContent = 'Durdur';
    overlayBtn.style.cssText =
      'all:unset;cursor:pointer;background:#ef4444;color:#fff;padding:3px 10px;border-radius:6px;font-size:12px;';
    // Düğmeye basmak hedef alanın odağını çalmasın
    overlayBtn.addEventListener('mousedown', (e) => e.preventDefault());
    overlayBtn.addEventListener('click', () => stop());
    overlay.append(overlayLabel, overlayBtn);
    document.documentElement.appendChild(overlay);
  }

  function showStatus(text, withStop, autoHideMs) {
    clearTimeout(hideTimer);
    ensureOverlay();
    overlayLabel.textContent = text;
    overlayBtn.style.display = withStop ? '' : 'none';
    if (autoHideMs) hideTimer = setTimeout(hideOverlay, autoHideMs);
  }

  function hideOverlay() {
    clearTimeout(hideTimer);
    if (overlay) overlay.remove();
    overlay = null;
  }

  const toast = (text) => showStatus(text, false, 3000);

  // ------------------------------------------------------------ yazma işlemi

  function fire(el, type, key) {
    el.dispatchEvent(new KeyboardEvent(type, { key, bubbles: true, cancelable: true, composed: true }));
  }

  function ensureFocus(el) {
    const a = deepActive();
    if (a !== el && !(el.contains && el.contains(a))) el.focus({ preventScroll: true });
  }

  function nativeInsert(el, ch) {
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
      const s = el.selectionStart;
      const e = el.selectionEnd;
      setter.call(el, el.value.slice(0, s) + ch + el.value.slice(e));
      el.setSelectionRange(s + ch.length, s + ch.length);
    } else {
      const sel = window.getSelection();
      if (!sel.rangeCount) return;
      const r = sel.getRangeAt(0);
      r.deleteContents();
      const t = document.createTextNode(ch);
      r.insertNode(t);
      r.setStartAfter(t);
      r.collapse(true);
      sel.removeAllRanges();
      sel.addRange(r);
    }
    el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: ch }));
  }

  function nativeDelete(el) {
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
      let s = el.selectionStart;
      const e = el.selectionEnd;
      if (s === e) s = Math.max(0, s - 1);
      setter.call(el, el.value.slice(0, s) + el.value.slice(e));
      el.setSelectionRange(s, s);
    } else {
      const sel = window.getSelection();
      if (sel.isCollapsed && sel.modify) sel.modify('extend', 'backward', 'character');
      if (sel.rangeCount) sel.getRangeAt(0).deleteContents();
    }
    el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'deleteContentBackward' }));
  }

  function makeIO(el) {
    const single = el instanceof HTMLInputElement;
    const multiline = !single;
    const isCE = !(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement);
    return {
      isAborted: () => state.abort,
      sleep,
      insert(ch) {
        ensureFocus(el);
        const nl = ch === '\n';
        if (nl && single) ch = ' '; // tek satırlı alanda Enter formu göndermesin
        const key = nl && multiline ? 'Enter' : ch;
        fire(el, 'keydown', key);
        let ok;
        if (nl && isCE) ok = document.execCommand('insertParagraph');
        else ok = document.execCommand('insertText', false, ch);
        if (!ok) nativeInsert(el, ch);
        fire(el, 'keyup', key);
      },
      backspace() {
        ensureFocus(el);
        fire(el, 'keydown', 'Backspace');
        if (!document.execCommand('delete')) nativeDelete(el);
        fire(el, 'keyup', 'Backspace');
      },
      onProgress(i, n) {
        if (i % 10 === 0 || i === n) {
          showStatus(`Yazıyor… %${Math.round((i / Math.max(n, 1)) * 100)}  (Esc: durdur)`, true);
        }
      },
    };
  }

  async function run(el, text, settings, opts) {
    if (state.running) return;
    if (!text || !text.trim()) {
      toast('Yazılacak metin boş. Önce bir şey kopyala.');
      return;
    }
    if (isPassword(el)) {
      toast('Şifre alanlarına yazılmaz.');
      return;
    }

    state.running = true;
    state.abort = false;
    try {
      el.focus({ preventScroll: false });
      if (opts && opts.caretEnd) placeCaretEnd(el);

      for (let s = Math.max(0, Math.round(settings.startDelay)); s > 0; s--) {
        showStatus(`${s} sn sonra yazmaya başlıyor… (Esc: iptal)`, true);
        await sleep(1000);
      }

      showStatus('Yazıyor…  (Esc: durdur)', true);
      await Engine.humanType(text, makeIO(el), { wpm: settings.wpm, typoRate: settings.typoRate });
      showStatus('Bitti ✓', false, 1800);
    } catch (e) {
      if (e && e.message === 'aborted') showStatus('Durduruldu', false, 1500);
      else {
        console.error('[Autowriter]', e);
        showStatus('Hata: ' + (e && e.message ? e.message : e), false, 4000);
      }
    } finally {
      state.running = false;
      state.abort = false;
      cancelSleep = null;
    }
  }

  // ------------------------------------------------------------- alan seçme

  const pick = { active: false, box: null, listeners: [], text: null, settings: null };

  function exitPick() {
    if (!pick.active) return;
    pick.active = false;
    pick.listeners.forEach(([type, fn, capture]) => window.removeEventListener(type, fn, capture));
    pick.listeners = [];
    if (pick.box) pick.box.remove();
    pick.box = null;
    if (!state.running) hideOverlay();
  }

  function startPick(text, settings) {
    if (state.running) return;
    exitPick();
    pick.active = true;
    pick.text = text;
    pick.settings = { ...DEFAULTS, ...(settings || {}) };

    const box = document.createElement('div');
    box.setAttribute('data-autowriter', '');
    box.style.cssText =
      'position:fixed;display:none;pointer-events:none;z-index:2147483646;box-sizing:border-box;' +
      'border:2px solid #6366f1;background:rgba(99,102,241,.12);border-radius:4px;';
    document.documentElement.appendChild(box);
    pick.box = box;

    if (window === window.top) showStatus('Yazılacak alanı seç… (Esc: iptal)', false);

    const inOverlay = (e) => {
      const t = e.target;
      return t && t.closest && t.closest('[data-autowriter]');
    };
    const swallow = (e) => {
      if (inOverlay(e)) return;
      e.preventDefault();
      e.stopImmediatePropagation();
    };
    const onMove = (e) => {
      const t = closestEditable(e.composedPath()[0]);
      if (!t) {
        box.style.display = 'none';
        return;
      }
      const r = t.getBoundingClientRect();
      Object.assign(box.style, {
        display: 'block',
        left: r.left + 'px',
        top: r.top + 'px',
        width: r.width + 'px',
        height: r.height + 'px',
      });
    };
    const onClick = (e) => {
      if (inOverlay(e)) return;
      swallow(e);
      const t = closestEditable(e.composedPath()[0]);
      if (!t) {
        if (window === window.top) showStatus('Bu bir yazı alanı değil. Bir kutuya tıkla (Esc: iptal)', false);
        return;
      }
      const txt = pick.text;
      const s = pick.settings;
      exitPick();
      try {
        chrome.runtime.sendMessage({ type: 'pick-done' });
      } catch (err) {
        /* yoksay */
      }
      run(t, txt, s, { caretEnd: true });
    };

    pick.listeners = [
      ['mousemove', onMove, true],
      ['mousedown', swallow, true],
      ['mouseup', swallow, true],
      ['pointerdown', swallow, true],
      ['pointerup', swallow, true],
      ['click', onClick, true],
    ];
    pick.listeners.forEach(([type, fn, capture]) => window.addEventListener(type, fn, capture));
  }

  // Esc: çalışan yazmayı durdur / seçim modunu iptal et
  window.addEventListener(
    'keydown',
    (e) => {
      if (e.key !== 'Escape') return;
      if (state.running) {
        e.preventDefault();
        e.stopImmediatePropagation();
        stop();
      } else if (pick.active) {
        e.preventDefault();
        e.stopImmediatePropagation();
        exitPick();
        try {
          chrome.runtime.sendMessage({ type: 'pick-done' });
        } catch (err) {
          /* yoksay */
        }
      }
    },
    true
  );

  document.addEventListener(
    'contextmenu',
    (e) => {
      lastContextTarget = e.composedPath()[0] || e.target;
    },
    true
  );

  // ------------------------------------------------------- kısayol / sağ tık

  async function onFocusedStart() {
    if (state.running) {
      stop();
      return;
    }
    if (!document.hasFocus()) return;
    const a = deepActive();
    if (!a || a.tagName === 'IFRAME' || a.tagName === 'FRAME') return; // alt frame ilgilenir
    const el = closestEditable(a);
    if (!el) {
      if (window === window.top) toast('Önce yazı yazılacak alana tıkla, sonra tekrar dene.');
      return;
    }
    const settings = await getSettings();
    const text = await resolveText(settings, el);
    run(el, text, settings, {});
  }

  async function onContextStart() {
    if (state.running) {
      stop();
      return;
    }
    const el = lastContextTarget && closestEditable(lastContextTarget);
    if (!el) {
      toast('Yazılabilir bir alan bulunamadı.');
      return;
    }
    el.focus({ preventScroll: true });
    const settings = await getSettings();
    const text = await resolveText(settings, el);
    run(el, text, settings, {});
  }

  chrome.runtime.onMessage.addListener((msg) => {
    if (!msg) return;
    switch (msg.type) {
      case 'start-pick':
        startPick(msg.text, msg.settings);
        break;
      case 'start-focused':
        onFocusedStart();
        break;
      case 'start-context':
        onContextStart();
        break;
      case 'stop':
        stop();
        exitPick();
        break;
      case 'exit-pick':
        exitPick();
        break;
    }
  });
})();
