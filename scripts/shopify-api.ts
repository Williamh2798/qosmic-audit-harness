/**
 * Shopify Storefront JSON endpoints — works on most themes without full page render.
 */

export type ShopifyProductMeta = {
  title: string;
  handle: string;
  price: string | null;
  compare_at_price: string | null;
  available: boolean;
  vendor: string;
  product_type: string;
  tags: string[];
  description_excerpt: string;
  variant_count: number;
  inventory_total: number | null;
};

export async function fetchShopifyProduct(url: string): Promise<ShopifyProductMeta | null> {
  try {
    const base = url.replace(/\/$/, "");
    const res = await fetch(`${base}.js`, {
      headers: { "User-Agent": "QosmicAuditBot/1.0", Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      title?: string;
      handle?: string;
      price?: number;
      compare_at_price?: number;
      available?: boolean;
      vendor?: string;
      type?: string;
      tags?: string[];
      description?: string;
      variants?: { available?: boolean; inventory_quantity?: number }[];
    };
    if (!data.title) return null;

    const variants = data.variants || [];
    const inventory_total = variants.reduce(
      (sum, v) => sum + (v.inventory_quantity ?? 0),
      0
    );

    return {
      title: data.title,
      handle: data.handle || "",
      price: data.price != null ? (data.price / 100).toFixed(2) : null,
      compare_at_price:
        data.compare_at_price != null ? (data.compare_at_price / 100).toFixed(2) : null,
      available: data.available ?? true,
      vendor: data.vendor || "",
      product_type: data.type || "",
      tags: data.tags || [],
      description_excerpt: (data.description || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 600),
      variant_count: variants.length,
      inventory_total: variants.some((v) => v.inventory_quantity != null) ? inventory_total : null,
    };
  } catch {
    return null;
  }
}

export async function fetchShopifyProductsIndex(origin: string): Promise<string[]> {
  try {
    const res = await fetch(`${origin.replace(/\/$/, "")}/products.json?limit=50`, {
      headers: { "User-Agent": "QosmicAuditBot/1.0" },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { products?: { handle: string }[] };
    return (data.products || []).map((p) => `${origin.replace(/\/$/, "")}/products/${p.handle}`);
  } catch {
    return [];
  }
}

export async function fetchShopifyCollectionsIndex(origin: string): Promise<string[]> {
  try {
    const res = await fetch(`${origin.replace(/\/$/, "")}/collections.json?limit=50`, {
      headers: { "User-Agent": "QosmicAuditBot/1.0" },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { collections?: { handle: string }[] };
    return (data.collections || []).map(
      (c) => `${origin.replace(/\/$/, "")}/collections/${c.handle}`
    );
  } catch {
    return [];
  }
}

export async function fetchShopifyPagesIndex(origin: string): Promise<string[]> {
  try {
    const res = await fetch(`${origin.replace(/\/$/, "")}/pages.json?limit=50`, {
      headers: { "User-Agent": "QosmicAuditBot/1.0" },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { pages?: { handle: string }[] };
    return (data.pages || []).map((p) => `${origin.replace(/\/$/, "")}/pages/${p.handle}`);
  } catch {
    return [];
  }
}
