"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StockController = void 0;
const common_1 = require("@nestjs/common");
const yahoo_finance2_1 = require("yahoo-finance2");
const axios_1 = require("axios");
const sentiment_service_1 = require("./sentiment/sentiment.service");
class FinnhubNewsService {
    sentimentService;
    apiKey = process.env.FINNHUB_API_KEY;
    baseUrl = 'https://finnhub.io/api/v1/news';
    companyNewsUrl = 'https://finnhub.io/api/v1/company-news';
    constructor(sentimentService) {
        this.sentimentService = sentimentService;
    }
    async fetchLatestNews(category = 'general') {
        if (!this.apiKey) {
            throw new Error('Finnhub API key not set');
        }
        try {
            const url = `${this.baseUrl}?category=${category}&token=${this.apiKey}`;
            const response = await axios_1.default.get(url);
            const newsWithSentiment = await Promise.all(response.data.map(async (newsItem) => ({
                ...newsItem,
                sentiment: await this.analyzeNewsSentiment(newsItem)
            })));
            return newsWithSentiment;
        }
        catch (error) {
            return { error: error?.response?.data?.error || 'Failed to fetch news' };
        }
    }
    async analyzeNewsSentiment(newsItem) {
        try {
            const textToAnalyze = [newsItem.headline, newsItem.summary].filter(Boolean).join('. ');
            return await this.sentimentService.analyzeSentiment(textToAnalyze);
        }
        catch (error) {
            console.error('Error in sentiment analysis:', error);
            return {
                sentiment_score: 0,
                sentiment: 'neutral',
            };
        }
    }
    async fetchPortfolioNews(symbols, from, to) {
        if (!this.apiKey) {
            throw new Error('Finnhub API key not set');
        }
        try {
            const fromDate = new Date(from * 1000).toISOString().split('T')[0];
            const toDate = new Date(to * 1000).toISOString().split('T')[0];
            const newsPromises = symbols.map(symbol => {
                const url = `${this.companyNewsUrl}?symbol=${symbol}&from=${fromDate}&to=${toDate}&token=${this.apiKey}`;
                return axios_1.default.get(url);
            });
            const responses = await Promise.all(newsPromises);
            let allNews = responses.flatMap(response => response.data);
            allNews = await Promise.all(allNews.map(async (newsItem) => ({
                ...newsItem,
                sentiment: await this.analyzeNewsSentiment(newsItem)
            })));
            return allNews.sort((a, b) => b.datetime - a.datetime);
        }
        catch (error) {
            console.error('Error in fetchPortfolioNews:', error);
            return { error: error?.response?.data?.error || 'Failed to fetch portfolio news' };
        }
    }
}
let StockController = class StockController {
    sentimentService;
    newsService;
    constructor(sentimentService) {
        this.sentimentService = sentimentService;
        this.newsService = new FinnhubNewsService(sentimentService);
    }
    async getNews(category = 'business') {
        try {
            const newsData = await this.newsService.fetchLatestNews(category);
            if ('error' in newsData) {
                return { error: newsData.error };
            }
            return { news: newsData };
        }
        catch (error) {
            return { error: 'Failed to fetch news data.' };
        }
    }
    async getPortfolioNews(symbols) {
        if (!symbols) {
            return { error: 'Symbols parameter is required.' };
        }
        try {
            const oneWeekAgo = Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60);
            const newsData = await this.newsService.fetchPortfolioNews(symbols.split(','), oneWeekAgo, Math.floor(Date.now() / 1000));
            if ('error' in newsData) {
                return { error: newsData.error };
            }
            return { news: newsData };
        }
        catch (error) {
            return { error: 'Failed to fetch portfolio news data.' };
        }
    }
    async getStockDetails(ticker) {
        if (!ticker) {
            return { error: 'Ticker is required.' };
        }
        try {
            const quote = await yahoo_finance2_1.default.quote(ticker);
            const quoteSummary = await yahoo_finance2_1.default.quoteSummary(ticker, {
                modules: ['price', 'summaryDetail', 'financialData', 'defaultKeyStatistics']
            });
            const summaryDetail = quoteSummary.summaryDetail;
            const financialData = quoteSummary.financialData;
            const defaultKeyStatistics = quoteSummary.defaultKeyStatistics;
            const priceData = quoteSummary.price;
            const summaryProfile = quoteSummary.summaryProfile;
            const price = quote.regularMarketPrice;
            const previousClose = summaryDetail?.regularMarketPreviousClose ?? quote.regularMarketPreviousClose;
            const open = summaryDetail?.regularMarketOpen ?? quote.regularMarketOpen;
            const dayHigh = summaryDetail?.regularMarketDayHigh ?? quote.regularMarketDayHigh;
            const dayLow = summaryDetail?.regularMarketDayLow ?? quote.regularMarketDayLow;
            const volume = summaryDetail?.regularMarketVolume ?? quote.regularMarketVolume;
            const avgVolume = summaryDetail?.averageDailyVolume10Day ?? summaryDetail?.averageVolume;
            const fiftyTwoWeekHigh = summaryDetail?.fiftyTwoWeekHigh;
            const fiftyTwoWeekLow = summaryDetail?.fiftyTwoWeekLow;
            const marketCap = summaryDetail?.marketCap;
            const trailingPE = summaryDetail?.trailingPE;
            const forwardPE = summaryDetail?.forwardPE;
            const priceToBook = defaultKeyStatistics?.priceToBook;
            const dividendYield = summaryDetail?.dividendYield ? summaryDetail.dividendYield * 100 : undefined;
            const dividendRate = summaryDetail?.dividendRate;
            const payoutRatio = summaryDetail?.payoutRatio ? summaryDetail.payoutRatio * 100 : undefined;
            const longName = summaryProfile?.name || priceData?.longName || quote.longName || quote.shortName || ticker;
            const sector = summaryProfile?.sector;
            const industry = summaryProfile?.industry;
            const website = summaryProfile?.website;
            const longBusinessSummary = summaryProfile?.longBusinessSummary;
            const eps = defaultKeyStatistics?.trailingEps;
            const epsForward = defaultKeyStatistics?.forwardEps;
            const beta = summaryDetail?.beta;
            const response = {
                id: ticker.toLowerCase(),
                symbol: quote.symbol,
                name: longName,
                currentPrice: price,
                change: quote.regularMarketChange || 0,
                changePercent: quote.regularMarketChangePercent || 0,
                currency: quote.currency || 'USD',
                regularMarketPreviousClose: previousClose,
                regularMarketOpen: open,
                regularMarketDayHigh: dayHigh,
                regularMarketDayLow: dayLow,
                regularMarketVolume: volume,
                averageDailyVolume3Month: avgVolume,
                fiftyTwoWeekHigh,
                fiftyTwoWeekLow,
                marketCap,
                trailingPE,
                forwardPE,
                priceToBook,
                dividendYield,
                dividendRate,
                payoutRatio,
                trailingAnnualDividendYield: dividendYield ? dividendYield / 100 : undefined,
                trailingAnnualDividendRate: dividendRate,
                sector,
                industry,
                website,
                longBusinessSummary,
                epsTrailingTwelveMonths: eps,
                epsForward,
                beta,
                exchange: priceData?.exchange || quote.exchange,
                exchangeName: priceData?.exchangeName,
                marketState: quote.marketState,
                quoteType: quote.quoteType,
                fiftyDayAverage: summaryDetail?.fiftyDayAverage,
                twoHundredDayAverage: summaryDetail?.twoHundredDayAverage,
                lastUpdated: new Date().toISOString()
            };
            return response;
        }
        catch (error) {
            console.error('Error fetching stock details:', error);
            return {
                error: 'Failed to fetch stock details',
                details: error.message
            };
        }
    }
    async getHistoricalData(symbol, interval = '1d', range = '1y') {
        if (!symbol) {
            return { error: 'Symbol is required' };
        }
        try {
            const validIntervals = ['1d', '1wk', '1mo'];
            if (!validIntervals.includes(interval)) {
                return { error: 'Invalid interval. Must be one of: 1d, 1wk, 1mo' };
            }
            let period1 = '1970-01-01';
            if (range === '1d') {
                period1 = new Date();
                period1.setDate(period1.getDate() - 1);
            }
            else if (range === '5d') {
                period1 = new Date();
                period1.setDate(period1.getDate() - 5);
            }
            else if (range === '1mo') {
                period1 = new Date();
                period1.setMonth(period1.getMonth() - 1);
            }
            else if (range === '3mo') {
                period1 = new Date();
                period1.setMonth(period1.getMonth() - 3);
            }
            else if (range === '6mo') {
                period1 = new Date();
                period1.setMonth(period1.getMonth() - 6);
            }
            else if (range === '1y') {
                period1 = new Date();
                period1.setFullYear(period1.getFullYear() - 1);
            }
            else if (range === '5y') {
                period1 = new Date();
                period1.setFullYear(period1.getFullYear() - 5);
            }
            console.log(`Fetching historical data for ${symbol} with interval ${interval} and period1 ${period1}`);
            const result = await yahoo_finance2_1.default.historical(symbol, {
                period1,
                interval,
                includeAdjustedClose: true,
            });
            console.log(`Received ${result?.length || 0} data points for ${symbol}`);
            if (!result || result.length === 0) {
                console.error('No historical data found for', symbol);
                return { error: 'No historical data found' };
            }
            console.log('First data point:', JSON.stringify(result[0]));
            console.log('Last data point:', JSON.stringify(result[result.length - 1]));
            const historicalData = result.map(item => {
                if (!item.date) {
                    console.error('Item missing date field:', item);
                    return null;
                }
                return {
                    time: item.date.toISOString().split('T')[0],
                    open: item.open || 0,
                    high: item.high || 0,
                    low: item.low || 0,
                    close: item.close || 0,
                    volume: item.volume || 0,
                };
            }).filter(Boolean);
            console.log(`Transformed ${historicalData.length} data points`);
            return { data: historicalData };
        }
        catch (error) {
            console.error('Error fetching historical data:', error);
            return {
                error: 'Failed to fetch historical data',
                details: error.message
            };
        }
    }
    async getStockSuggestions(query) {
        if (!query || query.length < 2) {
            return { suggestions: [] };
        }
        try {
            const results = await yahoo_finance2_1.default.search(query);
            const suggestions = (results.quotes || [])
                .filter(q => 'symbol' in q && 'shortname' in q && typeof q.symbol === 'string' && typeof q.shortname === 'string')
                .slice(0, 10)
                .map(q => ({ symbol: q.symbol, name: q.shortname }));
            return { suggestions };
        }
        catch (error) {
            return { suggestions: [] };
        }
    }
};
exports.StockController = StockController;
__decorate([
    (0, common_1.Get)('/news'),
    __param(0, (0, common_1.Query)('category')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], StockController.prototype, "getNews", null);
__decorate([
    (0, common_1.Get)('/portfolio-news'),
    __param(0, (0, common_1.Query)('symbols')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], StockController.prototype, "getPortfolioNews", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)('ticker')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], StockController.prototype, "getStockDetails", null);
__decorate([
    (0, common_1.Get)('/historical/:symbol'),
    __param(0, (0, common_1.Param)('symbol')),
    __param(1, (0, common_1.Query)('interval')),
    __param(2, (0, common_1.Query)('range')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], StockController.prototype, "getHistoricalData", null);
__decorate([
    (0, common_1.Post)('/suggestions'),
    __param(0, (0, common_1.Body)('query')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], StockController.prototype, "getStockSuggestions", null);
exports.StockController = StockController = __decorate([
    (0, common_1.Controller)('api/stock-details'),
    __param(0, (0, common_1.Inject)('SENTIMENT_SERVICE')),
    __metadata("design:paramtypes", [sentiment_service_1.SentimentService])
], StockController);
//# sourceMappingURL=stock.controller.js.map