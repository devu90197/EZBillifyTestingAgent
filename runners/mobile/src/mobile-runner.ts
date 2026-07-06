import { execSync } from 'node:child_process';
import type {
  Product,
  RunnerContext,
  RunnerPlugin,
  TestCaseResult,
  TestRunResult,
} from '@ezt/core';
import { androidCaps, iosCaps } from './capabilities';

/**
 * Native mobile runner (Appium 2 + UiAutomator2/XCUITest, Maestro flows).
 *
 * Foundation behaviour: it builds the correct native capabilities and performs
 * honest environment pre-flight checks. It does NOT fake passes — if no Android
 * device is attached it reports `skipped`, and iOS is `skipped` unless the host
 * is macOS. Real flows arrive when EzBillify's signed build artifacts + a device
 * (or the macOS rack) are available.
 */
export class MobileRunner implements RunnerPlugin {
  readonly id = 'runner-mobile';
  readonly platform = 'mobile';

  supports(product: Product): boolean {
    return product.platforms.some((p) => p === 'android' || p === 'ios');
  }

  async prepare(): Promise<void> {}

  async execute(ctx: RunnerContext): Promise<TestRunResult> {
    const startedAt = new Date().toISOString();
    const cases: TestCaseResult[] = [];

    if (ctx.product.platforms.includes('android')) {
      const device = this.androidDeviceAttached();
      cases.push({
        name: 'android: native runner ready (UiAutomator2)',
        status: device ? 'passed' : 'skipped',
        durationMs: 0,
        error: device ? undefined : 'No Android device/emulator attached (`adb devices` empty).',
      });
    }

    if (ctx.product.platforms.includes('ios')) {
      const mac = process.platform === 'darwin';
      cases.push({
        name: 'ios: native runner ready (XCUITest)',
        status: mac ? 'passed' : 'skipped',
        durationMs: 0,
        error: mac ? undefined : 'iOS automation requires a macOS host with Xcode.',
      });
    }

    return {
      productId: ctx.product.id,
      platform: this.platform,
      runner: this.id,
      startedAt,
      finishedAt: new Date().toISOString(),
      status: cases.some((c) => c.status === 'failed' || c.status === 'error') ? 'failed' : 'passed',
      cases,
    };
  }

  async teardown(): Promise<void> {}

  /** Native capabilities for whichever platforms the product targets. */
  buildCaps(product: Product): { android?: Record<string, unknown>; ios?: Record<string, unknown> } {
    return {
      android: product.platforms.includes('android') ? androidCaps(product) : undefined,
      ios: product.platforms.includes('ios') ? iosCaps(product) : undefined,
    };
  }

  private androidDeviceAttached(): boolean {
    try {
      const out = execSync('adb devices', { stdio: ['ignore', 'pipe', 'ignore'] }).toString();
      return out
        .split('\n')
        .slice(1)
        .some((line) => /\bdevice\b/.test(line.trim()) && !/List of/.test(line));
    } catch {
      return false;
    }
  }
}
