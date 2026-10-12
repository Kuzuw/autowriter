(() => {
  'use strict';
  if (window.__autowriterLoaded) return;
  window.__autowriterLoaded = true;

  const Engine = self.AutowriterEngine;
  const L = (key, ...subs) => chrome.i18n.getMessage(key, subs.map(String)) || key;
  const DEFAULTS = {
    wpm: 55,
    typoRate: 4,
    startDelay: 2,
    source: 'clipboard',
    customText: '',
    layout: Engine.layoutForLanguage(chrome.i18n.getUILanguage()),
  };

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

  // ----------------------------------------------------------------- helpers

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

  // Finds the nearest editable element (input/textarea or the contenteditable host)
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
      /* some input types don't support selection */
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
      /* ignore */
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
      /* ignore */
    }
  }

  // --------------------------------------------------------------- clipboard

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
      /* ignore */
    }
    if (restoreEl) {
      restoreEl.focus({ preventScroll: true });
      restoreCaret(restoreEl, saved);
    }
    if (!text) {
      try {
        text = await navigator.clipboard.readText();
      } catch (e) {
        /* no permission */
      }
    }
    return text || '';
  }

  async function resolveText(settings, el) {
    if (settings.source === 'custom') return settings.customText || '';
    return readClipboard(el);
  }

  // ------------------------------------------------------------ status pill

  // Drawn inside a Shadow DOM so the page's CSS can't affect it.
  const OVERLAY_CSS = `
    :host { all: initial; }
    .pill {
      position: fixed; right: 18px; bottom: 18px; z-index: 2147483647;
      display: flex; align-items: center; gap: 10px;
      min-width: 220px; max-width: min(420px, calc(100vw - 36px));
      padding: 9px 9px 11px 14px; overflow: hidden;
      background: #1b2340; color: #eef1fa; border-radius: 12px;
      box-shadow: 0 1px 0 rgba(255,255,255,.06) inset, 0 12px 32px rgba(15,20,40,.35);
      font: 500 13px/1.35 system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
      animation: in .18s ease-out;
    }
    @keyframes in { from { opacity: 0; transform: translateY(6px); } }
    .icon { flex: none; width: 14px; display: grid; place-items: center; }
    .bar-caret { width: 2px; height: 15px; background: #7d93ff; animation: blink 1s steps(1) infinite; }
    @keyframes blink { 50% { opacity: 0; } }
    .done .bar-caret, .error .bar-caret, .info .bar-caret { display: none; }
    .tick { display: none; color: #6ee7a8; font-size: 14px; }
    .done .tick { display: block; }
    .dot { display: none; width: 8px; height: 8px; border-radius: 50%; background: #ff6b6f; }
    .error .dot { display: block; }
    .info .dot { display: block; background: #7d93ff; }
    .label { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .pct { color: #9aa4c4; font-variant-numeric: tabular-nums; }
    button {
      all: unset; flex: none; display: flex; align-items: center; gap: 6px; cursor: pointer;
      padding: 4px 8px 4px 6px; border-radius: 8px; color: #eef1fa; font-size: 12px;
      background: rgba(255,255,255,.08);
    }
    button:hover { background: #e5484d; }
    button:focus-visible { outline: 2px solid #7d93ff; outline-offset: 2px; }
    kbd {
      padding: 0 4px; border: 1px solid rgba(255,255,255,.25); border-bottom-width: 2px;
      border-radius: 4px; font: 600 10px/1.5 system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
    }
    .progress { position: absolute; left: 0; bottom: 0; height: 3px; width: 100%; background: rgba(255,255,255,.08); }
    .progress i { display: block; height: 100%; width: 0; background: #7d93ff; transition: width .2s linear; }
    .done .progress i { background: #6ee7a8; }
    @media (prefers-reduced-motion: reduce) { .bar-caret, .pill { animation: none; } }
  `;

  let host = null;
  let ui = null;
  let hideTimer = null;

  function ensureOverlay() {
    if (host && host.isConnected) return;
    host = document.createElement('autowriter-status');
    host.setAttribute('data-autowriter', '');
    const root = host.attachShadow({ mode: 'closed' });
    root.innerHTML = `
      <style>${OVERLAY_CSS}</style>
      <div class="pill" role="status" aria-live="polite">
        <span class="icon"><span class="bar-caret"></span><span class="tick">✓</span><span class="dot"></span></span>
        <span class="label"></span>
        <span class="pct"></span>
        <button type="button"><kbd>Esc</kbd><span class="btn-text"></span></button>
        <span class="progress"><i></i></span>
      </div>`;
    ui = {
      pill: root.querySelector('.pill'),
      label: root.querySelector('.label'),
      pct: root.querySelector('.pct'),
      btn: root.querySelector('button'),
      btnText: root.querySelector('.btn-text'),
      bar: root.querySelector('.progress'),
      fill: root.querySelector('.progress i'),
    };
    // Pressing the button must not steal focus from the target field
    ui.btn.addEventListener('mousedown', (e) => e.preventDefault());
    ui.btn.addEventListener('click', () => {
      stop();
      exitPick();
    });
    document.documentElement.appendChild(host);
  }

  /**
   * @param {string} text
   * @param {{tone?: 'typing'|'done'|'error'|'info', progress?: number, stop?: boolean, hideAfter?: number}} o
   */
  function showStatus(text, o) {
    o = o || {};
    clearTimeout(hideTimer);
    ensureOverlay();
    ui.pill.className = 'pill ' + (o.tone || 'typing');
    ui.label.textContent = text;
    const hasProgress = typeof o.progress === 'number';
    ui.bar.style.display = hasProgress ? '' : 'none';
    ui.pct.textContent = hasProgress && (o.tone || 'typing') === 'typing' ? L('percentValue', Math.round(o.progress * 100)) : '';
    if (hasProgress) ui.fill.style.width = `${Math.round(o.progress * 1000) / 10}%`;
    ui.btn.style.display = o.stop ? '' : 'none';
    ui.btnText.textContent = o.stopLabel || L('btnStop');
    if (o.hideAfter) hideTimer = setTimeout(hideOverlay, o.hideAfter);
  }

  function hideOverlay() {
    clearTimeout(hideTimer);
    if (host) host.remove();
    host = null;
    ui = null;
  }

  const toast = (text) => showStatus(text, { tone: 'error', hideAfter: 3200 });

  // ------------------------------------------------------------------ typing

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
        if (nl && single) ch = ' '; // Enter in a single-line field would submit the form
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
        if (i % 5 === 0 || i === n) {
          showStatus(L('statusTyping'), { progress: i / Math.max(n, 1), stop: true });
        }
      },
    };
  }

  async function run(el, text, settings, opts) {
    if (state.running) return;
    if (!text || !text.trim()) {
      toast(L('clipEmpty'));
      return;
    }
    if (isPassword(el)) {
      toast(L('toastPassword'));
      return;
    }

    state.running = true;
    state.abort = false;
    try {
      el.focus({ preventScroll: false });
      if (opts && opts.caretEnd) placeCaretEnd(el);

      for (let s = Math.max(0, Math.round(settings.startDelay)); s > 0; s--) {
        showStatus(L('statusCountdown', s), { tone: 'info', stop: true, stopLabel: L('btnCancel') });
        await sleep(1000);
      }

      showStatus(L('statusTyping'), { progress: 0, stop: true });
      const stats = await Engine.humanType(text, makeIO(el), {
        wpm: settings.wpm,
        typoRate: settings.typoRate,
        layout: settings.layout,
      });
      const done = stats.typos ? L('statusDoneFixes', stats.chars, stats.typos) : L('statusDone', stats.chars);
      showStatus(done, { tone: 'done', progress: 1, hideAfter: 2600 });
    } catch (e) {
      if (e && e.message === 'aborted') showStatus(L('statusStopped'), { tone: 'info', hideAfter: 1600 });
      else {
        console.error('[Autowriter]', e);
        showStatus(L('statusFailed', e && e.message ? e.message : e), { tone: 'error', hideAfter: 4000 });
      }
    } finally {
      state.running = false;
      state.abort = false;
      cancelSleep = null;
    }
  }

  // -------------------------------------------------------------- field picker

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
      'all:initial;position:fixed;display:none;pointer-events:none;z-index:2147483646;box-sizing:border-box;' +
      'border:2px solid #3355ff;background:rgba(51,85,255,.08);border-radius:6px;' +
      'box-shadow:0 0 0 4px rgba(51,85,255,.15);transition:all .08s ease-out;';
    const tag = document.createElement('div');
    tag.textContent = L('pickTag');
    tag.style.cssText =
      'all:initial;position:absolute;right:-2px;top:-2px;padding:2px 8px 3px 10px;border-radius:0 6px 0 8px;' +
      'background:#3355ff;color:#fff;font:600 11.5px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;white-space:nowrap;';
    box.appendChild(tag);
    document.documentElement.appendChild(box);
    pick.box = box;

    if (window === window.top) showStatus(L('pickPrompt'), { tone: 'info', stop: true, stopLabel: L('btnCancel') });

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
        if (window === window.top) {
          showStatus(L('pickNotField'), { tone: 'error', stop: true, stopLabel: L('btnCancel') });
        }
        return;
      }
      const txt = pick.text;
      const s = pick.settings;
      exitPick();
      try {
        chrome.runtime.sendMessage({ type: 'pick-done' });
      } catch (err) {
        /* ignore */
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

  // Esc: stop typing / cancel pick mode
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
          /* ignore */
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

  // ------------------------------------------------- shortcut / context menu

  async function onFocusedStart() {
    if (state.running) {
      stop();
      return;
    }
    if (!document.hasFocus()) return;
    const a = deepActive();
    if (!a || a.tagName === 'IFRAME' || a.tagName === 'FRAME') return; // the child frame handles it
    const el = closestEditable(a);
    if (!el) {
      if (window === window.top) toast(L('toastFocusFirst'));
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
      toast(L('toastNoField'));
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
