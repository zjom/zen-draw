# simple-whiteboard

A minimal offline whiteboard: [tldraw](https://tldraw.dev) in a [Tauri](https://tauri.app) shell,
with keyboard shortcuts configured from `$XDG_CONFIG_HOME`.

## Develop

```sh
nix develop          # or install Rust, Node 22 and the Tauri prerequisites yourself
npm install
npm run tauri dev
npm run tauri build  # release bundles in src-tauri/target/release/bundle
```

Open a file from the command line with `simple-whiteboard drawing.tldr`, or from the
main menu (Open / Save / Save as, default `Ctrl/Cmd+O`, `+S`, `+Shift+S`).

## Configuration

`$XDG_CONFIG_HOME/simple-whiteboard/config.toml`, falling back to
`~/.config/simple-whiteboard/config.toml`. The same path is used on Linux, macOS and Windows.
See [`config.example.toml`](config.example.toml).

## tldraw license

Release builds need a tldraw license key (tldraw hides the canvas ~5s after start
without one; dev builds are unaffected). Put it in the config file as `license_key`, or
set `VITE_TLDRAW_LICENSE_KEY` at build time. See <https://tldraw.dev/pricing>.
