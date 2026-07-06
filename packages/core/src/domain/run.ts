export type RunStatus = 'passed' | 'failed' | 'skipped' | 'error';

export interface TestCaseResult {
  name: string;
  status: RunStatus;
  durationMs: number;
  /** Present when the case did not pass. */
  error?: string;
  /** Paths to screenshots / traces / videos / reports. */
  artifacts?: string[];
}

export interface TestRunResult {
  productId: string;
  platform: string;
  runner: string;
  /** ISO timestamps. */
  startedAt: string;
  finishedAt: string;
  status: RunStatus;
  cases: TestCaseResult[];
}
