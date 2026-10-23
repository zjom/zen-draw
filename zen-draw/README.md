# zen-draw

A minimal offline whiteboard: zenboard (the Excalidraw fork in this repository) in a
[Tauri](https://tauri.app) shell, with keyboard shortcuts configured from `$XDG_CONFIG_HOME`.

zen-draw builds against the source in `../packages`, so a change to the editor shows up
in zen-draw without a package build.

## Develop

Run these commands in the repository root:

```sh
devenv shell         # or install Rust, Node 26, pnpm and the Tauri prerequisites yourself
pnpm install
pnpm zen-draw:dev
pnpm zen-draw:build  # release bundles in zen-draw/src-tauri/target/release/bundle
```

With Nix (Linux), also in the repository root:

```sh
nix run .    # or `nix build`; result/bin/zen-draw
```

The flake also exposes `overlays.default`. After a change to `pnpm-lock.yaml`, update the
`pnpmDeps` hash in `package.nix`.

Open a file from the command line with `zen-draw drawing.excalidraw`, or with hotkeys Open / Save / Save as, default `Ctrl/Cmd+O`, `+S`, `+Shift+S`.

## Configuration

`$XDG_CONFIG_HOME/zen-draw/config.toml`, falling back to
`~/.config/zen-draw/config.toml`. The same path is used on Linux, macOS and Windows.
See [`config.example.toml`](config.example.toml).
