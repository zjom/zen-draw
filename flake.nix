{
  description = "simple-whiteboard: a minimal tldraw desktop app built with Tauri";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs =
    { self, nixpkgs }:
    let
      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];
      forAllSystems = f: nixpkgs.lib.genAttrs systems (system: f nixpkgs.legacyPackages.${system});
    in
    {
      devShells = forAllSystems (
        pkgs:
        let
          inherit (pkgs) lib stdenv;

          # Libraries the Tauri/wry/WebKitGTK stack links against on Linux.
          linuxLibs = with pkgs; [
            at-spi2-atk
            atkmm
            cairo
            gdk-pixbuf
            glib
            glib-networking
            gtk3
            harfbuzz
            librsvg
            libsoup_3
            openssl
            pango
            webkitgtk_4_1
          ];
        in
        {
          default = pkgs.mkShell {
            packages =
              (with pkgs; [
                # Rust toolchain
                cargo
                rustc
                rustfmt
                clippy
                rust-analyzer

                # Frontend
                nodejs_22

                pkg-config
              ])
              ++ lib.optionals stdenv.hostPlatform.isLinux (linuxLibs ++ [ pkgs.xdg-utils ]);

            env = lib.optionalAttrs stdenv.hostPlatform.isLinux {
              # TLS for WebKit (fetching images by URL, etc.)
              GIO_MODULE_DIR = "${pkgs.glib-networking}/lib/gio/modules/";
              # Without this, WebKitGTK renders a blank window on many
              # Wayland/NVIDIA setups.
              WEBKIT_DISABLE_DMABUF_RENDERER = "1";
            }
            // {
              RUST_SRC_PATH = "${pkgs.rustPlatform.rustLibSrc}";
            };

            shellHook = lib.optionalString stdenv.hostPlatform.isLinux ''
              # GSettings schemas are needed by the GTK file chooser dialog.
              export XDG_DATA_DIRS="${pkgs.gsettings-desktop-schemas}/share/gsettings-schemas/${pkgs.gsettings-desktop-schemas.name}:${pkgs.gtk3}/share/gsettings-schemas/${pkgs.gtk3.name}:''${XDG_DATA_DIRS:-}"
              export LD_LIBRARY_PATH="${lib.makeLibraryPath linuxLibs}:''${LD_LIBRARY_PATH:-}"
            '';
          };
        }
      );
    };
}
