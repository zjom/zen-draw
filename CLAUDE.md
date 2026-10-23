# CLAUDE.md

## Project Structure

Excalidraw is a **monorepo** with a clear separation between the core library and the application:

- **`packages/excalidraw/`** - Main React component library published to npm as `@excalidraw/excalidraw`
- **`excalidraw-app/`** - Full-featured web application (excalidraw.com) that uses the library
- **`packages/`** - Core packages: `@excalidraw/common`, `@excalidraw/element`, `@excalidraw/math`, `@excalidraw/utils`
- **`examples/`** - Integration examples (NextJS, browser script)
- **`zen-draw/`** - Desktop whiteboard (Tauri) that is the primary consumer of the library. It builds against the source in `packages/` (see `zen-draw/vite.config.ts`)
- **`docs/zenboard-plan.md`** - Implementation plan of the zenboard fork

## Development Workflow

1. **Package Development**: Work in `packages/*` for editor features
2. **App Development**: Work in `excalidraw-app/` for app-specific features
3. **Testing**: Always run `pnpm test:update` before committing
4. **Type Safety**: Use `pnpm test:typecheck` to verify TypeScript

## Development Commands

```bash
pnpm test:typecheck  # TypeScript type checking
pnpm test:update     # Run all tests (with snapshot updates)
pnpm fix             # Auto-fix formatting and linting issues
```

## Architecture Notes

### Package System

- Uses pnpm workspaces for monorepo management (`pnpm-workspace.yaml`)
- Internal packages use path aliases (see `vitest.config.mts`)
- Build system uses esbuild for packages, Vite for the app
- TypeScript throughout with strict configuration
