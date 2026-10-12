# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [1.0.0] - 2026-10-13

First release.

### Added
- Types the copied text (or your own text) into the chosen field like a person: uneven rhythm, pauses at punctuation, occasional "thinking" breaks.
- Realistic typos that get noticed and corrected: neighbouring key, doubled letter, swapped letters, skipped letter.
- Keyboard layout picker: English (QWERTY), Turkish Q, Turkish F, German (QWERTZ), French (AZERTY), Spanish (QWERTY) and Dvorak. Neighbouring-key typos follow the chosen layout. The default comes from the browser language.
- Three ways to start: pick a field from the popup, `Alt+Shift+W`, or the right-click menu. `Esc` stops at any time.
- Popup with a live preview, Calm / Natural / Fast / Pro presets, and fine-tuning for speed, typo rate and start delay.
- On-page indicator with progress, a stop button and a characters/fixes summary, rendered in a Shadow DOM so site CSS can't break it.
- Works in `input`, `textarea` and `contenteditable` fields, including iframes and Shadow DOM. Skips password fields.
- English and Turkish interface; light and dark themes.
- Tests, manifest and locale checks, CI, and automatic release packaging.

[1.0.0]: https://github.com/Kuzuw/autowriter/releases/tag/v1.0.0
