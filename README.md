# simple-whiteboard

A minimal offline whiteboard: [Excalidraw](https://excalidraw.com) in a [Tauri](https://tauri.app) shell,
with keyboard shortcuts configured from `$XDG_CONFIG_HOME`.

## Develop

```sh
devenv shell         # or install Rust, Node 26 and the Tauri prerequisites yourself
npm install
npm run tauri dev
npm run tauri build  # release bundles in src-tauri/target/release/bundle
```

With Nix (Linux):

```sh
nix run .    # or `nix build`; result/bin/simple-whiteboard
```

The flake also exposes `overlays.default`. After changing `package-lock.json`, update the
`npmDeps` hash in `package.nix`.

Open a file from the command line with `simple-whiteboard drawing.excalidraw`, or with hotkeys Open / Save / Save as, default `Ctrl/Cmd+O`, `+S`, `+Shift+S`.

## Configuration

`$XDG_CONFIG_HOME/simple-whiteboard/config.toml`, falling back to
`~/.config/simple-whiteboard/config.toml`. The same path is used on Linux, macOS and Windows.
See [`config.example.toml`](config.example.toml).
