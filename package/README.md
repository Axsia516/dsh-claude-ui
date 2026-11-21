# Claude UI + ClaudePet for DSH

An unofficial Claude-style skin for the DeepSeek Harness Web UI, shipped together with the ClaudePet Windows desktop companion.

## What the bundle changes

- Cream canvas, warm paper surfaces and Claude's terracotta accent.
- Serif assistant prose, sans-serif interface text, mono code.
- Claude wording, sidebar brand, composer card and message actions.
- Model labels are presentation-only:
  - `DeepSeek-V4.1-Flash` → **Opus 5.5**
  - `DeepSeek-V4-Pro` / `DeepSeek-V4.1-Pro` → **Sonnet 5.5**
  - Model menus show **Claude** as the provider.
  - Request routing and the configured models do not change.
- On Windows, the Host half starts ClaudePet while the bundle is enabled and stops it when the bundle is disabled.

## Install

From a plugin index, add the index URL in **Plugins → Discover → Add index source**, then install **Claude UI + ClaudePet**.

From a local tarball:

```sh
dsh plugin --profile desktop add ./dsh-claude-ui-1.2.0.tgz
```

Enable the bundle in **Plugins**, restart DSH, and refresh the Web UI. The client skin is a Web bundle; a page refresh is enough after the first install.

## ClaudePet

ClaudePet is a transparent, always-on-top desktop companion with expressions, drag, notes, sounds and small reactions. It is **Windows-only**.

- The shipped payload is copied to `%LOCALAPPDATA%\ClaudePet\app\ClaudePet.exe` before it runs.
- Runtime logs, heartbeat and the quit flag live under `%APPDATA%\ClaudePet`.
- The executable is unsigned; Windows SmartScreen may warn on first launch.
- The pet speaks Chinese in its current build.
- Disable the bundle to stop the pet. To keep the skin but skip the pet on Windows, set `pet: false` on the inserted `claude-ui` row in the profile configuration.
- The pet is a local companion; it does not require an API key.

## Notes

- This is a community project, not affiliated with Anthropic or DeepSeek.
- Model-provider labels are cosmetic. Do not treat them as a change of provider or billing.
- Some visual states depend on the installed DSH Web build; the skin follows stable slots and data attributes where possible.

## License

MIT. See [LICENSE](LICENSE).
