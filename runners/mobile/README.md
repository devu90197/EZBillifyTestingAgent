# @ezt/runner-mobile — native Android & iOS

Native automation via **Appium 2** (`UiAutomator2` for Android, `XCUITest` for iOS) plus **Maestro** for resilient declarative flows.

## Android (works on this Windows machine)
Prerequisites already present here: JDK 17, Android SDK (`ANDROID_HOME`), `adb`.
1. Install the driver: `pnpm --filter @ezt/runner-mobile exec appium driver install uiautomator2`
2. Attach a device: start an emulator (`emulator -avd <name>`) or plug in a phone with USB debugging.
3. Verify: `adb devices` should list a `device`.
4. Start Appium: `pnpm --filter @ezt/runner-mobile run appium`
5. Supply the signed EzBillify `.apk`/`.aab` and set `appPackage`/`appActivity` in the product config.

## iOS (requires a Mac — cannot run on Windows)
Apple's licence requires iOS automation to run on **macOS with Xcode**. On a Mac:
1. `pnpm --filter @ezt/runner-mobile exec appium driver install xcuitest`
2. `xcrun simctl` to create a simulator, or register a real iPhone.
3. Supply the signed `.ipa` (real device) or simulator `.app` and set `bundleId`.

The runner detects the host and reports iOS as `skipped` when not on macOS — it never fakes a pass.
