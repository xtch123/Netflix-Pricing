import {
    Card,
    CardBody,
    CardFooter,
    CardHeader,
    Input,
    Spacer,
    Spinner,
    Table,
    TableBody,
    TableCell,
    TableRow
} from "@nextui-org/react";
import { useCallback, useMemo, useState } from "react";
import useSWR from "swr";
import CardPage from "@/app/components/CardPage";
import CardCurrency from "@/app/components/CardCurrency";

const fetcher = (...args: Parameters<typeof fetch>) =>
    fetch(...args).then((res) => {
        if (!res.ok) throw new Error(`Data API returned HTTP ${res.status}`);
        return res.json().then((json) => json.data);
    });

const url = "/api/finance";
const ROWS_PER_PAGE = 10;
type SortDirection = "ascending" | "descending";

interface Prop {
    path: string;
    usePage: boolean;
    tableHeader: React.ReactNode;
    renderCell: Function;
}

export default function CurrencyDataTable({ path, usePage, tableHeader, renderCell }: Prop) {
    const [currency, setCurrency] = useState("USD");
    const [page, setPage] = useState(1);
    const [filterValue, setFilterValue] = useState("");
    const [sortDescriptor, setSortDescriptor] = useState<{
        column: string;
        direction: SortDirection;
    }>({ column: "Premium", direction: "ascending" });

    const { data: rate, isLoading: isRateLoading, error: rateError } = useSWR(
        `${url}/rateall?apiKey=1`, fetcher
    );
    const { data, isLoading, error: dataError } = useSWR(
        `${url}/${usePage ? path + page : path}`, fetcher
    );

    // Only the main pricing page supports client-side filtering and sorting.
    // The changelog remains ordered newest-first by its server API.
    const filteredRows = useMemo(() => {
        if (usePage || !Array.isArray(data)) return [];
        if (!filterValue.trim()) return data;
        return data.filter((item: any) =>
            String(item.code || "").toLowerCase().includes(filterValue.trim().toLowerCase())
        );
    }, [data, filterValue, usePage]);

    const sortedRows = useMemo(() => {
        if (usePage) return [];
        const result = [...filteredRows];
        const { column, direction } = sortDescriptor;
        const factor = direction === "ascending" ? 1 : -1;

        const convertedPrice = (item: any): number | null => {
            const localPrice = item[column];
            const sourceCurrency = item.Currency;
            if (typeof localPrice !== "number" || !Number.isFinite(localPrice)) return null;
            if (!rate || typeof rate[currency] !== "number" ||
                typeof rate[sourceCurrency] !== "number" ||
                rate[sourceCurrency] === 0) return null;
            return localPrice * rate[currency] / rate[sourceCurrency];
        };

        result.sort((a: any, b: any) => {
            if (column === "code") {
                return factor * String(a.code).localeCompare(String(b.code));
            }
            const aPrice = convertedPrice(a);
            const bPrice = convertedPrice(b);
            // Unavailable plans and unknown conversion rates always go last.
            if (aPrice === null && bPrice === null) {
                return String(a.code).localeCompare(String(b.code));
            }
            if (aPrice === null) return 1;
            if (bPrice === null) return -1;
            const delta = (aPrice - bPrice) * factor;
            return delta || String(a.code).localeCompare(String(b.code));
        });
        return result;
    }, [filteredRows, rate, currency, sortDescriptor, usePage]);

    const pages = Math.ceil(
        (usePage ? (data?.count ?? 0) : sortedRows.length) / ROWS_PER_PAGE
    );

    const items = useMemo(() => {
        const start = (page - 1) * ROWS_PER_PAGE;
        const originalRows = usePage
            ? (Array.isArray(data?.result) ? data.result : [])
            : sortedRows.slice(start, start + ROWS_PER_PAGE);

        return originalRows.map((item: any, index: number) => {
            const newItem: { [key: string]: any } = {
                ...item,
                key: usePage ? `${page}-${index}` : String(item.code),
            };
            Object.keys(item).forEach((key) => {
                if (typeof item[key] !== "number") return;
                const fromCurrency = item.Currency || item.currency;
                if (rate && typeof rate[currency] === "number" &&
                    typeof rate[fromCurrency] === "number" && rate[fromCurrency] !== 0) {
                    newItem[`${key}_converted`] =
                        (item[key] * rate[currency] / rate[fromCurrency]).toFixed(2);
                }
            });
            return newItem;
        });
    }, [data, sortedRows, rate, currency, page, usePage]);

    const onSearchChange = useCallback((value?: string) => {
        setFilterValue(value || "");
        setPage(1);
    }, []);

    const loadingState = isLoading || isRateLoading ? "loading" : "idle";
    const hasError = Boolean(dataError || rateError);

    return (
        <Card style={{ maxWidth: "800px", margin: "0 auto" }}>
            <CardHeader className="justify-between gap-3 flex-wrap">
                {!usePage && (
                    <Input
                        isDisabled={!data}
                        label="ISO 3166-2 Code"
                        isClearable
                        size="sm"
                        className="w-full sm:max-w-[30%]"
                        placeholder="Search by country code..."
                        variant="bordered"
                        value={filterValue}
                        onClear={() => onSearchChange("")}
                        onValueChange={onSearchChange}
                    />
                )}
                {!usePage && (
                    <span className="text-xs text-default-400">
                        {sortDescriptor.column}:
                        {sortDescriptor.direction === "ascending" ? " low → high" : " high → low"}
                        {" "}({currency})
                    </span>
                )}
                <CardCurrency
                    rate={rate}
                    currency={currency}
                    onSelectionChange={(value) => {
                        setCurrency(value.toString());
                        setPage(1);
                    }}
                />
            </CardHeader>
            <CardBody>
                <Table
                    isStriped
                    aria-label={usePage ? "Netflix price changes" : "Netflix prices by country"}
                    sortDescriptor={usePage ? undefined : sortDescriptor}
                    onSortChange={usePage ? undefined : (nextSort) => {
                        setSortDescriptor({
                            column: String(nextSort.column),
                            direction: nextSort.direction || "ascending",
                        });
                        setPage(1);
                    }}
                >
                    {tableHeader}
                    <TableBody
                        items={items}
                        loadingContent={<Spinner />}
                        loadingState={loadingState}
                        emptyContent={hasError ? "Failed to load pricing data." : "No data to display."}
                    >
                        {(item: any) => (
                            <TableRow key={item.key}>
                                {(columnKey) => (
                                    <TableCell>
                                        {renderCell(item, columnKey, rate, currency)}
                                    </TableCell>
                                )}
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardBody>
            <CardFooter className="justify-center">
                <CardPage
                    pages={pages}
                    page={page}
                    onPageChange={setPage}
                />
            </CardFooter>
            <Spacer y={4} />
        </Card>
    );
}
