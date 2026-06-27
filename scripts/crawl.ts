#!/usr/bin/env npx tsx
/**
 * Qosmic audit crawl — surface discovery, screenshots, technical checks.
 * Usage: npm run crawl -- https://gingerpeople.com
 * Flags: --headed  force visible browser (helps with Cloudflare)
 */

import { chromium as chromiumExtra } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import type { BrowserContext, Page, Response } from "playwright";
import { createHash, randomBytes } from "node:crypto";
import { mkdir, writeFile, access } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { extractRichPageData, scrollForContent, capturePerformanceMetrics, type PerformanceMetrics } from "./extract-surface.js";
import { buildStoreInsights, extractCategoryKeywords } from "./store-insights.js";
import { buildFunnelAnalytics, type FunnelAnalytics } from "./funnel-analytics.js";
import { fetchShopifyProduct, fetchShopifyProductsIndex, fetchShopifyCollectionsIndex, fetchShopifyPagesIndex } from "./shopify-api.js";

chromiumExtra.use(StealthPlugin());

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

type SurfaceType =
  | "homepage"
  | "collection"
  | "category"
  | "pdp"
  | "cart"
  | "checkout"
  | "search"
  | "content"
  | "where-to-buy"
  | "other";

/** Per-type crawl budget — tuned for full-funnel CRO coverage on any storefront. */
const SURFACE_LIMITS: Record<SurfaceType, number> = {
  homepage: 1,
  collection: 4,
  category: 3,
  pdp: 5,
  cart: 1,
  checkout: 1,
  search: 1,
  "where-to-buy": 1,
  content: 6,
  other: 3,
};

const MAX_SURFACES = 28;

type Surface = {
  url: string;
  type: SurfaceType;
  screenshot?: string;
  fold_screenshot?: string;
  mobile_screenshot?: string;
  mobile_fold_screenshot?: string;
  status: number;
  status_note?: string;
  render_source?: "dom" | "api_fallback" | "geo_blocked";
  title?: string;
  meta_description?: string;
  text_excerpt?: string;
  above_fold_excerpt?: string;
  has_add_to_cart?: boolean;
  has_price?: boolean;
  h1?: string;
  h2_headings?: string[];
  nav_items?: string[];
  cta_buttons?: string[];
  review_count?: number | null;
  is_error_page?: boolean;
  sold_out?: boolean;
  has_retailer_handoff?: boolean;
  has_store_locator?: boolean;
  has_newsletter?: boolean;
  product_tile_count?: number;
  testimonial_snippets?: string[];
  page_url?: string;
  content_verified?: boolean;
  navigation_failure?: string;
  buy_module?: {
    price_text: string | null;
    atc_label: string | null;
    has_quantity_selector: boolean;
    has_variant_picker: boolean;
    has_subscription: boolean;
    retailer_links: string[];
  };
  trust_signals?: {
    free_shipping_threshold: string | null;
    return_policy_snippet: string | null;
    payment_icons: string[];
    security_badges: string[];
  };
  social_proof?: {
    star_rating: number | null;
    review_count: number | null;
    source: string | null;
  };
  structured_data?: {
    type: string;
    price: string | null;
    rating: number | null;
    review_count: number | null;
  }[];
  images?: {
    count: number;
    missing_alt_pct: number;
    largest_url: string | null;
    largest_bytes: number | null;
    total_bytes: number;
  };
  filters_and_sort?: string[];
  breadcrumb?: string | null;
  internal_links?: string[];
  performance?: PerformanceMetrics;
  shopify_product?: {
    title: string;
    handle: string;
    price: string | null;
    compare_at_price: string | null;
    available: boolean;
    vendor: string;
    product_type: string;
    tags: string[];
    description_excerpt: string;
    variant_count?: number;
    inventory_total?: number | null;
  };
};

type TechnicalCheck = {
  check: string;
  status: "Pass" | "Warn" | "Fail";
  detail: string;
};

type Manifest = {
  store_url: string;
  audit_id: string;
  crawled_at: string;
  purchase_model: "dtc" | "retailer_routed" | "hybrid" | "unknown";
  crawl_mode: string;
  surfaces: Surface[];
  technical_checks: TechnicalCheck[];
  category_keywords: string[];
  funnel_analytics?: FunnelAnalytics;
  funnel_steps?: {
    pdp_url: string;
    add_to_cart: boolean;
    cart_has_items: boolean;
    checkout_reachable: boolean;
  };
  store_insights?: {
    store_name: string;
    purchase_path_summary: string;
    top_leaks: string[];
    scored_leaks?: { id: string; description: string; severity: number; pillar: string; estimated_session_impact_pct: string }[];
    strengths: string[];
    experiment_seeds: string[];
    funnel_health_score?: number;
    buy_path_completeness?: number;
  };
};

const WHERE_TO_BUY_RE =
  /where-to-buy|where-to-find|store-locator|find-a-store|find-near|stockists|retailers/i;
const CONTENT_RE =
  /\/(blog|blogs|faq|about|recipes|pages\/|stories|journal|learn|health-|education|bulk|wholesale|ingredients)\//i;
const COLLECTION_RE = /\/collections\//i;
const PDP_RE = /\/products\/[^/]+/i;
const CATALOG_RE =
  /\/products\/?$|all-products|shop-all|the-.*-products|product-catalog|\/catalog\/?$|-products\/?$/i;
const SEARCH_RE = /\/search/i;
const CHECKOUT_RE = /\/checkout/i;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const humanDelay = (min = 1500, max = 3500) =>
  sleep(min + Math.floor(Math.random() * (max - min)));

function normalizeUrl(href: string, base: URL): string | null {
  try {
    const u = new URL(href, base);
    if (!["http:", "https:"].includes(u.protocol)) return null;
    const host = base.hostname.replace(/^www\./, "");
    const linkHost = u.hostname.replace(/^www\./, "");
    if (linkHost !== host) return null;
    u.hash = "";
    return u.toString().replace(/\/$/, "") || u.toString();
  } catch {
    return null;
  }
}

function classifyUrl(url: string, isHomepage = false): SurfaceType {
  if (isHomepage) return "homepage";
  const path = new URL(url).pathname.toLowerCase();
  if (path === "/cart" || path.endsWith("/cart")) return "cart";
  if (CHECKOUT_RE.test(path)) return "checkout";
  if (SEARCH_RE.test(path)) return "search";
  if (WHERE_TO_BUY_RE.test(url) || WHERE_TO_BUY_RE.test(path)) return "where-to-buy";
  if (PDP_RE.test(path)) return "pdp";
  if (COLLECTION_RE.test(path)) return "collection";
  if (CATALOG_RE.test(path)) return "category";
  if (CONTENT_RE.test(path) || /\/(faq|about|contact|bulk|wholesale)/i.test(path)) return "content";
  return "other";
}

function slugFromUrl(url: string): string {
  const path = new URL(url).pathname.replace(/^\//, "").replace(/\//g, "-") || "home";
  return path.slice(0, 60).replace(/[^a-z0-9-]/gi, "-");
}

function hashShort(s: string): string {
  return createHash("sha256").update(s).digest("hex").slice(0, 8);
}

function auditId(): string {
  return `aud_${randomBytes(8).toString("hex")}`;
}

async function isBlocked(page: Page): Promise<boolean> {
  const title = await page.title();
  const body = await page.locator("body").innerText().catch(() => "");
  return /cloudflare|attention required|been blocked|sorry, you have been blocked/i.test(
    `${title} ${body}`
  );
}

async function extractPageData(page: Page) {
  return extractRichPageData(page);
}

function catalogPriority(url: string): number {
  if (/\/products\/?$|all-products|shop-all|the-.*-products/i.test(url)) return 10;
  if (/\/collections\/(all|frontpage|best-sellers|new)/i.test(url)) return 9;
  if (/\/collections\//i.test(url)) return 5;
  if (/\/pages\//i.test(url)) return 4;
  if (/\/blogs?\//i.test(url)) return 3;
  return 0;
}

function pickSurfaces(surfaces: Map<string, SurfaceType>): Map<string, SurfaceType> {
  const picked = new Map<string, SurfaceType>();
  const byType = new Map<SurfaceType, string[]>();
  for (const [url, type] of surfaces) {
    if (!byType.has(type)) byType.set(type, []);
    byType.get(type)!.push(url);
  }

  for (const [, urls] of byType) {
    urls.sort((a, b) => catalogPriority(b) - catalogPriority(a));
  }

  const order: SurfaceType[] = [
    "homepage",
    "collection",
    "category",
    "pdp",
    "cart",
    "checkout",
    "search",
    "where-to-buy",
    "content",
    "other",
  ];

  for (const type of order) {
    const urls = byType.get(type) || [];
    const limit = SURFACE_LIMITS[type];
    for (const url of urls.slice(0, limit)) {
      picked.set(url, type);
    }
  }

  return new Map(Array.from(picked.entries()).slice(0, MAX_SURFACES));
}

async function discoverUrlsFromSitemapXml(xml: string): Promise<string[]> {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/gi)].map((m) => m[1].trim());
}

async function discoverFromSitemap(origin: string): Promise<string[]> {
  try {
    const res = await fetch(`${origin}/sitemap.xml`, {
      headers: { "User-Agent": "QosmicAuditBot/1.0" },
    });
    if (!res.ok) return [];
    const xml = await res.text();

    const childSitemaps = [...xml.matchAll(/<loc>([^<]+)<\/loc>/gi)]
      .map((m) => m[1].trim())
      .filter((loc) => /sitemap.*\.xml/i.test(loc));

    if (childSitemaps.length > 0) {
      const urls: string[] = [];
      for (const child of childSitemaps.slice(0, 5)) {
        try {
          const childRes = await fetch(child, { headers: { "User-Agent": "QosmicAuditBot/1.0" } });
          if (childRes.ok) urls.push(...(await discoverUrlsFromSitemapXml(await childRes.text())));
        } catch {
          /* skip child */
        }
      }
      return urls;
    }

    return discoverUrlsFromSitemapXml(xml);
  } catch {
    return [];
  }
}

function seedDiscoveryPaths(baseUrl: URL): string[] {
  const origin = baseUrl.origin;
  return [
    "/cart",
    "/checkout",
    "/search",
    "/collections/all",
    "/products",
    "/pages/about",
    "/pages/about-us",
    "/pages/contact",
    "/pages/faq",
    "/pages/faqs",
    "/blogs/news",
    "/blogs/blog",
  ].map((p) => `${origin}${p}`);
}

async function discoverLinks(page: Page, baseUrl: URL): Promise<Map<string, SurfaceType>> {
  const links = await page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll("a[href]"));
    return anchors.map((a) => (a as HTMLAnchorElement).href).filter(Boolean);
  });

  const surfaces = new Map<string, SurfaceType>();
  const home = normalizeUrl(baseUrl.origin + "/", baseUrl);
  if (home) surfaces.set(home, "homepage");

  for (const href of links) {
    const n = normalizeUrl(href, baseUrl);
    if (!n) continue;
    const type = classifyUrl(n, n === home);
    if (type !== "other" || /products|collections|cart|blog|faq|about/i.test(n)) {
      surfaces.set(n, type);
    }
  }

  const cartUrl = normalizeUrl("/cart", baseUrl);
  if (cartUrl) surfaces.set(cartUrl, "cart");

  const sitemapUrls = await discoverFromSitemap(baseUrl.origin);
  for (const href of sitemapUrls) {
    const n = normalizeUrl(href, baseUrl);
    if (!n) continue;
    const type = classifyUrl(n);
    if (type !== "other") surfaces.set(n, type);
  }

  const apiProducts = await fetchShopifyProductsIndex(baseUrl.origin);
  for (const href of apiProducts) {
    const n = normalizeUrl(href, baseUrl);
    if (n) surfaces.set(n, "pdp");
  }

  const apiCollections = await fetchShopifyCollectionsIndex(baseUrl.origin);
  for (const href of apiCollections) {
    const n = normalizeUrl(href, baseUrl);
    if (n) surfaces.set(n, "collection");
  }

  const apiPages = await fetchShopifyPagesIndex(baseUrl.origin);
  for (const href of apiPages) {
    const n = normalizeUrl(href, baseUrl);
    if (n) surfaces.set(n, "content");
  }

  for (const href of seedDiscoveryPaths(baseUrl)) {
    const n = normalizeUrl(href, baseUrl);
    if (!n) continue;
    if (!surfaces.has(n)) surfaces.set(n, classifyUrl(n));
  }

  return surfaces;
}

async function isGeoGatePage(page: Page): Promise<boolean> {
  const body = (await page.locator("body").innerText().catch(() => "")).slice(0, 800);
  return /choose your location|select your region|select country/i.test(body);
}

async function selectNorthAmericaRegion(page: Page): Promise<boolean> {
  const regionSelectors = [
    'button:has-text("NORTH AMERICA")',
    'a:has-text("NORTH AMERICA")',
    'button:has-text("United States")',
    'a:has-text("United States")',
    '[data-region="na"]',
  ];
  for (const sel of regionSelectors) {
    const el = page.locator(sel).first();
    if (!(await el.count())) continue;
    await el.click({ timeout: 5000 }).catch(() => null);
    await sleep(2000);
    return true;
  }
  return false;
}

async function bootstrapGeoSession(
  page: Page,
  context: BrowserContext,
  homeUrl: string,
  auditDir: string
): Promise<boolean> {
  await page.goto(homeUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
  await humanDelay(1500, 2500);
  if (!(await isGeoGatePage(page))) return false;

  console.log("  [geo] Bootstrapping region session (North America)...");
  const selected = await selectNorthAmericaRegion(page);
  if (!selected) return false;

  await sleep(2500);
  await dismissCookieModals(page);

  const storagePath = join(auditDir, "storage-state.json");
  await context.storageState({ path: storagePath });

  await page.goto(homeUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
  await sleep(1500);
  if (await isGeoGatePage(page)) {
    console.warn("  [geo] Region selected but gate still visible on homepage");
    return false;
  }
  console.log("  [geo] Session saved — geo gate cleared on homepage");
  return true;
}

async function selectStoreRegion(page: Page): Promise<boolean> {
  return selectNorthAmericaRegion(page);
}

async function dismissCookieModals(page: Page) {
  const selectors = [
    'button:has-text("Accept")',
    '[data-action="accept"]',
    'button:has-text("Close")',
    'button[aria-label="Close"]',
  ];
  for (const sel of selectors) {
    const btn = page.locator(sel).first();
    if (await btn.isVisible({ timeout: 800 }).catch(() => false)) {
      await btn.click({ timeout: 3000 }).catch(() => null);
      await sleep(400);
    }
  }
}

async function dismissModals(page: Page) {
  if (await isGeoGatePage(page)) {
    await selectNorthAmericaRegion(page);
    await sleep(1500);
  }
  await dismissCookieModals(page);
}

async function goHome(page: Page, homeUrl: string): Promise<void> {
  const logo = page.locator('a[href="/"], a[href*="index"], header a').first();
  if (await logo.count()) {
    await logo.click({ timeout: 8000 }).catch(() => null);
    await humanDelay(1000, 2000);
    if (!page.url().includes(new URL(homeUrl).hostname)) {
      await page.goto(homeUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
    }
  } else {
    await page.goto(homeUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
  }
  await humanDelay();
}

async function getCanonicalUrl(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const c = document.querySelector('link[rel="canonical"]')?.getAttribute("href");
    const og = document.querySelector('meta[property="og:url"]')?.getAttribute("content");
    return c || og || null;
  });
}

function pathsMatch(a: string, b: string): boolean {
  try {
    const pa = new URL(a).pathname.replace(/\/$/, "") || "/";
    const pb = new URL(b).pathname.replace(/\/$/, "") || "/";
    return pa === pb;
  } catch {
    return false;
  }
}

async function verifyOnTarget(
  page: Page,
  targetUrl: string,
  type: SurfaceType,
  homeH1?: string
): Promise<boolean> {
  const onPath =
    pathsMatch(page.url(), targetUrl) ||
    pathsMatch((await getCanonicalUrl(page)) || "", targetUrl);
  if (!onPath) return false;
  if (type === "homepage") return true;

  const h1 = (await page.locator("h1").first().innerText().catch(() => "")).trim();
  if (homeH1 && h1 === homeH1.trim()) return false;

  if (type === "pdp") {
    const slug = new URL(targetUrl).pathname.split("/").filter(Boolean).pop() || "";
    const body = (await page.locator("body").innerText().catch(() => "")).toLowerCase();
    const slugPhrase = slug.replace(/-/g, " ").toLowerCase();
    const hasProductDom =
      (await page.locator('[data-product-id], .product-single, [itemtype*="Product"]').count()) > 0;
    return body.includes(slugPhrase) || hasProductDom;
  }

  if (type === "cart") {
    const body = (await page.locator("body").innerText().catch(() => "")).slice(0, 800);
    return /cart|your bag|checkout|empty|not found|lost|404/i.test(body);
  }

  if (type === "search") {
    const body = (await page.locator("body").innerText().catch(() => "")).slice(0, 600);
    return /search|results|no results|find/i.test(body);
  }

  if (type === "checkout") {
    const body = (await page.locator("body").innerText().catch(() => "")).slice(0, 600);
    return /checkout|shipping|payment|order|contact information/i.test(body);
  }

  return true;
}

async function navigateToPdpFromHome(
  page: Page,
  targetUrl: string,
  homeUrl: string,
  homeH1?: string
): Promise<boolean> {
  const slug = new URL(targetUrl).pathname.split("/").filter(Boolean).pop() || "";
  if (!slug) return false;

  await goHome(page, homeUrl);
  await dismissModals(page);

  const selectors = [
    `a[href*="/products/${slug}"]`,
    `a[href*="${slug}"]`,
  ];

  for (const sel of selectors) {
    const link = page.locator(sel).first();
    if (!(await link.count())) continue;
    try {
      await link.scrollIntoViewIfNeeded();
      await humanDelay(400, 900);
      await Promise.all([
        page.waitForLoadState("domcontentloaded", { timeout: 20000 }).catch(() => null),
        link.click({ timeout: 12000 }),
      ]);
      await humanDelay(2000, 3500);
      await dismissModals(page);
      if (await verifyOnTarget(page, targetUrl, "pdp", homeH1)) return true;
    } catch {
      /* next */
    }
  }
  return false;
}

/** Navigate and verify we landed on real page content (not homepage shell). */
async function navigateToSurface(
  page: Page,
  targetUrl: string,
  homeUrl: string,
  type: SurfaceType,
  homeH1?: string,
  hasGeoSession = false
): Promise<{ verified: boolean; httpStatus: number }> {
  let httpStatus = 0;
  const getDocStatus = attachDocumentStatusListener(page);

  const waitStrategies: Array<"domcontentloaded" | "load" | "networkidle"> =
    type === "pdp" && hasGeoSession
      ? ["domcontentloaded", "networkidle", "load"]
      : ["domcontentloaded", "load"];

  for (const waitUntil of waitStrategies) {
    const timeout = waitUntil === "networkidle" ? 8000 : 35000;
    const response = await page.goto(targetUrl, { waitUntil, timeout }).catch(() => null);
    if (response) httpStatus = response.status();
    const listenerStatus = getDocStatus();
    if (listenerStatus) httpStatus = listenerStatus;
    await humanDelay(2000, 3500);
    await dismissModals(page);
    if (await isGeoGatePage(page)) {
      return { verified: false, httpStatus: httpStatus || 200 };
    }
    if (await isBlocked(page)) continue;
    if (await verifyOnTarget(page, targetUrl, type, homeH1)) {
      return { verified: true, httpStatus: httpStatus || 200 };
    }
  }

  const clickOk = await navigateViaClick(page, targetUrl, homeUrl);
  if (clickOk && !(await isBlocked(page)) && (await verifyOnTarget(page, targetUrl, type, homeH1))) {
    return { verified: true, httpStatus: httpStatus || 200 };
  }

  if (type === "pdp") {
    const pdpOk = await navigateToPdpFromHome(page, targetUrl, homeUrl, homeH1);
    if (pdpOk) return { verified: true, httpStatus: httpStatus || 200 };
  }

  // Detect geo gate
  const body = (await page.locator("body").innerText().catch(() => "")).slice(0, 500);
  const geoGate = /choose your location|select your region|select country/i.test(body);
  return { verified: false, httpStatus: geoGate ? 200 : httpStatus };
}

/** Click-only navigation — fallback when direct goto fails or WAF blocks */
async function navigateViaClick(
  page: Page,
  targetUrl: string,
  homeUrl: string
): Promise<boolean> {
  const targetPath = new URL(targetUrl).pathname.replace(/\/$/, "") || "/";
  const currentPath = new URL(page.url()).pathname.replace(/\/$/, "") || "/";

  if (currentPath === targetPath && !(await isBlocked(page))) return true;

  await goHome(page, homeUrl);
  if (await isBlocked(page)) return false;

  const pathVariants = [targetPath, `${targetPath}/`];
  const selectors: string[] = [];
  for (const p of pathVariants) {
    selectors.push(`a[href="${p}"]`, `a[href="${p}"]`);
  }
  if (targetPath.includes("cart")) {
    selectors.push('a[href*="/cart"]', 'a:has-text("Cart")');
  }
  if (/where-to-buy|where-to-find/i.test(targetPath)) {
    selectors.push('a:has-text("WHERE TO BUY")', 'a:has-text("Where to Buy")');
  }
  if (/product/i.test(targetPath)) {
    selectors.push(`a[href*="${targetPath.split("/").pop()}"]`);
  }

  for (const sel of selectors) {
    const link = page.locator(sel).first();
    if (!(await link.count())) continue;
    try {
      await link.scrollIntoViewIfNeeded();
      await humanDelay(400, 1200);
      await Promise.all([
        page.waitForLoadState("domcontentloaded", { timeout: 20000 }).catch(() => null),
        link.click({ timeout: 12000 }),
      ]);
      await humanDelay(2000, 4000);
      const landed = new URL(page.url()).pathname.replace(/\/$/, "") === targetPath;
      if (landed && !(await isBlocked(page))) return true;
    } catch {
      /* try next selector */
    }
  }

  return false;
}

function attachDocumentStatusListener(page: Page): () => number {
  let docStatus = 0;
  const handler = (response: Response) => {
    if (response.request().resourceType() === "document") {
      docStatus = response.status();
    }
  };
  page.on("response", handler);
  return () => docStatus;
}

async function sampleInternalLinks(
  context: BrowserContext,
  origin: string,
  links: string[],
  limit = 10
): Promise<string[]> {
  const broken: string[] = [];
  const sample = links
    .filter((l) => {
      try {
        const u = new URL(l, origin);
        return u.origin === origin && !l.includes("#");
      } catch {
        return false;
      }
    })
    .slice(0, limit);

  for (const link of sample) {
    try {
      const res = await context.request.get(link, { timeout: 12000 });
      if (res.status() >= 400) broken.push(`${link} (${res.status()})`);
    } catch {
      broken.push(link);
    }
  }
  return broken;
}

async function createBrowser(
  headed: boolean,
  useChrome: boolean,
  storageStatePath?: string
): Promise<{ context: BrowserContext; mode: string; close: () => Promise<void> }> {
  const launchOpts: Parameters<typeof chromiumExtra.launch>[0] = {
    headless: !headed,
    args: [
      "--disable-blink-features=AutomationControlled",
      "--disable-dev-shm-usage",
      "--no-sandbox",
    ],
  };

  let channel: "chrome" | undefined;
  if (useChrome) {
    try {
      channel = "chrome";
    } catch {
      channel = undefined;
    }
  }

  let browser;
  try {
    browser = await chromiumExtra.launch({ ...launchOpts, channel });
  } catch {
    browser = await chromiumExtra.launch(launchOpts);
  }

  const mode = `${channel ?? "chromium"}-${headed ? "headed" : "headless"}-stealth`;
  const contextOpts: Parameters<typeof browser.newContext>[0] = {
    viewport: { width: 1440, height: 900 },
    locale: "en-US",
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    extraHTTPHeaders: { "Accept-Language": "en-US,en;q=0.9" },
  };
  if (storageStatePath) {
    try {
      await access(storageStatePath);
      contextOpts.storageState = storageStatePath;
    } catch {
      /* no saved session */
    }
  }
  const context = await browser.newContext(contextOpts);
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
  });
  return {
    context,
    mode,
    close: () => browser.close(),
  };
}

function inferPurchaseModel(surfaces: Surface[]): Manifest["purchase_model"] {
  const pdps = surfaces.filter((s) => s.type === "pdp" && s.status < 400);
  if (pdps.length === 0) {
    const home = surfaces.find((s) => s.type === "homepage");
    if (home && !home.has_add_to_cart && !home.has_price) return "retailer_routed";
    return "unknown";
  }
  const withCart = pdps.filter((s) => s.has_add_to_cart).length;
  const withPrice = pdps.filter((s) => s.has_price).length;
  if (withCart >= pdps.length / 2 && withPrice >= pdps.length / 2) return "dtc";
  if (withCart === 0 && withPrice === 0) return "retailer_routed";
  if (withCart > 0 || withPrice > 0) return "hybrid";
  return "unknown";
}

async function headCheck(url: string): Promise<{ status: number; ok: boolean }> {
  try {
    const res = await fetch(url, { method: "HEAD", redirect: "follow" });
    return { status: res.status, ok: res.ok };
  } catch {
    return { status: 0, ok: false };
  }
}

function countProductJsonLdOnVerifiedPdps(surfaces: Surface[]): number {
  return surfaces.filter(
    (s) =>
      s.type === "pdp" &&
      s.content_verified &&
      s.structured_data?.some((d) => /product/i.test(d.type))
  ).length;
}

function buildTechnicalChecks(
  surfaces: Surface[],
  extras: {
    sitemapOk: boolean;
    robotsOk: boolean;
    httpRedirect: boolean;
    sslOk: boolean;
    mobileHomeOk: boolean;
    brokenLinks: string[];
    productJsonLdPdps: number;
    verifiedPdpCount: number;
    metaPages: number;
    faviconOk: boolean;
    privacyLink: boolean;
    cartReachable: boolean;
    cloudflareBlocks: number;
    homeLcpMs: number | null;
    homePageWeightBytes: number | null;
    homeMissingAltPct: number | null;
  }
): TechnicalCheck[] {
  const critical = surfaces.filter((s) =>
    ["homepage", "pdp", "collection", "category", "cart"].includes(s.type)
  );
  const failedCritical = critical.filter((s) => s.status >= 400 || s.status === 0);

  let mobileSpeedStatus: "Pass" | "Warn" | "Fail" = "Warn";
  let mobileSpeedDetail = "No performance metrics captured.";
  if (extras.homeLcpMs != null) {
    if (extras.homeLcpMs <= 2500) {
      mobileSpeedStatus = "Pass";
      mobileSpeedDetail = `Homepage LCP ${extras.homeLcpMs}ms (good).`;
    } else if (extras.homeLcpMs <= 4000) {
      mobileSpeedStatus = "Warn";
      mobileSpeedDetail = `Homepage LCP ${extras.homeLcpMs}ms (needs improvement).`;
    } else {
      mobileSpeedStatus = "Fail";
      mobileSpeedDetail = `Homepage LCP ${extras.homeLcpMs}ms (poor).`;
    }
  }

  let imageStatus: "Pass" | "Warn" | "Fail" = "Warn";
  let imageDetail = "Image audit not run.";
  if (extras.homeMissingAltPct != null) {
    if (extras.homeMissingAltPct <= 10) {
      imageStatus = "Pass";
      imageDetail = `${extras.homeMissingAltPct}% images missing alt text on homepage.`;
    } else if (extras.homeMissingAltPct <= 30) {
      imageStatus = "Warn";
      imageDetail = `${extras.homeMissingAltPct}% images missing alt text on homepage.`;
    } else {
      imageStatus = "Fail";
      imageDetail = `${extras.homeMissingAltPct}% images missing alt text on homepage.`;
    }
  }
  if (extras.homePageWeightBytes != null && extras.homePageWeightBytes > 3_000_000) {
    imageStatus = imageStatus === "Pass" ? "Warn" : imageStatus;
    imageDetail += ` Total page weight ${Math.round(extras.homePageWeightBytes / 1024 / 1024)}MB.`;
  }

  return [
    {
      check: "SSL Certificate",
      status: extras.sslOk ? "Pass" : "Fail",
      detail: extras.sslOk ? "HTTPS storefront loaded successfully." : "Store did not load over HTTPS.",
    },
    {
      check: "HTTPS Redirect",
      status: extras.httpRedirect ? "Pass" : "Warn",
      detail: extras.httpRedirect ? "HTTP redirects to HTTPS." : "HTTP redirect was not verified in this pass.",
    },
    {
      check: "Sitemap",
      status: extras.sitemapOk ? "Pass" : "Warn",
      detail: extras.sitemapOk ? "sitemap.xml responded successfully." : "sitemap.xml not found or returned an error.",
    },
    {
      check: "Robots.txt",
      status: extras.robotsOk ? "Pass" : "Warn",
      detail: extras.robotsOk ? "robots.txt responded successfully." : "robots.txt not found or returned an error.",
    },
    {
      check: "Critical Pages Loading",
      status: failedCritical.length === 0 ? "Pass" : failedCritical.length <= 1 ? "Warn" : "Fail",
      detail:
        failedCritical.length === 0
          ? extras.cloudflareBlocks > 0
            ? `Homepage and key surfaces loaded; ${extras.cloudflareBlocks} page(s) hit WAF during crawl.`
            : "Homepage, collections, and PDPs loaded."
          : `Issues on: ${failedCritical.map((s) => s.url).join(", ")}.`,
    },
    {
      check: "Meta Tags & Social Previews",
      status: extras.metaPages >= surfaces.length / 2 ? "Pass" : "Warn",
      detail: `${extras.metaPages}/${surfaces.length} pages had title + meta description.`,
    },
    {
      check: "Structured Data",
      status: extras.productJsonLdPdps >= 1 ? "Pass" : "Warn",
      detail:
        extras.productJsonLdPdps >= 1
          ? `Product JSON-LD on ${extras.productJsonLdPdps} verified PDP(s).`
          : extras.verifiedPdpCount > 0
            ? "No Product JSON-LD on verified PDPs."
            : "No verified PDPs — Product JSON-LD not confirmed.",
    },
    {
      check: "Favicon",
      status: extras.faviconOk ? "Pass" : "Warn",
      detail: extras.faviconOk ? "Favicon link detected on homepage." : "Favicon not detected from captured evidence.",
    },
    {
      check: "Mobile-Friendly",
      status: extras.mobileHomeOk ? "Pass" : "Warn",
      detail: extras.mobileHomeOk ? "Mobile viewport screenshot captured for homepage." : "Mobile capture was not completed.",
    },
    {
      check: "Page Speed Mobile",
      status: mobileSpeedStatus,
      detail: mobileSpeedDetail,
    },
    {
      check: "Page Speed Desktop",
      status: mobileSpeedStatus,
      detail: extras.homeLcpMs != null
        ? `Homepage LCP ${extras.homeLcpMs}ms from CDP metrics.`
        : "No desktop speed run performed.",
    },
    {
      check: "Broken Links",
      status: extras.brokenLinks.length === 0 ? "Pass" : extras.brokenLinks.length <= 1 ? "Warn" : "Fail",
      detail:
        extras.brokenLinks.length === 0
          ? "No broken internal links detected in homepage link check."
          : `Broken/blocked: ${extras.brokenLinks.join(", ")}.`,
    },
    {
      check: "Image Optimization",
      status: imageStatus,
      detail: imageDetail,
    },
    {
      check: "Cookie/Privacy",
      status: extras.privacyLink ? "Pass" : "Warn",
      detail: extras.privacyLink ? "Privacy policy link visible in footer." : "Privacy policy link not confirmed.",
    },
    {
      check: "Checkout Reachable",
      status: extras.cartReachable ? "Pass" : "Fail",
      detail: extras.cartReachable ? "Cart URL loaded without error." : "Cart/checkout path was not reachable from crawl.",
    },
  ];
}

async function enrichSurfacesFromShopify(surfaces: Surface[]): Promise<void> {
  await Promise.all(
    surfaces.map(async (s) => {
      if (s.type !== "pdp") return;
      const meta = await fetchShopifyProduct(s.url);
      if (!meta) return;
      s.shopify_product = meta;
      if (!s.content_verified) {
        s.render_source = s.render_source || "api_fallback";
        s.h1 = s.h1 || meta.title;
        s.title = s.title || meta.title;
        s.has_price = s.has_price || meta.price != null;
        s.sold_out = s.sold_out || !meta.available;
        if (meta.description_excerpt && (!s.text_excerpt || s.text_excerpt.length < 200)) {
          s.text_excerpt = meta.description_excerpt;
        }
      }
    })
  );
}

async function probeDtcFunnel(
  page: Page,
  pdpUrl: string,
  homeUrl: string
): Promise<{
  pdp_url: string;
  add_to_cart: boolean;
  cart_has_items: boolean;
  checkout_reachable: boolean;
} | null> {
  try {
    const nav = await navigateToSurface(page, pdpUrl, homeUrl, "pdp");
    if (!nav.verified) return null;

    const atc = page.locator(
      '[name="add"], button[class*="add-to-cart"], button[class*="addtocart"], form[action*="/cart/add"] button, [data-add-to-cart]'
    ).first();
    if (!(await atc.count())) {
      return { pdp_url: pdpUrl, add_to_cart: false, cart_has_items: false, checkout_reachable: false };
    }

    await atc.click({ timeout: 8000 }).catch(() => null);
    await sleep(2000);

    const cartUrl = new URL("/cart", homeUrl).toString();
    await page.goto(cartUrl, { waitUntil: "domcontentloaded", timeout: 20000 }).catch(() => null);
    await sleep(1500);
    const cartBody = (await page.locator("body").innerText().catch(() => "")).toLowerCase();
    const cart_has_items =
      !/empty|no items|0 items/i.test(cartBody) &&
      (/subtotal|checkout|quantity|remove/i.test(cartBody));

    let checkout_reachable = false;
    if (cart_has_items) {
      const checkoutLink = page.locator('a[href*="/checkout"], button[name="checkout"], [class*="checkout"]').first();
      if (await checkoutLink.count()) {
        await checkoutLink.click({ timeout: 8000 }).catch(() => null);
        await sleep(2000);
        checkout_reachable = /checkout|shipping|payment|contact information/i.test(
          (await page.locator("body").innerText().catch(() => "")).slice(0, 600)
        );
      }
    }

    return { pdp_url: pdpUrl, add_to_cart: true, cart_has_items, checkout_reachable };
  } catch {
    return null;
  }
}

type CrawlOptions = {
  storageStatePath?: string;
  onlyUrls?: Set<string>;
  preDiscovered?: Map<string, SurfaceType>;
  geoBootstrapped?: boolean;
};

async function runCrawl(
  storeUrl: string,
  id: string,
  screenshotDir: string,
  auditDir: string,
  headed: boolean,
  useChrome: boolean,
  opts: CrawlOptions = {}
): Promise<{
  surfaces: Surface[];
  mode: string;
  brokenLinks: string[];
  cloudflareBlocks: number;
  metaPages: number;
  faviconOk: boolean;
  privacyLink: boolean;
  sampledBrokenLinks: string[];
  funnel_steps?: Manifest["funnel_steps"];
  geoBootstrapped: boolean;
}> {
  const base = new URL(storeUrl);
  const homeUrl = base.origin + "/";
  const { context, mode, close } = await createBrowser(headed, useChrome, opts.storageStatePath);
  const page = await context.newPage();
  page.setDefaultTimeout(45000);

  let geoBootstrapped = opts.geoBootstrapped ?? false;
  if (!opts.storageStatePath && !geoBootstrapped && headed) {
    geoBootstrapped = await bootstrapGeoSession(page, context, homeUrl, auditDir);
  }

  const discovered = opts.preDiscovered ?? (await (async () => {
    await page.goto(homeUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
    await humanDelay(2000, 4000);
    await dismissModals(page);
    return discoverLinks(page, base);
  })());

  const toCrawl = pickSurfaces(discovered);
  const crawlEntries = [...toCrawl.entries()].filter(
    ([url]) => !opts.onlyUrls || opts.onlyUrls.has(url)
  );

  const surfaces: Surface[] = [];
  const brokenLinks: string[] = [];
  let cloudflareBlocks = 0;
  let metaPages = 0;
  let faviconOk = false;
  let privacyLink = false;
  let homeH1: string | undefined;
  let sampledBrokenLinks: string[] = [];
  let homeInternalLinks: string[] = [];

  const ordered = crawlEntries.sort(([urlA], [urlB]) => {
    if (classifyUrl(urlA, urlA === homeUrl.replace(/\/$/, "")) === "homepage") return -1;
    if (classifyUrl(urlB, urlB === homeUrl.replace(/\/$/, "")) === "homepage") return 1;
    return 0;
  });

  let perfCapturedForPdp = false;
  const hasGeoSession = Boolean(opts.storageStatePath) || geoBootstrapped;
  const foldTypes: SurfaceType[] = ["homepage", "pdp", "cart", "where-to-buy"];

  for (const [url, type] of ordered) {
    try {
      const isHome = type === "homepage";
      let contentVerified = isHome;
      let httpStatus = 200;
      let navigation_failure: string | undefined;
      const getDocStatus = attachDocumentStatusListener(page);

      if (isHome) {
        const response = await page.goto(homeUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
        httpStatus = response?.status() ?? getDocStatus() ?? 200;
        await humanDelay(2000, 4000);
        await dismissModals(page);
        if (await isGeoGatePage(page)) {
          contentVerified = false;
          navigation_failure = "geo_gate";
        } else {
          contentVerified = true;
        }
      } else {
        const nav = await navigateToSurface(page, url, homeUrl, type, homeH1, hasGeoSession);
        contentVerified = nav.verified;
        httpStatus = nav.httpStatus || getDocStatus() || 0;
        if (!contentVerified) {
          if (await isGeoGatePage(page)) {
            navigation_failure = "geo_gate";
          }
          console.warn(`  [warn] content not verified for ${url}${navigation_failure ? " (geo_gate)" : ""}`);
        }
      }

      const blocked = await isBlocked(page);
      const geoBlocked = navigation_failure === "geo_gate" || (await isGeoGatePage(page));
      const ok = !blocked && !geoBlocked && (isHome || contentVerified);
      const status = blocked ? 403 : httpStatus >= 400 ? httpStatus : ok ? (httpStatus || 200) : httpStatus || 0;
      const status_note = blocked ? "cloudflare_or_waf" : undefined;
      if (blocked) cloudflareBlocks++;
      if (status >= 400 || status === 0) brokenLinks.push(url);

      await scrollForContent(page, type);
      await dismissModals(page);
      const data = await extractPageData(page);

      let performance: PerformanceMetrics | undefined;
      if (type === "homepage" || (type === "pdp" && contentVerified && !perfCapturedForPdp)) {
        await sleep(500);
        performance = await capturePerformanceMetrics(page);
        if (type === "pdp") perfCapturedForPdp = true;
      }

      if (data.title && data.meta_description) metaPages++;
      if (type === "homepage") {
        faviconOk = data.has_favicon;
        privacyLink = /privacy/i.test(await page.content());
        homeH1 = data.h1;
        homeInternalLinks = data.internal_links || [];
      }

      const slug = slugFromUrl(url);
      const shotName = `${hashShort(url)}-${slug}.png`;
      let screenshotPath: string | undefined;
      if (!geoBlocked || isHome) {
        await page.screenshot({ path: join(screenshotDir, shotName), fullPage: true });
        screenshotPath = `audits/${id}/screenshots/${shotName}`;
      }

      let foldShot: string | undefined;
      let mobileFoldShot: string | undefined;
      if (foldTypes.includes(type) && !geoBlocked) {
        const foldName = `${hashShort(url)}-${slug}-fold.png`;
        await page.screenshot({ path: join(screenshotDir, foldName), fullPage: false });
        foldShot = `audits/${id}/screenshots/${foldName}`;

        await page.setViewportSize({ width: 390, height: 844 });
        await sleep(400);
        const mobileFoldName = `${hashShort(url)}-${slug}-mobile-fold.png`;
        await page.screenshot({ path: join(screenshotDir, mobileFoldName), fullPage: false });
        mobileFoldShot = `audits/${id}/screenshots/${mobileFoldName}`;
        await page.setViewportSize({ width: 1440, height: 900 });
      }

      let mobileShot: string | undefined;
      if ((type === "homepage" || type === "pdp") && !geoBlocked) {
        await page.setViewportSize({ width: 390, height: 844 });
        await sleep(500);
        const mobileName = `${hashShort(url)}-${slug}-mobile.png`;
        await page.screenshot({ path: join(screenshotDir, mobileName), fullPage: false });
        mobileShot = `audits/${id}/screenshots/${mobileName}`;
        await page.setViewportSize({ width: 1440, height: 900 });
      }

      let render_source: Surface["render_source"] = "dom";
      if (geoBlocked) render_source = "geo_blocked";
      else if (!contentVerified && type === "pdp") render_source = undefined;

      surfaces.push({
        url,
        type,
        status,
        status_note,
        page_url: page.url(),
        content_verified: contentVerified && !geoBlocked,
        navigation_failure,
        render_source,
        screenshot: screenshotPath,
        fold_screenshot: foldShot,
        mobile_screenshot: mobileShot,
        mobile_fold_screenshot: mobileFoldShot,
        title: data.title,
        meta_description: data.meta_description,
        text_excerpt: data.text_excerpt,
        above_fold_excerpt: data.above_fold_excerpt,
        has_add_to_cart: data.has_add_to_cart,
        has_price: data.has_price,
        h1: data.h1,
        h2_headings: data.h2_headings,
        nav_items: data.nav_items,
        cta_buttons: data.cta_buttons,
        review_count: data.review_count,
        is_error_page: data.is_error_page,
        sold_out: data.sold_out,
        has_retailer_handoff: data.has_retailer_handoff,
        has_store_locator: data.has_store_locator,
        has_newsletter: data.has_newsletter,
        product_tile_count: data.product_tile_count,
        testimonial_snippets: data.testimonial_snippets,
        buy_module: data.buy_module,
        trust_signals: data.trust_signals,
        social_proof: data.social_proof,
        structured_data: data.structured_data,
        images: data.images,
        filters_and_sort: data.filters_and_sort,
        breadcrumb: data.breadcrumb,
        internal_links: data.internal_links,
        performance,
      });

      console.log(`  [${type}] ${status}${blocked ? " (WAF)" : ""}${!contentVerified && !blocked ? " (unverified)" : ""}${geoBlocked ? " (geo)" : ""} ${url}`);
    } catch (e) {
      console.warn(`  [skip] ${url}: ${e}`);
      surfaces.push({ url, type, status: 0, render_source: "geo_blocked" });
      brokenLinks.push(url);
    }
  }

  if (homeInternalLinks.length > 0 && !opts.onlyUrls) {
    sampledBrokenLinks = await sampleInternalLinks(context, base.origin, homeInternalLinks);
    if (sampledBrokenLinks.length) {
      console.log(`  [links] ${sampledBrokenLinks.length} broken in homepage sample`);
    }
  }

  await enrichSurfacesFromShopify(surfaces);

  for (const s of surfaces) {
    if (s.type === "pdp" && s.shopify_product && s.status === 0) {
      s.status = 200;
    }
    if (s.type === "pdp" && !s.content_verified && s.shopify_product) {
      s.render_source = "api_fallback";
    }
  }

  let funnel_steps: Manifest["funnel_steps"];
  const purchaseModelGuess = inferPurchaseModel(surfaces);
  if (purchaseModelGuess === "dtc" || purchaseModelGuess === "hybrid") {
    const verifiedPdp = surfaces.find(
      (s) => s.type === "pdp" && s.content_verified && s.has_add_to_cart
    );
    if (verifiedPdp) {
      console.log(`  [funnel] Probing add-to-cart on ${verifiedPdp.url}`);
      const steps = await probeDtcFunnel(page, verifiedPdp.url, homeUrl);
      if (steps) funnel_steps = steps;
    }
  }

  await close();

  return {
    surfaces,
    mode,
    brokenLinks,
    cloudflareBlocks,
    metaPages,
    faviconOk,
    privacyLink,
    sampledBrokenLinks,
    funnel_steps,
    geoBootstrapped,
  };
}

function mergeSurfaces(existing: Surface[], updated: Surface[]): Surface[] {
  const byUrl = new Map(existing.map((s) => [s.url, s]));
  for (const s of updated) byUrl.set(s.url, s);
  return [...byUrl.values()];
}

async function runGeoBootstrapOnly(storeUrl: string, auditDir: string): Promise<string | null> {
  const homeUrl = new URL(storeUrl).origin + "/";
  const { context, close } = await createBrowser(true, true);
  const page = await context.newPage();
  const ok = await bootstrapGeoSession(page, context, homeUrl, auditDir);
  await close();
  return ok ? join(auditDir, "storage-state.json") : null;
}

async function main() {
  const args = process.argv.slice(2);
  const headedFlag = args.includes("--headed");
  const urlArg = args.find((a) => !a.startsWith("--"));

  if (!urlArg) {
    console.error("Usage: npm run crawl -- <shopify-store-url> [--headed]");
    process.exit(1);
  }

  const storeUrl = urlArg.startsWith("http") ? urlArg : `https://${urlArg}`;
  const id = auditId();
  const auditDir = join(ROOT, "audits", id);
  const screenshotDir = join(auditDir, "screenshots");
  await mkdir(screenshotDir, { recursive: true });

  console.log(`Crawling ${storeUrl} → audits/${id}`);

  let discovered: Map<string, SurfaceType> | undefined;
  let result;

  if (headedFlag) {
    result = await runCrawl(storeUrl, id, screenshotDir, auditDir, true, true);
    discovered = new Map(result.surfaces.map((s) => [s.url, s.type]));
  } else {
  // Pass 1: headless stealth
  result = await runCrawl(storeUrl, id, screenshotDir, auditDir, false, false);
  discovered = new Map(result.surfaces.map((s) => [s.url, s.type]));

  const blockedRatio =
    result.surfaces.filter((s) => s.status_note === "cloudflare_or_waf").length /
    Math.max(result.surfaces.length, 1);

  const geoGateFailures = result.surfaces.filter(
    (s) => s.navigation_failure === "geo_gate" || s.render_source === "geo_blocked"
  );
  const unverifiedFailures = result.surfaces.filter((s) => s.content_verified === false);
  const geoOnlyUnverified =
    unverifiedFailures.length > 0 &&
    unverifiedFailures.every(
      (s) => s.navigation_failure === "geo_gate" || s.render_source === "geo_blocked"
    );

  // Geo bootstrap: headed session save, then retry failed surfaces headless
  if (geoGateFailures.length > 0 && !headedFlag) {
    console.log(`\nGeo gate detected on ${geoGateFailures.length} surface(s) — bootstrapping region session...`);
    const storagePath = await runGeoBootstrapOnly(storeUrl, auditDir);
    if (storagePath) {
      const retryUrls = new Set(
        result.surfaces
          .filter((s) => !s.content_verified || s.navigation_failure === "geo_gate")
          .map((s) => s.url)
      );
      console.log(`  Retrying ${retryUrls.size} surface(s) with saved session...`);
      const retryResult = await runCrawl(storeUrl, id, screenshotDir, auditDir, false, false, {
        storageStatePath: storagePath,
        onlyUrls: retryUrls,
        preDiscovered: discovered,
        geoBootstrapped: true,
      });
      result = {
        ...result,
        surfaces: mergeSurfaces(result.surfaces, retryResult.surfaces),
        brokenLinks: [...new Set([...result.brokenLinks, ...retryResult.brokenLinks])],
        cloudflareBlocks: retryResult.cloudflareBlocks,
        metaPages: Math.max(result.metaPages, retryResult.metaPages),
        faviconOk: retryResult.faviconOk || result.faviconOk,
        privacyLink: retryResult.privacyLink || result.privacyLink,
        sampledBrokenLinks: retryResult.sampledBrokenLinks.length
          ? retryResult.sampledBrokenLinks
          : result.sampledBrokenLinks,
        funnel_steps: retryResult.funnel_steps ?? result.funnel_steps,
        geoBootstrapped: true,
      };
    }
  }

  // WAF retry: headed pass for blocked surfaces only
  if (blockedRatio > 0.3 && !headedFlag) {
    console.log(`\nWAF detected (${Math.round(blockedRatio * 100)}% blocked) — retrying blocked surfaces headed...`);
    const blockedUrls = new Set(
      result.surfaces.filter((s) => s.status_note === "cloudflare_or_waf").map((s) => s.url)
    );
    const storagePath = join(auditDir, "storage-state.json");
    let storageStatePath: string | undefined;
    try {
      await access(storagePath);
      storageStatePath = storagePath;
    } catch {
      /* no session */
    }
    const retryResult = await runCrawl(storeUrl, id, screenshotDir, auditDir, true, true, {
      onlyUrls: blockedUrls,
      preDiscovered: discovered,
      storageStatePath,
      geoBootstrapped: result.geoBootstrapped,
    });
    result = {
      ...result,
      surfaces: mergeSurfaces(result.surfaces, retryResult.surfaces),
      mode: retryResult.mode,
      brokenLinks: [...new Set([...result.brokenLinks, ...retryResult.brokenLinks])],
      cloudflareBlocks: result.surfaces.filter((s) => s.status_note === "cloudflare_or_waf").length,
      sampledBrokenLinks: retryResult.sampledBrokenLinks.length
        ? retryResult.sampledBrokenLinks
        : result.sampledBrokenLinks,
      funnel_steps: retryResult.funnel_steps ?? result.funnel_steps,
    };
  }

  const unverifiedRatio =
    result.surfaces.filter((s) => s.content_verified === false).length /
    Math.max(result.surfaces.length, 1);

  if (unverifiedRatio > 0.35 && !headedFlag && blockedRatio <= 0.3 && !geoOnlyUnverified) {
    console.log(
      `\n${Math.round(unverifiedRatio * 100)}% pages unverified — retrying failed surfaces headed...`
    );
    const retryUrls = new Set(
      result.surfaces.filter((s) => !s.content_verified).map((s) => s.url)
    );
    const retryResult = await runCrawl(storeUrl, id, screenshotDir, auditDir, true, true, {
      onlyUrls: retryUrls,
      preDiscovered: discovered,
      geoBootstrapped: result.geoBootstrapped,
    });
    result = {
      ...result,
      surfaces: mergeSurfaces(result.surfaces, retryResult.surfaces),
      mode: retryResult.mode,
      sampledBrokenLinks: retryResult.sampledBrokenLinks.length
        ? retryResult.sampledBrokenLinks
        : result.sampledBrokenLinks,
      funnel_steps: retryResult.funnel_steps ?? result.funnel_steps,
    };
  }
  }

  const origin = new URL(storeUrl).origin;
  const [sitemap, robots, httpCheck] = await Promise.all([
    headCheck(`${origin}/sitemap.xml`),
    headCheck(`${origin}/robots.txt`),
    fetch(`http://${new URL(storeUrl).hostname}/`, { redirect: "manual" }).catch(() => null),
  ]);

  const httpRedirect =
    httpCheck !== null &&
    (httpCheck.status === 301 || httpCheck.status === 302) &&
    (httpCheck.headers.get("location")?.startsWith("https") ?? false);

  const cartSurface = result.surfaces.find((s) => s.type === "cart");
  const cartReachable = Boolean(
    cartSurface &&
      cartSurface.status < 400 &&
      cartSurface.status > 0 &&
      !cartSurface.is_error_page &&
      !/not found|page not found|oops|lost/i.test(
        `${cartSurface.title || ""} ${cartSurface.text_excerpt || ""}`
      )
  );

  const purchaseModel = inferPurchaseModel(result.surfaces);
  const metaPages = result.metaPages;
  const verifiedPdpCount = result.surfaces.filter((s) => s.type === "pdp" && s.content_verified).length;
  const productJsonLdPdps = countProductJsonLdOnVerifiedPdps(result.surfaces);
  const allBrokenLinks = [...new Set([...result.brokenLinks, ...result.sampledBrokenLinks])];

  const homeSurface = result.surfaces.find((s) => s.type === "homepage");
  const funnelAnalytics = buildFunnelAnalytics(result.surfaces, purchaseModel, id);

  const manifest: Manifest = {
    store_url: storeUrl,
    audit_id: id,
    crawled_at: new Date().toISOString(),
    purchase_model: purchaseModel,
    crawl_mode: result.mode,
    surfaces: result.surfaces,
    category_keywords: extractCategoryKeywords(result.surfaces, storeUrl),
    funnel_analytics: funnelAnalytics,
    funnel_steps: result.funnel_steps,
    store_insights: buildStoreInsights(result.surfaces, purchaseModel, storeUrl, funnelAnalytics),
    technical_checks: buildTechnicalChecks(result.surfaces, {
      sitemapOk: sitemap.ok,
      robotsOk: robots.ok,
      httpRedirect,
      sslOk: storeUrl.startsWith("https"),
      mobileHomeOk: result.surfaces.some((s) => s.type === "homepage" && s.mobile_screenshot),
      brokenLinks: allBrokenLinks,
      productJsonLdPdps,
      verifiedPdpCount,
      metaPages,
      faviconOk: result.faviconOk,
      privacyLink: result.privacyLink,
      cartReachable,
      cloudflareBlocks: result.cloudflareBlocks,
      homeLcpMs: homeSurface?.performance?.lcp_ms ?? null,
      homePageWeightBytes: homeSurface?.performance?.total_page_weight_bytes ?? null,
      homeMissingAltPct: homeSurface?.images?.missing_alt_pct ?? null,
    }),
  };

  await writeFile(join(auditDir, "manifest.json"), JSON.stringify(manifest, null, 2));
  console.log(`\nManifest: audits/${id}/manifest.json`);
  console.log(`Purchase model: ${manifest.purchase_model}`);
  console.log(`Crawl mode: ${manifest.crawl_mode}`);
  console.log(`Surfaces: ${result.surfaces.length} (${result.cloudflareBlocks} WAF blocks)`);
  const byType = result.surfaces.reduce((acc, s) => {
    acc[s.type] = (acc[s.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  console.log(`  Breakdown: ${Object.entries(byType).map(([t, n]) => `${t}=${n}`).join(", ")}`);
  if (manifest.store_insights?.top_leaks.length) {
    console.log(`\nTop leaks detected (funnel health: ${funnelAnalytics.funnel_health_score}/100):`);
    manifest.store_insights.top_leaks.forEach((l) => console.log(`  • ${l}`));
  }
  console.log(`\n→ For readable report: npm run audit -- ${storeUrl}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
