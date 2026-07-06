/**
 * A Product is any website or app the universal agent can test.
 * The platform is product-agnostic: add EzBillify, a client's SaaS, a mobile
 * app — anything — by registering a Product. Nothing here is EzBillify-specific.
 */
export type Platform = 'web' | 'android' | 'ios' | 'api';

export interface WebTarget {
  /** Base URL the web runner drives, e.g. https://ezbillify.com */
  baseUrl: string;
  /** Browsers to run against; defaults to all three engines. */
  browsers?: Array<'chromium' | 'firefox' | 'webkit'>;
}

export interface AndroidTarget {
  /** Absolute path or lease ref to a signed .apk/.aab (never built by us). */
  appPath?: string;
  appPackage?: string;
  appActivity?: string;
}

export interface IosTarget {
  /** Absolute path to a signed .ipa (real device) or simulator .app. */
  appPath?: string;
  bundleId?: string;
}

export interface MobileTarget {
  android?: AndroidTarget;
  ios?: IosTarget;
}

/** Production-safety posture — enforced by runners and (later) the egress gateway. */
export interface SafetyPolicy {
  /** Default true: no state-changing actions against production. */
  readOnly?: boolean;
  /** Default true: never initiate real payments/refunds/payouts. */
  blockPayments?: boolean;
}

export interface Product {
  /** Stable slug, e.g. "ezbillify". */
  id: string;
  name: string;
  /** Which surfaces this product exposes. */
  platforms: Platform[];
  web?: WebTarget;
  mobile?: MobileTarget;
  safety?: SafetyPolicy;
  tags?: string[];
}
