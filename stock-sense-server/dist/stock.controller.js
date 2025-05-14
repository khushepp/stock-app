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
    async getIndices() {
        try {
            const symbols = ['^IXIC', '^GSPC', '^DJI'];
            const [nasdaq, sp500, dow] = await Promise.all(symbols.map(sym => yahoo_finance2_1.default.quote(sym)));
            return {
                nasdaq: {
                    symbol: nasdaq.symbol,
                    name: nasdaq.shortName,
                    price: nasdaq.regularMarketPrice,
                    currency: nasdaq.currency,
                },
                sp500: {
                    symbol: sp500.symbol,
                    name: sp500.shortName,
                    price: sp500.regularMarketPrice,
                    currency: sp500.currency,
                },
                dow: {
                    symbol: dow.symbol,
                    name: dow.shortName,
                    price: dow.regularMarketPrice,
                    currency: dow.currency,
                },
            };
        }
        catch (error) {
            return { error: 'Failed to fetch index data.' };
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
__decorate([
    (0, common_1.Get)('/indices'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], StockController.prototype, "getIndices", null);
exports.StockController = StockController = __decorate([
    (0, common_1.Controller)('api/stock-details')
], StockController);
//# sourceMappingURL=stock.controller.js.map