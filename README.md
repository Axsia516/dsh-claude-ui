# Claude UI + ClaudePet

An unofficial Claude-style skin for the DeepSeek Harness Web UI, together with the ClaudePet Windows desktop companion.

## Install from the plugin index

In DSH open **Plugins → Discover → Add index source** and enter:

```text
https://raw.githubusercontent.com/Axsia516/dsh-claude-ui/main/docs/index.json
```

Then install **Claude UI + ClaudePet** from the card. The index also works from GitHub Pages:

```text
https://Axsia516.github.io/dsh-claude-ui/index.json
```

## Direct install

Download the release tarball and add it to a profile:

```sh
dsh plugin --profile desktop add ./dsh-claude-ui-1.2.0.tgz
```

Enable the bundle in **Plugins**, restart DSH, then refresh the Web UI.

## What it does

- Claude palette, typography, wording and composer/message chrome for the Web UI.
- Model labels: `DeepSeek-V4.1-Flash` shows as **Opus 5.5**, V4 Pro as **Sonnet 5.5**; model menus show **Claude** as the provider. These are display labels only.
- ClaudePet: a transparent always-on-top Windows companion with expressions, drag, notes, sounds and reactions. It starts when the bundle is enabled and stops when it is disabled.
- The pet is copied to `%LOCALAPPDATA%\ClaudePet\app` before launch; logs and heartbeat live under `%APPDATA%\ClaudePet`. The executable is unsigned, and the current pet build speaks Chinese.
- The Web skin works on other platforms; the pet is Windows-only.

## Layout

- `package/` — the installable DSH bundle, including `pet/`, locales, README and detail images.
- `docs/` — the plugin-market index and icon.

## Notes

This is a community project, not affiliated with Anthropic or DeepSeek. The app-level native menu labels and first-frame splash are separate application patches and are not part of this bundle.

MIT licensed. See [package/LICENSE](package/LICENSE).
