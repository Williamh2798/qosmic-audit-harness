/**
 * HTML → PDF via Playwright page.pdf()
 */

import { chromium } from "playwright";
import { dirname } from "node:path";
import { mkdir } from "node:fs/promises";

export async function renderPdfFromHtml(
  htmlPath: string,
  pdfPath: string,
  storeName: string
): Promise<void> {
  await mkdir(dirname(pdfPath), { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(`file://${htmlPath}`, { waitUntil: "networkidle", timeout: 60000 });
  await page.pdf({
    path: pdfPath,
    format: "Letter",
    printBackground: true,
    margin: { top: "0.75in", bottom: "0.75in", left: "0.75in", right: "0.75in" },
    displayHeaderFooter: true,
    headerTemplate: `<span style="font-size:9px;margin-left:0.5in;font-family:sans-serif;color:#666">Qosmic Audit — ${storeName.replace(/"/g, "")}</span>`,
    footerTemplate:
      '<span style="font-size:9px;margin-left:auto;margin-right:0.5in;font-family:sans-serif;color:#666">Page <span class="pageNumber"></span></span>',
  });
  await browser.close();
}
