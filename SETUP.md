# Setup

## Prerequisites (already present on the dev machine)
- Node.js 22 LTS, pnpm 10
- Git
- For Android: JDK 17, Android SDK (`ANDROID_HOME`), `adb`
- For iOS (only on a Mac): macOS + Xcode
- Optional later: Docker Desktop (backing services), Maestro CLI

## First-time install
```bash
pnpm install                 # workspace deps
pnpm browsers:install        # Playwright browsers (Chromium/Firefox/WebKit)
pnpm appium:drivers          # Android UiAutomator2 driver
cp .env.example .env          # local config
```

## Everyday commands
```bash
pnpm doctor                              # toolchain health
pnpm products                            # list registered products
pnpm typecheck                           # typecheck all packages
pnpm lint                                # eslint
pnpm format                              # prettier

# Web tests (safe default target = example.com)
pnpm --filter @ezt/runner-web test                      # all browsers
pnpm --filter @ezt/runner-web test:chromium             # chromium only

# Point the web runner at a specific product target (read-only)
EZT_TARGET_URL=https://ezbillify.com pnpm --filter @ezt/runner-web test:chromium

# Run the agent against a product (selects supporting runners)
pnpm ezt run example-web
pnpm ezt run ezbillify
```

## Android device (to actually run mobile tests)
```bash
export APPIUM_HOME="$HOME/.appium"        # must be OUTSIDE the pnpm workspace
adb devices                               # should list a "device"
# start an emulator, e.g.:  emulator -avd <avd_name>
pnpm --filter @ezt/runner-mobile run appium   # start the Appium server
```
> Appium 3 + the `uiautomator2@8.1.0` driver are already installed in `~/.appium`.
> Always export `APPIUM_HOME` (a path outside the monorepo) before running Appium.

## iOS (on a Mac only)
```bash
pnpm --filter @ezt/runner-mobile exec appium driver install xcuitest
```

## Add a new product
1. Copy `packages/products/src/catalog/example-web.product.ts` → `<yourproduct>.product.ts`.
2. Edit `id`, `name`, `platforms`, `web.baseUrl` (and `mobile` identifiers if any).
3. Register it in `packages/products/src/index.ts`.
4. `pnpm ezt run <yourproduct>`.
