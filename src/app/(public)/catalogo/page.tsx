import { fetchCatalogueData } from "@/lib/catalogue-data";
import { isCatalogueAuthorized } from "@/lib/catalogue-auth";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { CatalogoClient } from "./CatalogoClient";

// ===========================================
// METADATA — NOINDEX
// ===========================================
// This page is for AI agents and internal use, NOT for search engines.
// The robots meta + /robots.txt rule below keep Google/Bing/etc. out.
// (Note: robots meta only prevents indexing — the URL is still
// accessible to anyone who has the access key.)
export const metadata = {
  title: "Catálogo | Sonido Líquido Crew",
  description:
    "Catálogo interno de Sonido Líquido Crew para búsqueda e IA. No indexado.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

// ===========================================
// PAGE
// ===========================================

export default async function CatalogoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // ---- Token gate ----
  // The catalogue is for AI agents + internal use only.
  // Accept the key via EITHER:
  //   - Query param:  /catalogo?key=VALUE
  //   - Header:       x-catalogo-key: VALUE
  // If CATALOGO_ACCESS_KEY env var is unset, the gate is disabled (dev mode).
  const params = await searchParams;
  const queryKey = Array.isArray(params.key)
    ? params.key[0]
    : params.key;

  const h = await headers();
  const headerKey = h.get("x-catalogo-key") || undefined;

  if (!isCatalogueAuthorized({ queryKey, headerKey })) {
    // Return 404 so the existence of the page is hidden from unauthorized callers
    notFound();
  }

  // ---- Fetch all catalogue data (shared with /api/catalogue) ----
  const data = await fetchCatalogueData();

  // The CatalogoClient doesn't need the `meta` field, strip it.
  const { meta: _meta, ...clientData } = data;
  void _meta;

  return <CatalogoClient data={clientData} />;
}
