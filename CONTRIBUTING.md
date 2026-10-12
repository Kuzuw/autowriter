# Contributing

Thanks for wanting to help with Autowriter. Bug reports, ideas and pull requests are all welcome.

## Setup

There's no build step: the extension is plain JavaScript, HTML and CSS.

1. Clone the repo: `git clone https://github.com/Kuzuw/autowriter`
2. Open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked** and select the folder.
3. After changing code, press the reload button on the extension card and reload the tab you're testing.
4. To try things by hand, serve the repo with `python3 -m http.server` and open `test/playground.html`.

## Tests

```bash
npm test         # engine tests + manifest and locale checks
npm run build    # builds dist/autowriter-<version>.zip
```

The typing engine (`engine.js`) doesn't touch the DOM. If you change it, the core rule in `test/engine.test.js` must keep passing: whatever typos happen, the final text must equal the source text exactly.

## Adding a keyboard layout

1. Add an entry to `LAYOUTS` in `engine.js`. Write the three letter rows in lowercase, aligned like a physical keyboard (use a space for a non-letter key).
2. Add a `layout_<id>` string for every language in `scripts/locales.py`, then run `python3 scripts/locales.py`.
3. Add an `<option>` to the layout picker in `popup.html`.
4. Add a neighbour check to `test/engine.test.js`.

## Translations

All UI strings live in `scripts/locales.py`. Add a column for your language there, run the script, and `npm test` will tell you if anything is missing.

## Pull requests

- Keep each PR to one topic.
- Keep UI text short and plain, and add it in every language.
- If you need a new permission, explain why in the PR description.
- Add a line to the top of `CHANGELOG.md`.

## Images

The icon and banner are rendered from the HTML files in `design/`:

```bash
python3 design/render_icons.py
```
