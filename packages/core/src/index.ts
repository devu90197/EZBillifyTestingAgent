export type {
  Platform,
  Product,
  WebTarget,
  WebAuthConfig,
  MobileTarget,
  AndroidTarget,
  IosTarget,
  SafetyPolicy,
} from './domain/product';
export type { GstInput, GstResult } from './domain/gst';
export { computeGst } from './domain/gst';
export type { RunStatus, TestCaseResult, TestRunResult } from './domain/run';
export type { RunnerPlugin, RunnerContext } from './ports/runner';
export { ProductRegistry } from './registry/product-registry';
export { TestingAgent } from './agent/agent';
