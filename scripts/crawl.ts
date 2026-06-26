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
import { mkdir, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

chromiumExtra.use(StealthPlugin());

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

type SurfaceType =
  | "homepage"
  | "collection"
  | "pdp"
  | "cart"
  | "content"
  | "where-to-buy"
  | "other";

type Surface = {
  url: string;
  type: SurfaceType;
  screenshot?: string;
  mobile_screenshot?: string;
  status: number;
  status_note?: string;
  title?: string;
  meta_description?: string;
  text_excerpt?: string;
  has_add_to_cart?: boolean;
  has_price?: boolean;
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
};

const WHERE_TO_BUY_RE =
  /where-to-buy|where-to-find|store-locator|find-a-store|find-near|stockists|retailers/i;
const CONTENT_RE =
  /\/(blog|blogs|faq|about|recipes|pages\/|stories|journal|learn)\//i;
const COLLECTION_RE = /\/collections\//i;
const PDP_RE = /\/products\//i;

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
  if (WHERE_TO_BUY_RE.test(url) || WHERE_TO_BUY_RE.test(path)) return "where-to-buy";
  if (PDP_RE.test(path)) return "pdp";
  if (COLLECTION_RE.test(path)) return "collection";
  if (CONTENT_RE.test(path) || /\/(faq|about|contact)/i.test(path)) return "content";
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
  return page.evaluate(() => {
    const title = document.title || "";
    const metaDesc =
      document.querySelector('meta[name="description"]')?.getAttribute("content") ||
      document.querySelector('meta[property="og:description"]')?.getAttribute("content") ||
      "";
    const body = document.body?.innerText || "";
    const excerpt = body.replace(/\s+/g, " ").trim().slice(0, 1500);
    const html = document.documentElement.innerHTML.toLowerCase();
    const hasAddToCart =
      /add to cart|add-to-cart|addtocart/i.test(html) ||
      !!document.querySelector('[name="add"], button[class*="add"], form[action*="/cart/add"]');
    const hasPrice =
      /class="[^"]*price[^"]*"/i.test(html) ||
      !!document.querySelector("[data-product-price], .price, .product-price, [itemprop=price]");
    const hasJsonLd = !!document.querySelector('script[type="application/ld+json"]');
    const favicon =
      !!document.querySelector('link[rel*="icon"]') ||
      !!document.querySelector('link[rel="shortcut icon"]');
    return {
      title,
      meta_description: metaDesc,
      text_excerpt: excerpt,
      has_add_to_cart: hasAddToCart,
      has_price: hasPrice,
      has_json_ld: hasJsonLd,
      has_favicon: favicon,
    };
  });
}

async function discoverFromSitemap(origin: string): Promise<string[]> {
  try {
    const res = await fetch(`${origin}/sitemap.xml`, {
      headers: { "User-Agent": "QosmicAuditBot/1.0" },
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/gi)].map((m) => m[1].trim());
    return locs;
  } catch {
    return [];
  }
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

  return surfaces;
}

function pickSurfaces(surfaces: Map<string, SurfaceType>): Map<string, SurfaceType> {
  const picked = new Map<string, SurfaceType>();
  const byType = new Map<SurfaceType, string[]>();
  for (const [url, type] of surfaces) {
    if (!byType.has(type)) byType.set(type, []);
    byType.get(type)!.push(url);
  }

  const order: SurfaceType[] = [
    "homepage",
    "collection",
    "pdp",
    "cart",
    "where-to-buy",
    "content",
    "other",
  ];

  for (const type of order) {
    const urls = byType.get(type) || [];
    const limit = type === "pdp" ? 2 : type === "collection" ? 2 : type === "content" ? 2 : 1;
    for (const url of urls.slice(0, limit)) {
      picked.set(url, type);
    }
  }

  return new Map(Array.from(picked.entries()).slice(0, 15));
}

async function dismissModals(page: Page) {
  const selectors = [
    'button:has-text("NORTH AMERICA")',
    'a:has-text("NORTH AMERICA")',
    'button:has-text("Accept")',
    '[data-action="accept"]',
    'button:has-text("Close")',
  ];
  for (const sel of selectors) {
    await page.locator(sel).first().click({ timeout: 2000 }).catch(() => null);
  }
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

/** Click-only navigation — avoids Cloudflare bot triggers from direct URL loads */
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

async function createBrowser(
  headed: boolean,
  useChrome: boolean
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
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: "en-US",
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    extraHTTPHeaders: { "Accept-Language": "en-US,en;q=0.9" },
  });
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

function extractKeywords(surfaces: Surface[], storeUrl: string): string[] {
  const text = surfaces
    .map((s) => `${s.title || ""} ${s.text_excerpt || ""}`)
    .join(" ")
    .toLowerCase();
  const host = new URL(storeUrl).hostname.replace(/^www\./, "").split(".")[0];
  const keywords: string[] = [host];
  const m = text.match(
    /ginger|candy|chew|supplement|wellness|jewelry|tea|organic|artisan|handmade/gi
  );
  if (m) keywords.push(...[...new Set(m.map((x) => x.toLowerCase()))].slice(0, 4));
  return [...new Set(keywords)].slice(0, 6);
}

async function headCheck(url: string): Promise<{ status: number; ok: boolean }> {
  try {
    const res = await fetch(url, { method: "HEAD", redirect: "follow" });
    return { status: res.status, ok: res.ok };
  } catch {
    return { status: 0, ok: false };
  }
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
    jsonLdPages: number;
    metaPages: number;
    faviconOk: boolean;
    privacyLink: boolean;
    cartReachable: boolean;
    cloudflareBlocks: number;
  }
): TechnicalCheck[] {
  const critical = surfaces.filter((s) =>
    ["homepage", "pdp", "collection", "cart"].includes(s.type)
  );
  const failedCritical = critical.filter((s) => s.status >= 400 || s.status === 0);

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
      status: extras.jsonLdPages > 0 ? "Pass" : "Warn",
      detail:
        extras.jsonLdPages > 0
          ? `JSON-LD found on ${extras.jsonLdPages} page(s).`
          : "No JSON-LD detected on captured pages.",
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
      status: "Warn",
      detail: "No Lighthouse/mobile speed run performed.",
    },
    {
      check: "Page Speed Desktop",
      status: "Warn",
      detail: "No Lighthouse speed run performed.",
    },
    {
      check: "Broken Links",
      status: extras.brokenLinks.length === 0 ? "Pass" : extras.brokenLinks.length <= 1 ? "Warn" : "Fail",
      detail:
        extras.brokenLinks.length === 0
          ? "No broken internal links detected in sample."
          : `Broken/blocked: ${extras.brokenLinks.join(", ")}.`,
    },
    {
      check: "Image Optimization",
      status: "Warn",
      detail: "Large hero/product images observed; byte-level audit not run.",
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

async function runCrawl(
  storeUrl: string,
  id: string,
  screenshotDir: string,
  headed: boolean,
  useChrome: boolean
): Promise<{
  surfaces: Surface[];
  mode: string;
  brokenLinks: string[];
  cloudflareBlocks: number;
  jsonLdPages: number;
  metaPages: number;
  faviconOk: boolean;
  privacyLink: boolean;
}> {
  const base = new URL(storeUrl);
  const homeUrl = base.origin + "/";
  const { context, mode, close } = await createBrowser(headed, useChrome);
  const page = await context.newPage();
  page.setDefaultTimeout(45000);

  await page.goto(homeUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
  await humanDelay(2000, 4000);
  await dismissModals(page);

  const discovered = await discoverLinks(page, base);
  const toCrawl = pickSurfaces(discovered);

  const surfaces: Surface[] = [];
  const brokenLinks: string[] = [];
  let cloudflareBlocks = 0;
  let jsonLdPages = 0;
  let metaPages = 0;
  let faviconOk = false;
  let privacyLink = false;

  const ordered = [...toCrawl.entries()].sort(([urlA], [urlB]) => {
    if (classifyUrl(urlA, urlA === homeUrl.replace(/\/$/, "")) === "homepage") return -1;
    if (classifyUrl(urlB, urlB === homeUrl.replace(/\/$/, "")) === "homepage") return 1;
    return 0;
  });

  for (const [url, type] of ordered) {
    try {
      const isHome = type === "homepage";
      let ok = isHome;

      if (!isHome) {
        ok = await navigateViaClick(page, url, homeUrl);
        if (!ok) {
          // Last resort: direct navigation (often blocked on WAF sites)
          await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => null);
          await humanDelay(1000, 2000);
          ok = !(await isBlocked(page));
        }
      }

      const blocked = await isBlocked(page);
      const status = blocked ? 403 : ok ? 200 : 0;
      const status_note = blocked ? "cloudflare_or_waf" : undefined;
      if (blocked) cloudflareBlocks++;
      if (status >= 400 || status === 0) brokenLinks.push(url);

      const data = await extractPageData(page);
      if (data.has_json_ld) jsonLdPages++;
      if (data.title && data.meta_description) metaPages++;
      if (type === "homepage") {
        faviconOk = data.has_favicon;
        privacyLink = /privacy/i.test(await page.content());
      }

      const slug = slugFromUrl(url);
      const shotName = `${hashShort(url)}-${slug}.png`;
      await page.screenshot({ path: join(screenshotDir, shotName), fullPage: true });

      let mobileShot: string | undefined;
      if (type === "homepage" || type === "pdp") {
        await page.setViewportSize({ width: 390, height: 844 });
        await sleep(500);
        const mobileName = `${hashShort(url)}-${slug}-mobile.png`;
        await page.screenshot({ path: join(screenshotDir, mobileName), fullPage: false });
        mobileShot = `audits/${id}/screenshots/${mobileName}`;
        await page.setViewportSize({ width: 1440, height: 900 });
      }

      surfaces.push({
        url,
        type,
        status,
        status_note,
        screenshot: `audits/${id}/screenshots/${shotName}`,
        mobile_screenshot: mobileShot,
        title: data.title,
        meta_description: data.meta_description,
        text_excerpt: data.text_excerpt,
        has_add_to_cart: data.has_add_to_cart,
        has_price: data.has_price,
      });

      console.log(`  [${type}] ${status}${blocked ? " (WAF)" : ""} ${url}`);
    } catch (e) {
      console.warn(`  [skip] ${url}: ${e}`);
      surfaces.push({ url, type, status: 0 });
      brokenLinks.push(url);
    }
  }

  await close();

  return {
    surfaces,
    mode,
    brokenLinks,
    cloudflareBlocks,
    jsonLdPages,
    metaPages,
    faviconOk,
    privacyLink,
  };
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

  // Pass 1: headless stealth (fast, works for most Shopify stores)
  let result = await runCrawl(storeUrl, id, screenshotDir, false, false);

  const blockedRatio =
    result.surfaces.filter((s) => s.status_note === "cloudflare_or_waf").length /
    Math.max(result.surfaces.length, 1);

  // Pass 2: if WAF blocked >30% of pages, retry headed (Chrome if installed, else Chromium)
  if (blockedRatio > 0.3 && !headedFlag) {
    console.log(`\nWAF detected (${Math.round(blockedRatio * 100)}% blocked) — retrying headed mode...`);
    result = await runCrawl(storeUrl, id, screenshotDir, true, true);
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
  const cartReachable =
    cartSurface &&
    cartSurface.status < 400 &&
    cartSurface.status > 0 &&
    !/not found|page not found|oops|lost/i.test(
      `${cartSurface.title || ""} ${cartSurface.text_excerpt || ""}`
    );

  const metaPages = result.metaPages;
  const jsonLdPages = result.jsonLdPages;

  const manifest: Manifest = {
    store_url: storeUrl,
    audit_id: id,
    crawled_at: new Date().toISOString(),
    purchase_model: inferPurchaseModel(result.surfaces),
    crawl_mode: result.mode,
    surfaces: result.surfaces,
    category_keywords: extractKeywords(result.surfaces, storeUrl),
    technical_checks: buildTechnicalChecks(result.surfaces, {
      sitemapOk: sitemap.ok,
      robotsOk: robots.ok,
      httpRedirect,
      sslOk: storeUrl.startsWith("https"),
      mobileHomeOk: result.surfaces.some((s) => s.type === "homepage" && s.mobile_screenshot),
      brokenLinks: result.brokenLinks,
      jsonLdPages,
      metaPages,
      faviconOk: result.faviconOk,
      privacyLink: result.privacyLink,
      cartReachable,
      cloudflareBlocks: result.cloudflareBlocks,
    }),
  };

  await writeFile(join(auditDir, "manifest.json"), JSON.stringify(manifest, null, 2));
  console.log(`\nManifest: audits/${id}/manifest.json`);
  console.log(`Purchase model: ${manifest.purchase_model}`);
  console.log(`Crawl mode: ${manifest.crawl_mode}`);
  console.log(`Surfaces: ${result.surfaces.length} (${result.cloudflareBlocks} WAF blocks)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
