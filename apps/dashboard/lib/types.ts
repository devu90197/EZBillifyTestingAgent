export interface Product {
  id: string;
  name: string;
  base_url: string;
  platforms: string[];
  status: string;
  created_at: string;
}

export interface LoginField {
  role: 'identifier' | 'password' | 'submit' | 'otp';
  selector: string;
  inputType?: string;
  name?: string;
  label?: string;
}

export interface AnalyzeResult {
  origin: string;
  startUrl: string;
  analyzedAt: string;
  crawl: {
    origin: string;
    pagesCrawled: number;
    pages: { url: string; status: number; title: string; depth: number; outLinks: number; error?: string }[];
  };
  login: {
    found: boolean;
    loginUrl?: string;
    scheme: string;
    fields: LoginField[];
    notes: string[];
  };
}

export interface ProductCredential {
  id: string;
  label: string;
  identifier_type: string;
  identifier: string;
  created_at: string;
}

export interface SiteAnalysisRow {
  id: string;
  created_at: string;
  login_scheme: string | null;
  login_url: string | null;
  pages_crawled: number | null;
}

export interface AuthCheck {
  url: string;
  status: number;
  title: string;
  consoleErrors: number;
  ok: boolean;
}

export interface AuthRunResult {
  loginAttempted: boolean;
  loginSuccess: boolean;
  detail: string;
  startUrl: string;
  loginUrl?: string;
  pagesChecked: number;
  passed: number;
  failed: number;
  checks: AuthCheck[];
  startedAt: string;
  finishedAt: string;
}

export interface TestRunRow {
  id: string;
  created_at: string;
  kind: string;
  status: string;
  summary: AuthRunResult | null;
}
