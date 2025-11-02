# ProPresenter Timers

A cross-platform desktop timer app paired with ProPresenter. The project uses a Next.js + TypeScript frontend and a Tauri desktop wrapper for native multi-screen and fullscreen control.

This repo provides presenter-facing watch views and fullscreen timer projection to external displays. It is designed to be run as a desktop app (Tauri) but the frontend can also be developed using the Next.js dev server.

## Key features

- Clean React/Next UI for creating, editing and running timers
- Presenter/watch view with simplified UI for on-stage use
- Fullscreen projection to a selected display (multi-screen support)
- Native integration via Tauri: screen metadata access and platform packaging

The Tauri integration surface (available when running the desktop app) exposes a few useful helpers on `window`:

- `window.isTauri: boolean` — whether the app is running inside the Tauri wrapper
- `window.getScreenDetails(): Promise<ScreenDetails>` — returns screen metadata and the current screen
- `window.charCode: string` — helper for shortcut handling

## Requirements

- Node.js (16+ recommended)
- A package manager: npm / yarn / pnpm
- Rust toolchain (for Tauri builds): install via https://rustup.rs

If you only want to run the frontend in a browser (development), the Rust toolchain is not required.

## Install

```bash
# from the repository root
npm install
# or: pnpm install
```

## Development

1. Start the Next.js dev server (frontend):

```bash
npm run dev
```

2. To run the desktop app (Tauri), open a terminal and run the Tauri dev command. Example:

```bash
cd tauri
cargo tauri dev
```

Note: some repositories include npm scripts that wrap Tauri commands (e.g. `npm run tauri:dev`). Check `package.json` for script names used in this repo.

## Build / Production

1. Build the frontend:

```bash
npm run build
```

2. Build the Tauri native bundle (from the `tauri` folder):

```bash
cd tauri
cargo tauri build
```

This produces native installers/bundles for the host platform.

## Project layout (high level)

- `src/` — Next.js application source (app routes, components, hooks)
- `src/types.d.ts` — global types (includes `Window` extensions and `ScreenDetails` shape)
- `public/` & `assets/` — static assets
- `tauri/` — Tauri Rust project (native code, config, icons)

## How this integrates with ProPresenter

The app provides timers which can be shown fullscreen on a chosen display. It is intended to be used alongside ProPresenter where the ProPresenter stage output and the timer projection may share or use different displays.

Typical usage:

- Run the desktop app on the machine attached to presentation displays
- Use the screen selection options to choose which display shows the fullscreen timer

The exact ProPresenter integration points (if any) may vary depending on your environment; consult the project code for any API usage or platform-specific hooks.

## Contributing

Contributions and improvements are welcome. Helpful contributions:

- Fixes or improvements to multi-screen detection and fullscreen behavior
- Keyboard shortcut support for presenter control
- Accessibility and presentation-friendly styling

If you want me to update the README with exact script names or add screenshots, I can inspect `package.json` and the `tauri` config and adjust accordingly.

## Troubleshooting

- Screen detection and projection are only available when running inside the Tauri desktop wrapper — the browser dev server will not provide native screen APIs (`window.isTauri` can be used to gate behavior).
- If the Tauri build fails, ensure the Rust toolchain is installed and up-to-date.

## License

Add a `LICENSE` file to the repository if you plan to publish or share the project. If this project is private, note the intended distribution policy in repo settings or documentation.

---

If you want, I can now:
- adjust the README to include exact npm/tauri script names after checking `package.json`
- add short screenshots or a short GIF to the `public/` folder and reference them here
- add a CONTRIBUTING.md and PR template

Tell me which follow-up you'd like and I'll proceed.
