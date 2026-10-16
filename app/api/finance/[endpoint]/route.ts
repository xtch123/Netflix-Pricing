import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";

// Replacement for the retired api.dy.ax/v1/finance endpoints.
// The response shape is deliberately compatible with the original UI.
const DATA_ROOT = "https://raw.githubusercontent.com/tompec/netflix-prices/main/data";
const DATA_INDEX = "https://api.github.com/repos/tompec/netflix-prices/contents/data?ref=main";
const RATES_URL = "https://open.er-api.com/v6/latest/USD";
const REVALIDATE_SECONDS = 60 * 60 * 12;

type Plan = { name: string; price: number | null };
type Country = {
  country_code: string;
  currency: string;
  plans: Plan[];
};
type GithubFile = { name: string; type: string };
type PriceRow = {
  code: string;
  Currency: string;
  Mobile?: number;
  Basic?: number;
  Standard?: number;
  "Standard with ads"?: number;
  Premium?: number;
};
type ChangeRow = {
  code: string;
  plan: string;
  currency: string;
  old: number;
  new: number;
  updateTime: string;
};

const PLAN_NAMES: Record<string, string> = {
  mobile: "Mobile",
  basic: "Basic",
  standard: "Standard",
  standard_with_ads: "Standard with ads",
  premium: "Premium",
};

// If GitHub's contents API is unavailable/rate-limited, old history is
// still accessible. New snapshots are discovered automatically otherwise.
const KNOWN_SNAPSHOTS = [
  "2023-01-07", "2023-04-19", "2023-10-21", "2023-12-26",
  "2024-03-06", "2024-04-07", "2024-05-04", "2024-07-15",
  "2024-08-19", "2024-09-30", "2024-10-24", "2024-12-15",
  "2025-01-18", "2025-02-18", "2025-03-17", "2025-03-30",
  "2025-05-21", "2025-07-28", "2025-08-27", "2025-09-28",
  "2025-11-04", "2025-11-30", "2025-12-26", "2026-01-23",
  "2026-03-06", "2026-04-09", "2026-05-27", "2026-07-16",
  "2026-08-27", "2026-09-28",
];

async function fetchJSON<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    next: { revalidate: REVALIDATE_SECONDS },
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`Upstream returned HTTP ${response.status}: ${url}`);
  }
  return (await response.json()) as T;
}

async function getPrices(): Promise<PriceRow[]> {
  const countries = await fetchJSON<Country[]>(`${DATA_ROOT}/latest.json`);
  if (!Array.isArray(countries)) throw new Error("Unexpected Netflix data format");

  return countries
    .filter((country) => country.country_code && country.currency)
    .map((country) => {
      const result: PriceRow = {
        code: country.country_code.toUpperCase(),
        Currency: country.currency,
      };
      for (const plan of country.plans || []) {
        const name = PLAN_NAMES[plan.name];
        if (name && typeof plan.price === "number" && Number.isFinite(plan.price)) {
          Object.assign(result, { [name]: plan.price });
        }
      }
      return result;
    })
    .sort((a, b) => a.code.localeCompare(b.code));
}

async function getRates(): Promise<Record<string, number>> {
  const response = await fetchJSON<{
    result: string;
    rates: Record<string, number>;
  }>(RATES_URL);
  if (response.result !== "success" || !response.rates?.USD) {
    throw new Error("Invalid exchange rate response");
  }
  return response.rates;
}

async function listSnapshots(): Promise<string[]> {
  try {
    const files = await fetchJSON<GithubFile[]>(DATA_INDEX);
    if (!Array.isArray(files)) throw new Error("Invalid GitHub index");
    const dates = files
      .filter((item) => item.type === "file" && /^\d{4}-\d{2}-\d{2}\.json$/.test(item.name))
      .map((item) => item.name.slice(0, 10))
      .sort();
    if (dates.length >= 2) return dates;
  } catch (error) {
    console.warn("Using bundled snapshot index:", error);
  }
  return KNOWN_SNAPSHOTS;
}

const getHistory = unstable_cache(
  async (): Promise<ChangeRow[]> => {
    const dates = await listSnapshots();
    const snapshots = await Promise.all(
      dates.map(async (date) => {
        try {
          const data = await fetchJSON<Country[]>(`${DATA_ROOT}/${date}.json`);
          return Array.isArray(data) ? data : null;
        } catch (error) {
          console.warn(`Could not load Netflix snapshot ${date}`, error);
          return null;
        }
      }),
    );

    const changes: ChangeRow[] = [];
    for (let index = dates.length - 1; index > 0; index--) {
      const current = snapshots[index];
      const previous = snapshots[index - 1];
      if (!current || !previous) continue;
      const oldByCountry = new Map(previous.map((item) => [item.country_code, item]));
      for (const country of current) {
        const oldCountry = oldByCountry.get(country.country_code);
        if (!oldCountry || oldCountry.currency !== country.currency) continue;
        const oldPlans = new Map((oldCountry.plans || []).map((plan) => [plan.name, plan.price]));
        for (const plan of country.plans || []) {
          const oldPrice = oldPlans.get(plan.name);
          const newPrice = plan.price;
          if (
            !PLAN_NAMES[plan.name] ||
            typeof oldPrice !== "number" ||
            typeof newPrice !== "number" ||
            !Number.isFinite(oldPrice) ||
            !Number.isFinite(newPrice) ||
            oldPrice === newPrice
          ) continue;
          changes.push({
            code: country.country_code.toUpperCase(),
            plan: PLAN_NAMES[plan.name],
            currency: country.currency,
            old: oldPrice,
            new: newPrice,
            updateTime: dates[index],
          });
        }
      }
    }
    return changes;
  },
  ["netflix-pricing-snapshot-history-v1"],
  { revalidate: REVALIDATE_SECONDS },
);

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { endpoint: string } },
) {
  try {
    switch (params.endpoint) {
      case "netflix":
        return NextResponse.json({ data: await getPrices() });
      case "rateall":
        return NextResponse.json({ data: await getRates() });
      case "netflixchange": {
        const pageParam = Number(request.nextUrl.searchParams.get("page") || 1);
        const pageSizeParam = Number(request.nextUrl.searchParams.get("per_page") || 10);
        const page = Number.isFinite(pageParam) ? Math.max(1, Math.floor(pageParam)) : 1;
        const perPage = Number.isFinite(pageSizeParam)
          ? Math.max(1, Math.min(100, Math.floor(pageSizeParam)))
          : 10;
        const changes = await getHistory();
        return NextResponse.json({
          data: {
            count: changes.length,
            result: changes.slice((page - 1) * perPage, page * perPage),
          },
        });
      }
      default:
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  } catch (error) {
    console.error("Netflix Pricing API error:", error);
    return NextResponse.json(
      { error: "Unable to retrieve data from upstream sources" },
      { status: 502 },
    );
  }
}
