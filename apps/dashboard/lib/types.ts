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
