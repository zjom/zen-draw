{
  lib,
  rustPlatform,
  fetchPnpmDeps,
  cargo-tauri,
  nodejs_26,
  pnpm_12,
  pnpmConfigHook,
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
      ./package.json
      ./pnpm-lock.yaml
      ./pnpm-workspace.yaml
      ./tsconfig.json
      ./packages
      ./zen-draw
      # pnpm reads every workspace manifest, also for a filtered install.
      ./excalidraw-app/package.json
      ./examples/with-nextjs/package.json
      ./examples/with-script-in-browser/package.json
    ];
  };

  cargoRoot = "zen-draw/src-tauri";
  buildAndTestSubdir = finalAttrs.cargoRoot;
  cargoLock.lockFile = ./zen-draw/src-tauri/Cargo.lock;

  # zen-draw and the workspace packages that it depends on. The library source also imports
  # @excalidraw/utils, but no package declares that dependency.
  pnpmWorkspaces = [
    "zen-draw..."
    "@excalidraw/utils..."
  ];
  pnpmDeps = fetchPnpmDeps {
    inherit (finalAttrs) pname version src pnpmWorkspaces;
    pnpm = pnpm_12;
    fetcherVersion = 4;
    hash = "sha256-9DdAsKFsGa92aoZyHPP7zZfq6H2DM8VvDEyE9uH4pSc=";
  };

  nativeBuildInputs = [
    # Runs `cargo tauri build` and installs the resulting bundle.
    cargo-tauri.hook
    nodejs_26
    pnpm_12
    pnpmConfigHook
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
