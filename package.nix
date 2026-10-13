{
  lib,
  rustPlatform,
  fetchNpmDeps,
  cargo-tauri,
  nodejs_26,
  npmHooks,
  pkg-config,
  wrapGAppsHook3,
  glib-networking,
  openssl,
  webkitgtk_4_1,
}:

rustPlatform.buildRustPackage (finalAttrs: {
  pname = "zen-draw";
  version = "0.1.1";

  src = lib.fileset.toSource {
    root = ./.;
    fileset = lib.fileset.unions [
      ./index.html
      ./package.json
      ./package-lock.json
      ./tsconfig.json
      ./vite.config.ts
      ./src
      ./src-tauri
    ];
  };

  cargoRoot = "src-tauri";
  buildAndTestSubdir = finalAttrs.cargoRoot;
  cargoLock.lockFile = ./src-tauri/Cargo.lock;

  npmDeps = fetchNpmDeps {
    name = "${finalAttrs.pname}-${finalAttrs.version}-npm-deps";
    inherit (finalAttrs) src;
    hash = "sha256-XQtpwso/jFLuQGmlpqQMMLdzQInx94buxv+e7S4Qn6Q=";
  };

  nativeBuildInputs = [
    # Runs `cargo tauri build` and installs the resulting bundle.
    cargo-tauri.hook
    nodejs_26
    npmHooks.npmConfigHook
    pkg-config
    wrapGAppsHook3
  ];

  buildInputs = [
    # TLS for WebKit (fetching images by URL, etc.)
    glib-networking
    openssl
    webkitgtk_4_1
  ];

  # Tauri's generated entry has no field code, so opening a file from a file manager
  # would launch an empty window instead of passing the file.
  postInstall = ''
    substituteInPlace $out/share/applications/zen-draw.desktop \
      --replace-fail "Exec=zen-draw" "Exec=zen-draw %f"
  '';

  meta = {
    description = "A minimal offline whiteboard: Excalidraw in a Tauri shell";
    mainProgram = "zen-draw";
    platforms = lib.platforms.linux;
  };
})
