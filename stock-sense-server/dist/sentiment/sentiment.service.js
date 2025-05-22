"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SentimentService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("axios");
let SentimentService = class SentimentService {
    finbertUrl = 'http://localhost:8000/analyze';
    async analyzeSentiment(text, ticker = 'general market') {
        try {
            if (!text?.trim()) {
                throw new common_1.HttpException('Text cannot be empty', common_1.HttpStatus.BAD_REQUEST);
            }
            const cleanText = text.trim().substring(0, 10000);
            const cleanTicker = (ticker || 'general market').trim().toUpperCase();
            console.log(`Analyzing sentiment for ticker: ${cleanTicker}, text length: ${cleanText.length} chars`);
            const startTime = Date.now();
            const response = await axios_1.default.post(this.finbertUrl, {
                text: cleanText,
                ticker: cleanTicker
            }, {
                timeout: 10000,
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });
            const processingTime = Date.now() - startTime;
            if (!response.data?.result) {
                console.error('Empty or invalid response from sentiment service:', response.data);
                throw new common_1.HttpException('Invalid response from sentiment service', common_1.HttpStatus.SERVICE_UNAVAILABLE);
            }
            const result = response.data.result;
            console.log(`Sentiment analysis completed in ${processingTime}ms`);
            const sentimentMatch = typeof result === 'string'
                ? result.match(/sentiment:(positive|negative|neutral)/i)
                : null;
            const scoreMatch = typeof result === 'string'
                ? result.match(/sentiment-score:([\d.]+)/i)
                : null;
            if (sentimentMatch && scoreMatch) {
                const sentiment = sentimentMatch[1].toLowerCase();
                const score = parseFloat(scoreMatch[1]);
                if (isNaN(score) || !['positive', 'negative', 'neutral'].includes(sentiment)) {
                    console.error('Invalid sentiment or score format:', { sentiment, score });
                    throw new common_1.HttpException('Invalid sentiment analysis result format', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
                }
                return {
                    sentiment,
                    sentiment_score: parseFloat(score.toFixed(4))
                };
            }
            console.error('Failed to parse sentiment analysis result:', result);
            throw new common_1.HttpException('Failed to parse sentiment analysis result', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
        catch (error) {
            console.error('Error in analyzeSentiment:', {
                message: error.message,
                url: this.finbertUrl,
                ticker,
                error: error.response?.data || 'No additional error info'
            });
            return this.getNeutralSentiment();
        }
    }
    getNeutralSentiment() {
        return {
            sentiment: 'neutral',
            sentiment_score: 0
        };
    }
};
exports.SentimentService = SentimentService;
exports.SentimentService = SentimentService = __decorate([
    (0, common_1.Injectable)()
], SentimentService);
//# sourceMappingURL=sentiment.service.js.map