import { SentimentService } from './sentiment/sentiment.service';
export declare class StockController {
    private readonly sentimentService;
    private newsService;
    constructor(sentimentService: SentimentService);
    getNews(category?: string): Promise<{
        error: any;
        news?: undefined;
    } | {
        news: any[];
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
        id: string;
        symbol: string;
        name: string;
        currentPrice: number | undefined;
        change: number;
        changePercent: number;
        currency: string;
        regularMarketPreviousClose: number | undefined;
        regularMarketOpen: number | undefined;
        regularMarketDayHigh: number | undefined;
        regularMarketDayLow: number | undefined;
        regularMarketVolume: number | undefined;
        averageDailyVolume3Month: number | undefined;
        fiftyTwoWeekHigh: number | undefined;
        fiftyTwoWeekLow: number | undefined;
        marketCap: number | undefined;
        trailingPE: number | undefined;
        forwardPE: number | undefined;
        priceToBook: number | undefined;
        dividendYield: number | undefined;
        dividendRate: number | undefined;
        payoutRatio: number | undefined;
        trailingAnnualDividendYield: number | undefined;
        trailingAnnualDividendRate: number | undefined;
        sector: string | undefined;
        industry: string | undefined;
        website: string | undefined;
        longBusinessSummary: string | undefined;
        epsTrailingTwelveMonths: number | undefined;
        epsForward: number | undefined;
        beta: number | undefined;
        exchange: string;
        exchangeName: string | undefined;
        marketState: "REGULAR" | "CLOSED" | "PRE" | "PREPRE" | "POST" | "POSTPOST";
        quoteType: "CRYPTOCURRENCY" | "CURRENCY" | "ETF" | "EQUITY" | "FUTURE" | "INDEX" | "MUTUALFUND" | "OPTION";
        fiftyDayAverage: number | undefined;
        twoHundredDayAverage: number | undefined;
        lastUpdated: string;
    } | {
        error: string;
        details?: undefined;
    } | {
        error: string;
        details: any;
    }>;
    getHistoricalData(symbol: string, interval?: '1d' | '1wk' | '1mo', range?: string): Promise<{
        error: string;
        data?: undefined;
        details?: undefined;
    } | {
        data: ({
            time: string;
            open: number;
            high: number;
            low: number;
            close: number;
            volume: number;
        } | null)[];
        error?: undefined;
        details?: undefined;
    } | {
        error: string;
        details: any;
        data?: undefined;
    }>;
    getStockSuggestions(query: string): Promise<{
        suggestions: {
            symbol: any;
            name: any;
        }[];
    }>;
}
