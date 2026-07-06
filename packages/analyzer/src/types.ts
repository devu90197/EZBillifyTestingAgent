export interface CrawledPage {
  url: string;
  status: number;
  title: string;
  depth: number;
  outLinks: number;
  error?: string;
}

export interface CrawlResult {
  origin: string;
  startUrl: string;
  pagesCrawled: number;
  pages: CrawledPage[];
}

export type LoginScheme =
  | 'email-password'
  | 'username-password'
  | 'phone-password'
  | 'otp'
  | 'unknown';

export interface LoginField {
  role: 'identifier' | 'password' | 'submit' | 'otp';
  selector: string;
  inputType?: string;
  name?: string;
  label?: string;
}

export interface LoginDetection {
  found: boolean;
  loginUrl?: string;
  scheme: LoginScheme;
  fields: LoginField[];
  notes: string[];
}

export interface AnalyzeOptions {
  maxPages?: number;
  maxDepth?: number;
  timeoutMs?: number;
}

export interface AnalyzeResult {
  origin: string;
  startUrl: string;
  analyzedAt: string;
  crawl: CrawlResult;
  login: LoginDetection;
}
