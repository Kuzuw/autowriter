# Privacy

Autowriter does not collect, store or send any data.

- **Clipboard:** read only when you start typing, and only typed into the field you choose.
- **Settings:** speed, typo rate, delay, keyboard layout and your own text are kept in the browser's local storage (`chrome.storage.local`). They never leave your computer.
- **Network:** the extension makes no network requests. No analytics, tracking or ads.
- **Password fields:** skipped, always.

## Permissions and why they're needed

| Permission | Why |
| --- | --- |
| `activeTab`, `scripting` | To add the script to a tab that was open before the extension was installed, when you start from the popup |
| `storage` | To remember your settings |
| `contextMenus` | For the "Autowriter: type here" right-click item |
| `clipboardRead` | To read the text you copied |
| Content script on `<all_urls>` | To work in text fields on any site |

Questions or problems: [GitHub Issues](https://github.com/Kuzuw/autowriter/issues)
