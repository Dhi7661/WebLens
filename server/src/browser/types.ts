export interface MetaTagInfo {
  name?: string;
  property?: string;
  content?: string;
  httpEquiv?: string;
}

export interface ImageInfo {
  src: string;
  alt: string | null;
  hasAlt: boolean;
  width?: number;
  height?: number;
  loading?: string;
  selector: string;
}

export interface LinkInfo {
  href: string;
  text: string;
  rel?: string;
  target?: string;
  isExternal: boolean;
}

export interface ScriptInfo {
  src?: string;
  async: boolean;
  defer: boolean;
  type?: string;
  isRenderBlocking: boolean;
}

export interface StylesheetInfo {
  href?: string;
  media?: string;
  rel?: string;
}

export interface HeadingInfo {
  level: number; // 1 for h1, 2 for h2, etc.
  text: string;
  selector: string;
}

export interface FormInfo {
  action?: string;
  method?: string;
  inputsCount: number;
  hasLabels: boolean;
  missingLabelsCount: number;
}

export interface ButtonInfo {
  text: string;
  ariaLabel?: string | null;
  hasAccessibleName: boolean;
  type?: string;
  selector: string;
}

export interface ResourceTimingInfo {
  name: string;
  initiatorType: string;
  duration: number;
  transferSize: number;
  encodedBodySize: number;
  decodedBodySize: number;
}

export interface TimingMetrics {
  navigationStart: number;
  responseStart: number;
  responseEnd: number;
  domContentLoaded: number;
  loadEvent: number;
  totalDurationMs: number;
}

export interface ResourceSummary {
  totalCount: number;
  totalBytes: number;
  imagesBytes: number;
  scriptsBytes: number;
  stylesheetsBytes: number;
  fontsBytes: number;
  otherBytes: number;
}

export interface PageContext {
  url: string;
  finalUrl: string;
  statusCode: number;
  headers: Record<string, string>;
  html: string;
  title: string;
  metaTags: MetaTagInfo[];
  links: LinkInfo[];
  images: ImageInfo[];
  scripts: ScriptInfo[];
  stylesheets: StylesheetInfo[];
  headings: HeadingInfo[];
  forms: FormInfo[];
  buttons: ButtonInfo[];
  lang?: string;
  viewport?: string;
  timing: TimingMetrics;
  resourceSummary: ResourceSummary;
  resources: ResourceTimingInfo[];
  consoleMessages: Array<{ type: string; text: string }>;
}
