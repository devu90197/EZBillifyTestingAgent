# Foundation Status

Snapshot of what the base foundation delivers today, on this machine, verified.

## Verified working ✅

| Item | Status | Evidence |
|---|---|---|
| Monorepo (pnpm + Turborepo, 7 packages) | ✅ installed | `pnpm install` — 584 pkgs |
| TypeScript scaffold compiles | ✅ clean | `pnpm -r typecheck` — all 7 pass |
| Universal agent core (domain, Runner port, registry, agent) | ✅ built | `packages/core` |
| Product-agnostic catalog (add any site/app) | ✅ built | `ezt products` lists 2 |
| Web runner (Playwright) | ✅ **runs** | cross-browser smoke 6/6 passed vs live target |
| Chromium + Firefox + WebKit browsers | ✅ installed | Playwright 1.61.1 |
| `ezt` CLI (`doctor`, `products`, `run`) | ✅ works | verified |
| Appium 3 (mobile engine) | ✅ installed | 3.5.2 (Appium 3 is GA — upgraded from the guide's Appium 2) |
| Android UiAutomator2 driver | ✅ installed | `uiautomator2@8.1.0` in `~/.appium` |
| Android toolchain (JDK 17, SDK, adb) | ✅ present | `ezt doctor` |

## Conditional ⏳

| Item | Status | Note |
|---|---|---|
| Android emulator / real device | ⚠️ needed to *run* mobile | tooling is ready; attach a device (`adb devices`) then start Appium |
| Maestro CLI | ➕ optional | flow example in `runners/mobile/maestro/` |

## Requires external tooling / host 🚫 (scaffolded, ready)

| Item | Blocker | Plan |
|---|---|---|
| **iOS native testing** | Needs **macOS + Xcode** (Apple licence) | Runner + XCUITest caps are scaffolded; runs on a Mac / macOS CI runner. Reports `skipped` here honestly. |
| Backing services (Postgres, Redis, NATS, Temporal, Vault) | **Docker not installed** | Not needed for the basic foundation. Install Docker Desktop when we build the control/data planes (guide Phase 2). |

## Capability matrix by surface

| Surface | Native? | Runs on this Windows box now? |
|---|---|---|
| Website | n/a | ✅ yes — Chromium + Firefox + WebKit all verified |
| Android app | ✅ native (UiAutomator2) | ✅ yes, once a device/emulator is attached |
| iOS app | ✅ native (XCUITest) | 🚫 no — needs a Mac (scaffolded & ready) |

## What "done" means for this phase
The **basic foundation is complete and verified**: an installable, typechecked,
product-agnostic monorepo where the web track already executes real automated
tests with no human interaction, and the native mobile track is wired and
ready pending a device (Android) or a Mac (iOS). Next: build out the website
testing agent for EzBillify (guide Phases 4–6).
