import { Link } from "@nextui-org/react";

export default function Footer() {
    return (
        <div className="text-center text-sm">
            <p>
                Made with ❤ by <Link isExternal href="https://github.com/DyAxy">DyAxy</Link>.
            </p>
            <p className="text-xs text-default-400 mt-2">
                Pricing data by <Link isExternal href="https://www.thomas.io">Thomas Petracco</Link>
                {" "}(<Link isExternal href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</Link>).
                {" "}Exchange rates by <Link isExternal href="https://www.exchangerate-api.com">ExchangeRate-API</Link>.
            </p>
            <p className="text-xs text-default-400">
                Changelog dates are observation dates from snapshots, not necessarily effective dates.
            </p>
        </div>
    );
}
