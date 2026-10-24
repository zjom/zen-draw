# zen-draw

A minimal offline whiteboard: zenboard (the Excalidraw fork in this repository) in a [Tauri](https://tauri.app) shell, with keyboard shortcuts configured from `$XDG_CONFIG_HOME`.

zen-draw builds against the source in `../packages`, so a change to the editor shows up in zen-draw without a package build.

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

The flake also exposes `overlays.default`. After a change to `pnpm-lock.yaml`, update the `pnpmDeps` hash in `package.nix`.

Open a file from the command line with `zen-draw drawing.excalidraw`, or with the commands Open / Save / Save as (default `Ctrl/Cmd+O`, `+S`, `+Shift+S`, also in the command palette, `Ctrl/Cmd+/`).

## Use

zen-draw has no toolbar or menus:

- Drag with the right mouse button to open the tool ring at the pointer. Release in the direction of a tool to select it; hold Shift on release to lock the tool. Drag past the last slice ("more") for the other tools. Escape closes the ring.
- A right-click without a drag opens the context menu.
- `Ctrl/Cmd+/` opens the command palette (Open, Save, Mermaid to diagram, library, and every other command).
- `?` shows the keyboard shortcuts.

A right-drag does not pan the canvas. Pan with the middle mouse button, with Space and a left-drag, with the hand tool (`H`) or with the mouse wheel.

## Configuration

`$XDG_CONFIG_HOME/zen-draw/config.toml`, falling back to `~/.config/zen-draw/config.toml`. The same path is used on Linux, macOS and Windows. See [`config.example.toml`](config.example.toml).

The `[keys]` table maps command IDs to key combinations, for example `"tool.freedraw" = "d"`. The IDs are `tool.<name>`, the zenboard action names (for example `undo`), `ui.<name>` and `host.open`, `host.save`, `host.saveAs`. An empty string removes the key combinations of a command.

The old format (`[keys.tools]` and `[keys.actions]`) is no longer accepted. Move each entry into `[keys]`: `<tool> = ...` in `[keys.tools]` becomes `"tool.<tool>" = ...`, and `app.open`, `app.save`, `app.save-as` become `host.open`, `host.save`, `host.saveAs`.
