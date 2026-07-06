import type { Product } from '@ezt/core';

/** Native Android automation caps (Appium + UiAutomator2 driver). */
export function androidCaps(product: Product): Record<string, unknown> {
  const a = product.mobile?.android ?? {};
  return {
    platformName: 'Android',
    'appium:automationName': 'UiAutomator2',
    'appium:appPackage': a.appPackage,
    'appium:appActivity': a.appActivity,
    'appium:app': a.appPath,
    // read-only-ish: do not wipe app data between sessions
    'appium:noReset': true,
    'appium:newCommandTimeout': 120,
  };
}

/**
 * Native iOS automation caps (Appium + XCUITest driver).
 * REQUIRES a macOS host with Xcode + WebDriverAgent — cannot run on Windows/Linux.
 */
export function iosCaps(product: Product): Record<string, unknown> {
  const i = product.mobile?.ios ?? {};
  return {
    platformName: 'iOS',
    'appium:automationName': 'XCUITest',
    'appium:bundleId': i.bundleId,
    'appium:app': i.appPath,
    'appium:noReset': true,
    'appium:newCommandTimeout': 120,
  };
}
