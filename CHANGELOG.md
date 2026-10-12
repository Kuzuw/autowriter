# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [1.2.0] - 2026-10-13

### Added
- Keyboard layout picker: English (QWERTY), Turkish Q, Turkish F, German (QWERTZ), French (AZERTY), Spanish (QWERTY) and Dvorak. Neighbouring-key typos follow the chosen layout, with correct casing for Turkish dotted and dotless i.
- The default layout is picked from the browser language on first run.
- English and Turkish interface. English is the default; Turkish is used when the browser language is Turkish.
- Manifest check now validates locales: matching keys in every language and no missing strings.

### Changed
- README, docs, issue templates and the playground page are now in English, with a Turkish summary in the README.
- Banner updated.

### Removed
- Credit line in the popup footer.

## [1.1.0] - 2026-10-13

### Added
- Live preview in the popup: the real engine types with your settings, typos and fixes included.
- Typing style presets: Calm, Natural, Fast, Pro. Detailed settings under "Fine-tune".
- Clipboard length and first words shown in the popup.
- On-page indicator with progress bar, percentage, `Esc` to stop, and a characters/fixes summary when done.
- "Type here" label while picking a field.
- Light and dark themes.
- New icon and visual identity.
- `npm test`, `npm run build`, manifest validation, CI and release packaging with GitHub Actions.
- `test/playground.html` for manual testing.

### Changed
- The on-page indicator renders inside a Shadow DOM, so site CSS can't break it.

## [1.0.0] - 2026-10-13

### Added
- First release: types the clipboard text into the chosen field like a person.
- Neighbouring-key, doubled-letter, swapped-letter and skipped-letter typos, noticed and corrected.
- Popup, `Alt+Shift+W` shortcut and context menu.

[1.2.0]: https://github.com/Kuzuw/autowriter/releases/tag/v1.2.0
[1.1.0]: https://github.com/Kuzuw/autowriter/compare/a0a33af...d6fa516
[1.0.0]: https://github.com/Kuzuw/autowriter/commit/5b2ec99
