# zenboard implementation plan

Date: 2026-10-23

## 1. Goals

zenboard is a fork of Excalidraw. The primary consumer of zenboard is zen-draw (`~/projects/zen-draw`). zen-draw is a desktop whiteboard that uses Tauri.

The plan has these goals:

1. Remove the features that zen-draw does not use: collaboration, AI, sharing, the help text on the canvas, and the menus.
2. Replace the default UI with a minimal UI. The minimal UI shows a control only when the user requests the control.
3. Let the host application configure all keyboard shortcuts.
4. Give the host application an API for documents, so that the host does not keep a copy of the editor state.
5. Move zen-draw into this repository.

## 2. Terms

| Term | Meaning |
| --- | --- |
| host | The application that renders the `Excalidraw` component. For this plan, the host is zen-draw. |
| command | An operation that a user can start with a key combination, a ring slice or the command palette. |
| command ID | The string that identifies a command, for example `tool.rectangle`, `undo` or `host.save`. |
| key combination | One key and zero or more modifiers, written as a string, for example `mod+shift+s`. |
| keymap | The table that maps each command ID to zero or more key combinations. |
| default keymap | The keymap that zenboard uses when the host does not override a command. |
| effective keymap | The default keymap after zenboard applies the overrides of the host. |
| host command | A command that the host defines. The ID of a host command starts with `host.`. |
| press command | A command that has a handler for the key press and a handler for the key release. |
| fixed key | A key that has a fixed function in a context, for example Escape during text editing. A fixed key is not in the keymap. |
| tool ring | The circular palette of tools. The tool ring appears at the pointer. |
| style ring | The circular palette of style properties for the selected elements. |
| slice | One sector of a ring. Each slice runs one command or opens one sub-ring. |
| sub-ring | A ring that a slice opens. |
| dead zone | The circular area at the center of a ring. A release in the dead zone does not select a slice. |
| `ZenLayerUI` | The new React component that renders all UI above the canvas. `ZenLayerUI` replaces `LayerUI`. |

## 3. Decisions

| Subject | Decision |
| --- | --- |
| Mermaid to diagram | Keep. The command palette opens the Mermaid dialog. Remove the AI chat. |
| Tool ring trigger | A drag with the secondary mouse button (right-drag). The `ui.toolRing` command has no default key combination. |
| Secondary click without a drag | Opens the context menu. This behavior does not change. |
| Properties panel | Remove. The style ring shows the properties only when the user requests the style ring. |
| Main menu | Remove. The command palette replaces the main menu. |
| New UI location | A new `ZenLayerUI` component. `App.tsx` renders `ZenLayerUI` instead of `LayerUI`. |
| Upstream merges | Keep the changes in `App.tsx` and in the action files small, because upstream changes these files often. |
| Location of zen-draw | The `zen-draw/` directory of this repository. zen-draw is a pnpm workspace package. |
| Touch input for the rings | Not in scope. The rings support mouse input only. |
| Style ring trigger | A right-drag that starts on the selection opens the style ring. |
| Package manager | pnpm for all packages. |
| Tool versions | TypeScript 7, Vite 8 and Node.js 26 for all packages. |
| `excalidraw-app/` | Delete `excalidraw-app/` when the conditions in section 10.3 are true. |

## 4. Phase 0: toolchain and merge of zen-draw

Do Phase 0 before Phase 1. After Phase 0, each phase can change zenboard and zen-draw in one commit.

### 4.1 Current state

| Item | zen-draw | This repository | Target |
| --- | --- | --- | --- |
| Package manager | npm, with `package-lock.json` | Yarn 1.22.22, with workspaces | pnpm |
| TypeScript | 7.0 | 5.9.3 | 7 |
| Vite | 8.3 | 5.0.12 | 8 |
| Node.js | 26 or later | 18 or later | 26 or later |
| React | 18.3 | 19.0 in `excalidraw-app/` | One version for all packages (see section 4.4) |
| Nix | `flake.nix`, `package.nix` (`fetchNpmDeps`), `devenv.nix` | None | Nix files in the root directory |
| Default branch | `main` | `master` | `master` |

The packages in this repository refer to each other by a version number, for example `"@excalidraw/common": "0.18.0"`. By default, pnpm links a workspace package only if the dependency uses the `workspace:` protocol. Section 4.2 step 3 changes these dependencies.

The root `.npmrc` file sets `legacy-peer-deps=true`. pnpm does not use this setting.

### 4.2 Steps: pnpm

1. Create the `pnpm-workspace.yaml` file. Copy the list of workspaces from the `workspaces` field of the root `package.json` file.
2. In the root `package.json` file, remove the `workspaces` field. Set the `packageManager` field to a pnpm version.
3. In each `package.json` file, change each dependency on a package of this repository to `workspace:*`.
4. Delete the `yarn.lock` file. Run `pnpm install`. Commit the `pnpm-lock.yaml` file.
5. In the root scripts, replace each `yarn --cwd <directory> <script>` command with `pnpm --dir <directory> <script>`.
6. Remove the `legacy-peer-deps` setting from the `.npmrc` file. If pnpm reports peer dependency errors, add the necessary settings to the `pnpm-workspace.yaml` file.
7. Run the tests. pnpm does not let a package import a dependency that the `package.json` file of the package does not declare. If an import fails for this reason, add the dependency to the `package.json` file of the package.
8. Replace the Yarn commands in all other files. The `grep -rl yarn --exclude-dir=node_modules .` command finds these files. The files include:
   - `CLAUDE.md` and the README files.
   - `Dockerfile` and `docker-compose.yml`.
   - The files in `.github/workflows/` and in `scripts/`.
   - The `vercel.json` files and the `.codesandbox` files.

### 4.3 Steps: merge of zen-draw

1. Import the zen-draw repository into the `zen-draw/` directory. The `git subtree add` command keeps the Git history of zen-draw.
   ```
   git subtree add --prefix=zen-draw ../zen-draw main
   ```
2. Add `zen-draw` to the `pnpm-workspace.yaml` file.
3. Delete the `zen-draw/package-lock.json` file.
4. In the `zen-draw/package.json` file, change the `@excalidraw/excalidraw` dependency to `workspace:*`.
5. Make sure that the root `tsconfig.json` file and the `vitest.config.mts` file include the `zen-draw/` directory.
6. Move `flake.nix`, `flake.lock`, `devenv.nix`, `devenv.yaml` and `devenv.lock` to the root directory.
7. In `package.nix`, replace `fetchNpmDeps` and `npmHooks` with the pnpm functions of nixpkgs (`fetchPnpmDeps` and `pnpmConfigHook`). Older versions of nixpkgs use the names `pnpm.fetchDeps` and `pnpm.configHook`.
8. In `package.nix`, change the `src` attribute. The new source must include the root `package.json` file, the `pnpm-lock.yaml` file, the `pnpm-workspace.yaml` file, the `packages/` directory and the `zen-draw/` directory.
9. Add two scripts to the root `package.json` file: `zen-draw:dev` and `zen-draw:build`.

### 4.4 Steps: tool versions

Do each step in a separate commit. After each step, run the type check, the tests, the build of zen-draw and the Nix build.

1. Set Node.js 26 in the `engines` field of each `package.json` file, in the files in `.github/workflows/`, in the `Dockerfile` file and in `devenv.nix`.
2. Change TypeScript to version 7 for all packages.
3. Change Vite to version 8 for all packages. Change `@vitejs/plugin-react`, Vitest and the other Vite plugins to versions that support Vite 8.
4. Use one version of React for all packages. zen-draw uses React 18 because of a problem with Radix. The Git history of zen-draw does not record the problem. Find the problem again before you choose the version. If the problem does not occur with React 19, use React 19.

### 4.5 Completion criteria

1. The repository contains no `yarn.lock` file and no `package-lock.json` file.
2. The `pnpm install --frozen-lockfile` command completes without errors.
3. The `pnpm test:typecheck` command and the `pnpm test:update` command complete without errors.
4. The `pnpm zen-draw:build` command and the `nix build` command complete without errors.
5. The `grep -rl yarn --exclude-dir=node_modules .` command finds only change logs.

### 4.6 Results

Phase 0 is on the `zenboard/phase-0` branch. These results are different from sections 4.2 to 4.4, or are not in those sections:

1. TypeScript 7 does not provide the classic compiler API. typescript-eslint and vite-plugin-checker need that API. The root package therefore has two TypeScript packages:
   - `typescript` is an alias of `@typescript/typescript6`. The tools load the compiler API from this package.
   - `typescript-native` is TypeScript 7. This package provides the `tsc` binary.
2. zen-draw does not use the built packages. Vite aliases in `zen-draw/vite.config.ts` resolve `@excalidraw/*` to the source in `packages/`. Vite bundles the fonts from the source.
3. The library source imports `@excalidraw/utils`, but no package declares this dependency. The Nix build therefore also installs the dependencies of `@excalidraw/utils` (`pnpmWorkspaces` in `package.nix`).
4. All packages use React 19.0.0. The Radix problem that made zen-draw use React 18 did not occur in the builds, in the tests or in a manual test of zen-draw.
5. Vitest 5 showed that some `ORIG_ID` assertions in the tests always passed. Vitest 3 ignored symbol keys in `expect.objectContaining()`. The commit of the Vite 8 upgrade removes or corrects these assertions.
6. Known problem: after the `pnpm build:packages` command, the `pnpm test:typecheck` command fails in `MermaidToExcalidraw.test.tsx`. The type declarations of `@excalidraw/mermaid-to-excalidraw` import `@excalidraw/excalidraw/element/transform`. This import resolves only after a package build. This problem also occurs on the `master` branch.
7. A manual test confirmed condition 1 of section 10.3. `excalidraw-app/` is deleted (section 10.4).

## 5. Phase 1: keymap and commands

### 5.1 Current state

Keyboard handling is in three locations:

1. Each action has a `keyTest` function. The `ActionManager.handleKeyDown` method calls every `keyTest` function (`actions/manager.tsx`). If more than one action matches, the method runs no action.
2. The `App.onKeyDown` method has hard-coded keys (`components/App.tsx`, line 5100). Examples are `?`, `mod+shift+e`, `mod+p`, `q`, the arrow keys, Escape, Enter and Tab.
3. The `findShapeByKey` function selects a tool from the `TOOLS` table (`components/Tools.tsx`).

The labels of the shortcuts come from a different source: the `shortcutMap` table in `actions/shortcuts.ts`. If a `keyTest` function changes, the label does not change.

### 5.2 API

```ts
type CommandId =
  | `tool.${ToolType}`  // tool.rectangle, tool.freedraw
  | ActionName          // undo, zoomIn, group, toggleWrap
  | `ui.${string}`      // ui.toolRing, ui.styleRing, ui.commandPalette
  | `host.${string}`;   // host.open, host.save, host.saveAs

type KeyCombination = string; // "mod+shift+s"

/** null removes all key combinations of the command */
type KeymapOverrides = Partial<
  Record<CommandId, KeyCombination | KeyCombination[] | null>
>;

type HostCommand = {
  label: string;
  keys?: KeyCombination | KeyCombination[];
  run?: () => void;
  /** press command: called on keydown, and on pointerdown of a ring slice */
  onPress?: () => void;
  /** press command: called on keyup, and on window blur */
  onRelease?: () => void;
};

// ExcalidrawProps
keymap?: KeymapOverrides;
commands?: Record<`host.${string}`, HostCommand>;

// ExcalidrawImperativeAPI
commands: {
  execute: (id: CommandId) => boolean;
  list: () => { id: CommandId; label: string; keys: KeyCombination[] }[];
};
keymap: {
  get: () => Readonly<Record<CommandId, KeyCombination[]>>;
  conflicts: () => { keys: KeyCombination; ids: CommandId[] }[];
};
```

### 5.3 Syntax of a key combination

1. A key combination is a list of parts that are joined by `+`. The last part is the key. The other parts are modifiers.
2. The modifiers are `mod`, `ctrl`, `cmd`, `meta`, `alt`, `option` and `shift`.
3. On macOS, `mod` is Cmd. On other platforms, `mod` is Ctrl.
4. The key is a lowercase letter, a digit, a symbol, or a key name. The key names are `escape`, `enter`, `tab`, `space`, `delete`, `backspace`, `arrowup`, `arrowdown`, `arrowleft`, `arrowright`, `plus`, `minus` and `comma`.
5. A string can contain more than one key combination. A comma separates the key combinations. This syntax is the same as the syntax in zen-draw.
6. The `plus` key name and the `comma` key name are necessary, because `+` and `,` are separators.

### 5.4 Rules for a match

1. The modifiers of the event must be equal to the modifiers of the key combination. An extra modifier prevents a match.
2. For a letter, zenboard compares the key with `event.key` in lowercase. If `event.key` is not a Latin character, zenboard compares the key with `event.code`. The existing `matchKey` function in `packages/common/src/keys.ts` does this comparison.
3. For a digit, zenboard compares the key with `event.code` (`Digit0` to `Digit9`). This rule is necessary because `shift+1` produces `!` in `event.key`.
4. For a symbol, zenboard compares the key with `event.key`.
5. zenboard ignores an event that has `event.repeat` set to true for a press command.

### 5.5 Rules for overrides

1. An override replaces all default key combinations of the command.
2. If an override uses a key combination of a different command, zenboard removes the key combination from the different command. The `keymap.conflicts` method reports this removal.
3. Two commands can have the same key combination only if the conditions of the two commands cannot be true at the same time. An example is `deleteSelectedElements` and a different command for Delete when no element is selected.
4. If the host gives an unknown command ID, zenboard writes a warning to the console. zenboard ignores the override.

### 5.6 Steps

1. Create the `packages/excalidraw/keymap/` directory.
2. In the `keymap/` directory, create these functions:
   - A function that parses a key combination.
   - A function that formats a key combination as a label.
   - A function that matches a key combination to an event.
3. In the `keymap/` directory, create the default keymap. Copy each default key combination from the current `keyTest` functions, from `TOOLS` and from `App.onKeyDown`.
4. Create the function that resolves the default keymap and the overrides into the effective keymap.
5. Add the `keyCondition` field to the `Action` type. The `keyCondition` field contains only the context test of the old `keyTest` function, for example "one or more elements are selected".
6. For each action that is in the default keymap, remove the `keyTest` function. Move the context test into the `keyCondition` field.
7. Change the `ActionManager.handleKeyDown` method. The new method does these operations:
   1. The method finds the commands of the event in the effective keymap.
   2. The method removes each command that has a `keyCondition` field with the value false.
   3. The method runs the remaining command.
8. In `App.onKeyDown`, replace the `findShapeByKey` call with a keymap lookup for the `tool.*` commands.
9. In `App.onKeyDown`, replace the hard-coded `?`, `mod+shift+e`, `mod+p` and `q` keys with commands.
10. Keep these keys as fixed keys: the arrow keys, Escape, Enter, Tab, Alt during a drag, Shift during a drag, and Space for the pan.
11. Replace the `shortcutMap` table with lookups in the effective keymap. The tooltips, the help dialog and the command palette must show the key combinations of the effective keymap.
12. Add the `keymap` prop and the `commands` prop. If the `keymap` prop changes, zenboard resolves the effective keymap again.
13. Add the `commands` API and the `keymap` API to `ExcalidrawImperativeAPI`.
14. Remove the default key combinations of the `loadScene`, `saveToActiveFile` and `saveFileToDisk` actions. Phase 2 removes these actions.

### 5.7 Tests

1. Parse and format: modifiers, the `mod` modifier on macOS and on Linux, the `plus` key name, more than one key combination in one string.
2. Match: CapsLock, `shift+1`, a Russian keyboard layout with `mod+z`.
3. Resolve: an override, a removal with `null`, a conflict, an unknown command ID.
4. Integration: an override changes the tool of a key. A host command runs on its key combination. A removal disables a default key combination. A tooltip shows the key combination of the override.

### 5.8 Completion criteria

1. The `pnpm test:typecheck` command completes without errors.
2. The `pnpm test:update` command completes without failed tests.
3. No action in the default keymap has a `keyTest` function.

## 6. Phase 2: `ZenLayerUI`, tool ring and removals

### 6.1 `ZenLayerUI`

1. Create the `components/zen/` directory.
2. Create the `ZenLayerUI` component. `ZenLayerUI` renders these items:
   - The tool ring and the style ring.
   - The tool indicator. The tool indicator is a small icon of the active tool in a corner of the canvas. The `toolIndicator` prop disables the tool indicator.
   - The command palette.
   - The context menu.
   - The dialogs that remain: the Mermaid dialog, the image export dialog, the confirmation dialog, the error dialog and the element link dialog.
   - The toasts.
   - The library sidebar. The command palette opens the library sidebar.
3. In `App.tsx`, render `ZenLayerUI` instead of `LayerUI`.
4. Do not change `LayerUI`. Phase 2 deletes `LayerUI` only if no test or component uses `LayerUI`.

### 6.2 Tool ring behavior

The tool ring supports mouse input only. Touch input is not in scope.

The secondary-button session in `components/App.pan.ts` already has the necessary logic. The session starts on the press of the secondary button. If the pointer moves more than 5 px, the session starts a pan. If the pointer does not move more than 5 px, the session opens the context menu on the release. The tool ring uses this session.

1. The user presses the secondary button on the canvas.
2. If the pointer moves more than 5 px, the session opens the tool ring at the position of the press. The session does not start a pan.
3. The tool ring highlights the slice that is in the direction of the pointer. The distance from the center does not change the selection. The dead zone has a radius of 24 px.
4. The user releases the secondary button. If the pointer is in a slice, zenboard runs the command of the slice. If the pointer is in the dead zone, zenboard closes the tool ring and runs no command.
5. If the user holds Shift during the release, zenboard locks the tool.
6. If the user presses Escape, zenboard closes the tool ring and runs no command.
7. If the pointer crosses the outer edge of the "more" slice, zenboard opens the sub-ring of the "more" slice at the position of the pointer.
8. If the tool ring does not fit in the viewport, zenboard moves the tool ring into the viewport.
9. If the pointer does not move more than 5 px, the session opens the context menu on the release. This behavior does not change.

The `ui.toolRing` command opens the tool ring from the keyboard:

1. A key press opens the tool ring at the pointer.
2. A key release runs the command of the highlighted slice.
3. If the pointer does not leave the dead zone before the key release, the tool ring stays open. The user can then select a slice with the primary button or with the digit keys 1 to 8.

> Note After this change, a right-drag does not pan the canvas. The user can use these methods to pan the canvas:
>
> - A drag with the middle button.
> - A drag with the primary button while the user holds Space.
> - A drag with the hand tool.
> - The mouse wheel.

### 6.3 Tool ring configuration

```ts
// ExcalidrawProps
toolRing?: {
  /** at most 8 command IDs */
  items: CommandId[];
  /** at most 8 command IDs, shown in the sub-ring of the "more" slice */
  more?: CommandId[];
};
```

The default `items` value is: `tool.selection`, `tool.rectangle`, `tool.ellipse`, `tool.diamond`, `tool.arrow`, `tool.line`, `tool.freedraw`, `tool.text`.

The default `more` value is: `tool.eraser`, `tool.hand`, `tool.frame`, `tool.image`, `tool.laser`, `tool.stickynote`, `tool.lasso`, `tool.bucketfill`.

The center of the tool ring shows the icon of the active tool. The slices use the icons from the `TOOLS` table in `components/Tools.tsx`. A slice for a command that is not a tool uses the icon of the action.

### 6.4 Removals

| Feature | Files and props |
| --- | --- |
| Collaboration | `LiveCollaborationTrigger`, `UserList`, the follow mode. The props `isCollaborating`, `onPointerUpdate`, `onUserFollow`, `userToFollow` and `currentUserControls`. |
| AI | The AI chat in `TTDDialog`, `MagicButton`, `DiagramToCodePlugin`, the magic frame, and the `aiEnabled` prop. |
| Sharing | `ShareableLinkDialog`, `PublishLibrary`, the Socials group, the `onExportToBackend` option and the `libraryReturnUrl` prop. |
| Help text | `HintViewer`, the welcome screen and `HelpButton`. |
| Menus | The main menu, `Toolbar`, `MobileMenu`, the footer and the properties panel. |
| File actions | The `loadScene`, `saveToActiveFile` and `saveFileToDisk` actions. The host commands replace these actions. |
| Zen mode | The `zenMode` action and the `zenModeEnabled` prop. `ZenLayerUI` has no zen mode, because `ZenLayerUI` is always minimal. Keep the `zenModeEnabled` field in `AppState`, so that old files restore without errors. |

Rules for the removals:

1. Delete a component only if the component is a leaf in the component tree.
2. If a feature is connected to many locations in `App.tsx`, disable the feature in one location. Do not delete the code in `App.tsx`.
3. Keep the `MermaidToExcalidraw` component. Remove only the AI tab from the TTD dialog.
4. Do not change `excalidraw-app/` in Phase 2. Section 10.3 gives the conditions for the deletion of `excalidraw-app/`.

### 6.5 Completion criteria

1. A right-drag opens the tool ring and selects a tool.
2. A secondary click opens the context menu.
3. No toolbar, menu, footer or help text appears on the canvas.
4. The `pnpm test:typecheck` command and the `pnpm test:update` command complete without errors.

## 7. Phase 3: style ring

1. Add the `ui.styleRing` command. The `ui.styleRing` command has no default key combination.
2. If the right-drag starts on a selected element, zenboard opens the style ring instead of the tool ring. If the right-drag starts in the bounding box of the selection, zenboard also opens the style ring.
3. The style ring shows only the properties that apply to the selected elements. The functions in `components/shapeActionPredicates.ts` determine which properties apply.
4. The style ring can show these properties:
   - Stroke color, background color and opacity.
   - Stroke width, stroke style, fill style, sloppiness and edges.
   - Font family, font size and text alignment.
   - Arrowheads.
   - Layer order.
5. If more than 8 properties apply, the eighth slice is a "more" slice.
6. A property with a small set of values opens a sub-ring of the values. Examples are stroke width and fill style.
7. A color property opens the existing color picker in a `PropertiesPopover` component at the position of the slice.
8. A change from the style ring makes one entry in the undo history.

## 8. Phase 4: document API

```ts
// ExcalidrawImperativeAPI
scene: {
  /** restores the data, adds the files, resets the history, marks the scene as saved */
  load: (
    data: string | Blob | ImportedDataState,
    opts?: { fitToContent?: boolean; resetHistory?: boolean },
  ) => Promise<void>;
  /** returns the contents of an .excalidraw file */
  serialize: () => string;
  isDirty: () => boolean;
  markSaved: () => void;
};
onDirtyChange: (callback: (dirty: boolean) => void) => UnsubscribeCallback;
```

1. The `scene.load` method keeps only the fields of `AppState` that belong to the document: `viewBackgroundColor`, `gridSize`, `gridStep` and `gridModeEnabled`.
2. The default value of `fitToContent` is true. The default value of `resetHistory` is true.
3. The scene is dirty if the store records one or more durable increments after the last call to `markSaved`. This rule also includes a change of the background color and a change of the grid.
4. An undo to the saved state does not make the scene clean. The current element hash in zen-draw has the same behavior.

## 9. Phase 5: changes to zen-draw

### 9.1 Steps

1. Delete these files: `App.css`, `zenMode.ts`, `zenMode.css`, `toolHighlight.ts`, `toolHighlight.css`, `ToolIndicator.tsx`, `toolIndicator.css` and `icons.tsx`.
2. Replace the contents of `shortcuts.ts` with a function that converts the TOML configuration into the `keymap` prop.
3. Change the format of the configuration file. The `[keys]` table maps each command ID to a key combination. Convert the old IDs: `tools.<name>` becomes `tool.<name>`, and `app.<name>` becomes `host.<name>`.
4. Add the `[ring]` table to the configuration file for the `toolRing` prop.
5. Update the `Config` struct and the `Keys` struct in `src-tauri/src/lib.rs`. These structs use `deny_unknown_fields`, so the new tables cause an error if the structs do not contain the new fields.
6. Register `host.open`, `host.save` and `host.saveAs` through the `commands` prop.
7. In `DocumentController`, use `scene.load`, `scene.serialize`, `scene.markSaved` and `onDirtyChange`. Remove the `savedVersion` field and the `hashElementsVersion` calls.
8. Update `README.md` and `config.example.toml`.

### 9.2 Order

Do each step of section 9.1 in the phase that adds the necessary API:

| Step                                                | Phase      |
| --------------------------------------------------- | ---------- |
| Steps 2 to 6 (keymap, configuration, host commands) | Phase 1    |
| Step 1 (deletion of the workarounds)                | Phase 2    |
| Step 7 (`DocumentController`)                       | Phase 4    |
| Step 8 (documentation)                              | Each phase |

## 10. Deletion of `excalidraw-app/`

### 10.1 Reason

zen-draw is the host in this repository. `excalidraw-app/` contains the features that Phase 2 removes, for example collaboration and sharing.

### 10.2 Effect on Phase 0

`excalidraw-app/` uses Vite plugins that zen-draw does not use: `vite-plugin-pwa`, `vite-plugin-svgr`, `vite-plugin-ejs` and `vite-plugin-checker`. Each plugin needs a version that supports Vite 8. If you delete `excalidraw-app/` before section 4.4 step 3, you do not have to upgrade these plugins.

### 10.3 Conditions

Delete `excalidraw-app/` when all these conditions are true:

1. The `pnpm zen-draw:dev` command starts zen-draw. You can use zen-draw to test changes to the editor manually.
2. No file in `packages/` imports a file from `excalidraw-app/`. At this time, `packages/excalidraw/tests/test-utils.ts` (line 20) imports `excalidraw-app/app_constants`.
3. No file in `.github/workflows/` builds `excalidraw-app/`.
4. No test in the `pnpm test:update` command runs a test file from `excalidraw-app/`.
5. The `packages/excalidraw/vite-env.d.ts` file does not refer to the types of `vite-plugin-pwa` or of `vite-plugin-svgr`. At this time, lines 2 to 4 of the file refer to these types.

### 10.4 Result

The deletion is done. The deletion also removed these items:

1. The `firebase-project/` directory and the root `.codesandbox/` directory.
2. The files in `public/`, except `Virgil.woff2` and `Cascadia.woff2`. The `packages/excalidraw/index-node.ts` file uses these two fonts.
3. The `localStorageData` option of the `render` test helper. No test used this option.
4. The root dependencies that only `excalidraw-app/` used: `vite-plugin-pwa`, `vite-plugin-svgr`, `vite-plugin-ejs`, `ejs`, `vite-plugin-checker`, `@vitejs/plugin-react` and `http-server`.

The `.env.development` file and the `.env.production` file stay, because `scripts/buildPackage.js` reads these files.

## 11. Risks

| Risk | Mitigation |
| --- | --- |
| Upstream changes to `App.onKeyDown` and to the action files cause merge conflicts. | Keep the keymap in one directory. Change each `keyTest` function with a small mechanical edit. |
| Upstream uses Yarn. Each merge from upstream can change `package.json` files and add the `yarn.lock` file again. | After each merge from upstream, delete the `yarn.lock` file. Run `pnpm install`. |
| Users expect a right-drag to pan the canvas. | Document the other pan methods in the zen-draw README. |
| On macOS and on Linux, the browser sends the `contextmenu` event on the press of the secondary button. | Use the existing secondary-button session in `App.pan.ts`. The session already handles this event. |
| A press command does not get the key release, because the window loses focus. | Call `onRelease` on the `blur` event of the window. |
| The removals change many test snapshots. | Run `pnpm test:update`. Review the changes to the snapshots before each commit. |
| TypeScript 7 does not provide the same compiler API as TypeScript 5. Tools that use the compiler API can fail, for example `typescript-eslint` and `vite-plugin-checker`. | Before section 4.4 step 2, check the TypeScript 7 support of each tool that uses the compiler API. |
| The Vite 8 upgrade changes the configuration of Vitest and of the Vite plugins. | Do the Vite 8 upgrade in a separate commit. |
| The Nix build of zen-draw depends on `package-lock.json`. | Change `package.nix` in the same commit as the merge. Run `nix build` to verify the change. |
