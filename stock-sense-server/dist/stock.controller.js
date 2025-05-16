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
class FinnhubNewsService {
    apiKey = process.env.FINNHUB_API_KEY;
    baseUrl = 'https://finnhub.io/api/v1/news';
    companyNewsUrl = 'https://finnhub.io/api/v1/company-news';
    async fetchLatestNews(category = 'general') {
        if (!this.apiKey) {
            throw new Error('Finnhub API key not set');
        }
        try {
            const url = `${this.baseUrl}?category=${category}&token=${this.apiKey}`;
            const response = await axios_1.default.get(url);
            return response.data;
        }
        catch (error) {
            return { error: error?.response?.data?.error || 'Failed to fetch news' };
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
            const allNews = responses.flatMap(response => response.data);
            return allNews.sort((a, b) => b.datetime - a.datetime);
        }
        catch (error) {
            return { error: error?.response?.data?.error || 'Failed to fetch portfolio news' };
        }
    }
}
let StockController = class StockController {
    newsService = new FinnhubNewsService();
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
            return {
                symbol: quote.symbol,
                name: quote.shortName,
                price: quote.regularMarketPrice,
                currency: quote.currency,
            };
        }
        catch (error) {
            return { error: 'Invalid ticker symbol or data not found.' };
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
    (0, common_1.Post)('/suggestions'),
    __param(0, (0, common_1.Body)('query')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], StockController.prototype, "getStockSuggestions", null);
exports.StockController = StockController = __decorate([
    (0, common_1.Controller)('api/stock-details')
], StockController);
//# sourceMappingURL=stock.controller.js.map