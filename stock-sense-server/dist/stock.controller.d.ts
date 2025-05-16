export declare class StockController {
    private newsService;
    getNews(category?: string): Promise<{
        error: any;
        news?: undefined;
    } | {
        news: any;
        error?: undefined;
    }>;
    getPortfolioNews(symbols: string): Promise<{
        error: any;
        news?: undefined;
    } | {
        news: any[];
        error?: undefined;
    }>;
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
}
