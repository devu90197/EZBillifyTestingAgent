# EZT — Universal Testing Agent

An independent, **product-agnostic** automated testing platform. Register any website or native app (web · Android · iOS) as a *product*, and the agent tests it automatically — no human in the loop. The first product under test is **EzBillify** (https://ezbillify.com); the same engine tests any other product you add.

> Design docs: see [`EzBillify-Testing-Platform/STEP-BY-STEP-IMPLEMENTATION-GUIDE.md`](EzBillify-Testing-Platform/STEP-BY-STEP-IMPLEMENTATION-GUIDE.md) and the [visual overview](EzBillify-Testing-Platform/visual-overview.html). This monorepo implements the **foundation** for that plan.

## Monorepo layout

```
packages/
  core/          domain model + Runner port + ProductRegistry + TestingAgent (framework-free)
  config/        Zod-validated layered configuration
  plugin-sdk/    plugin contract + capability manifest (extensibility)
  products/      the product catalog — add ANY website/app here (ezbillify, template)
runners/
  web/           Playwright web runner (Chromium/Firefox/WebKit)
  mobile/        Appium 2 + Maestro native runner (Android now, iOS on macOS)
apps/
  cli/           the `ezt` command
```

## Quick start

```bash
pnpm install                 # install all workspace dependencies
pnpm browsers:install        # download Playwright browsers (Chromium/Firefox/WebKit)
pnpm doctor                  # check the local toolchain
pnpm products                # list registered products
pnpm --filter @ezt/runner-web test:chromium   # run the web smoke test
```

## Add a new product (universal)

Copy `packages/products/src/catalog/example-web.product.ts`, edit the `baseUrl`
(and mobile identifiers if applicable), then register it in
`packages/products/src/index.ts`. That is all — the agent can now test it.

## Production safety

Every product carries a `safety` policy (`readOnly`, `blockPayments`) that
defaults to the safe posture. The mobile runner never fakes results — it reports
`skipped` when no device is attached or when iOS is requested off macOS.

## Current status

See [`FOUNDATION-STATUS.md`](FOUNDATION-STATUS.md) for the capability matrix
(what runs on this machine today vs. what needs external tooling).
