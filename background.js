'use strict';

const MENU_ID = 'autowriter-type';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: MENU_ID,
    title: 'Autowriter: metni buraya yaz',
    contexts: ['editable'],
  });
});

// Sağ tık menüsü -> tıklanan alana yaz
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== MENU_ID || !tab || tab.id == null) return;
  const opts = info.frameId != null ? { frameId: info.frameId } : undefined;
  chrome.tabs.sendMessage(tab.id, { type: 'start-context' }, opts).catch(() => {});
});

// Kısayol -> odaktaki alana yaz
chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'start-typing') return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || tab.id == null) return;
  chrome.tabs.sendMessage(tab.id, { type: 'start-focused' }).catch(() => {});
});

// Bir frame'de alan seçildiyse diğer frame'lerdeki seçim modunu kapat
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg && msg.type === 'pick-done' && sender.tab) {
    chrome.tabs.sendMessage(sender.tab.id, { type: 'exit-pick' }).catch(() => {});
  }
});
