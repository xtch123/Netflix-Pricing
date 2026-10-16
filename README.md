# Netflix Pricing Page

An independently hosted revival of [DyAxy/Netflix-Pricing](https://github.com/DyAxy/Netflix-Pricing).

This project retains the original Next.js/NextUI interface for browsing Netflix
subscription prices around the world, converting prices to another currency,
and viewing historical price changes.

## What changed

The original website used `https://api.dy.ax/v1/finance`, which is no longer
required. The client now calls equivalent same-origin endpoints:

| Endpoint | Purpose |
| --- | --- |
| `/api/finance/netflix` | Current Netflix prices by region |
| `/api/finance/rateall` | USD-based exchange rates |
| `/api/finance/netflixchange?per_page=10&page=1` | Historical price changes |

Pricing data is fetched from [tompec/netflix-prices](https://github.com/tompec/netflix-prices)
and refreshed using Next.js caching (12 hours). Price history is computed by
comparing dated snapshots; the displayed date is **when the change was observed**,
not necessarily the date Netflix actually changed its price. Since the upstream
data is independently collected, values may be incomplete or slightly delayed.

Exchange rates are fetched from [ExchangeRate-API's open endpoint](https://www.exchangerate-api.com/docs/free),
also cached for 12 hours. They are estimates for comparison, not bank or card
settlement rates. No personal API key or database is required.

The GitHub contents API is used to discover newly published price snapshots.
If that index is unavailable, the site falls back to a bundled list of historical
snapshot dates (through 2026-09-28).

## Local development

Requires Node.js 22 and npm, or a compatible Bun version.

```bash
npm install
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000).

```bash
npm run build
npm run start
```

## Deploying to Vercel

1. Import this GitHub repository into Vercel.
2. Select the Next.js framework preset.
3. Use the default build command (`next build`) and Node.js 22.x runtime.
4. Deploy. No environment variables are required.

The first request to the price-history page may take longer because it loads
and compares historical snapshots. Subsequent requests use the server cache.

## Credits and licenses

- Original app: [DyAxy/Netflix-Pricing](https://github.com/DyAxy/Netflix-Pricing), MIT license.
- Netflix pricing dataset: [Thomas Petracco / tompec/netflix-prices](https://github.com/tompec/netflix-prices), licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Attribution: [thomas.io](https://www.thomas.io).
- Currency exchange rates: [ExchangeRate-API](https://www.exchangerate-api.com), subject to the provider's terms.
