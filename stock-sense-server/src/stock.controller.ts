import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import yahooFinance from 'yahoo-finance2';
import axios from 'axios';

class FinnhubNewsService {
  private apiKey = process.env.FINNHUB_API_KEY;
  private baseUrl = 'https://finnhub.io/api/v1/news';

  async fetchLatestNews(category: string = 'general') {
    if (!this.apiKey) {
      throw new Error('Finnhub API key not set');
    }
    try {
      const url = `${this.baseUrl}?category=${category}&token=${this.apiKey}`;
      const response = await axios.get(url);
      return response.data;
    } catch (error: any) {
      // Handle rate limit or API errors
      return { error: error?.response?.data?.error || 'Failed to fetch news' };
    }
  }
}

@Controller('api/stock-details')
export class StockController {
  private newsService = new FinnhubNewsService();

  @Get('/news')
  async getNews(@Query('category') category: string = 'business') {
    try {
      const newsData = await this.newsService.fetchLatestNews(category);
      if ('error' in newsData) {
        return { error: newsData.error };
      }
      return { news: newsData };
    } catch (error) {
      return { error: 'Failed to fetch news data.' };
    }
  }

  @Post()
  async getStockDetails(@Body('ticker') ticker: string) {
    if (!ticker) {
      return { error: 'Ticker is required.' };
    }
    try {
      const quote = await yahooFinance.quote(ticker);
      return {
        symbol: quote.symbol,
        name: quote.shortName,
        price: quote.regularMarketPrice,
        currency: quote.currency,
      };
    } catch (error) {
      return { error: 'Invalid ticker symbol or data not found.' };
    }
  }

  @Post('/suggestions')
  async getStockSuggestions(@Body('query') query: string) {
    if (!query || query.length < 2) {
      return { suggestions: [] };
    }
    try {
      const results = await yahooFinance.search(query);
      const suggestions = (results.quotes || [])
        .filter(q => 'symbol' in q && 'shortname' in q && typeof q.symbol === 'string' && typeof q.shortname === 'string')
        .slice(0, 10)
        .map(q => ({ symbol: (q as any).symbol, name: (q as any).shortname }));
      return { suggestions };
    } catch (error) {
      return { suggestions: [] };
    }
  }

  @Get('/indices')
  async getIndices() {
    try {
      const symbols = ['^IXIC', '^GSPC', '^DJI'];
      const [nasdaq, sp500, dow] = await Promise.all(symbols.map(sym => yahooFinance.quote(sym)));
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
    } catch (error) {
      return { error: 'Failed to fetch index data.' };
    }
  }
} 