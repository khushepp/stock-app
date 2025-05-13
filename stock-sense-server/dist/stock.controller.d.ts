export declare class StockController {
    getStockDetails(ticker: string): Promise<{
        error: string;
        symbol?: undefined;
        name?: undefined;
        price?: undefined;
        currency?: undefined;
    } | {
        symbol: string;
        name: string | undefined;
        price: number | undefined;
        currency: string | undefined;
        error?: undefined;
    }>;
    getStockSuggestions(query: string): Promise<{
        suggestions: {
            symbol: any;
            name: any;
        }[];
    }>;
    getIndices(): Promise<{
        nasdaq: {
            symbol: string;
            name: string | undefined;
            price: number | undefined;
            currency: string | undefined;
        };
        sp500: {
            symbol: string;
            name: string | undefined;
            price: number | undefined;
            currency: string | undefined;
        };
        dow: {
            symbol: string;
            name: string | undefined;
            price: number | undefined;
            currency: string | undefined;
        };
        error?: undefined;
    } | {
        error: string;
        nasdaq?: undefined;
        sp500?: undefined;
        dow?: undefined;
    }>;
}
