{
  pkgs,
  lib,
  ...
}:

let
  inherit (pkgs.stdenv.hostPlatform) isLinux;

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
  # Rust toolchain: cargo, rustc, rustfmt, clippy, rust-analyzer, RUST_SRC_PATH
  languages.rust.enable = true;

  # Frontend
  languages.javascript = {
    enable = true;
    package = pkgs.nodejs_26;
    pnpm.enable = true;
  };

  packages =
    (with pkgs; [
      oxfmt
      oxlint
      vscode-langservers-extracted
      typescript-language-server

      pkg-config
    ])
    ++ lib.optionals isLinux (linuxLibs ++ [ pkgs.xdg-utils ]);

  env = lib.optionalAttrs isLinux {
    # TLS for WebKit (fetching images by URL, etc.)
    GIO_MODULE_DIR = "${pkgs.glib-networking}/lib/gio/modules/";
    # Without this, WebKitGTK renders a blank window on many
    # Wayland/NVIDIA setups.
    WEBKIT_DISABLE_DMABUF_RENDERER = "1";
  };

  enterShell = lib.optionalString isLinux ''
    # GSettings schemas are needed by the GTK file chooser dialog.
    export XDG_DATA_DIRS="${pkgs.gsettings-desktop-schemas}/share/gsettings-schemas/${pkgs.gsettings-desktop-schemas.name}:${pkgs.gtk3}/share/gsettings-schemas/${pkgs.gtk3.name}:''${XDG_DATA_DIRS:-}"
    export LD_LIBRARY_PATH="${lib.makeLibraryPath linuxLibs}:''${LD_LIBRARY_PATH:-}"
  '';
}
