import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import yahooFinance from 'yahoo-finance2';
import axios from 'axios';

class FinnhubNewsService {
  private apiKey = process.env.FINNHUB_API_KEY;
  private baseUrl = 'https://finnhub.io/api/v1/news';
  private companyNewsUrl = 'https://finnhub.io/api/v1/company-news';

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

  async fetchPortfolioNews(symbols: string[], from: number, to: number) {
    if (!this.apiKey) {
      throw new Error('Finnhub API key not set');
    }
    try {
      // Convert Unix timestamp to YYYY-MM-DD format
      const fromDate = new Date(from * 1000).toISOString().split('T')[0];
      const toDate = new Date(to * 1000).toISOString().split('T')[0];
      
      const newsPromises = symbols.map(symbol => {
        const url = `${this.companyNewsUrl}?symbol=${symbol}&from=${fromDate}&to=${toDate}&token=${this.apiKey}`;
        return axios.get(url);
      });
      
      const responses = await Promise.all(newsPromises);
      const allNews = responses.flatMap(response => response.data);
      // Sort news by datetime in descending order
      return allNews.sort((a, b) => b.datetime - a.datetime);
    } catch (error: any) {
      return { error: error?.response?.data?.error || 'Failed to fetch portfolio news' };
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

  @Get('/portfolio-news')
  async getPortfolioNews(@Query('symbols') symbols: string) {
    if (!symbols) {
      return { error: 'Symbols parameter is required.' };
    }
    
    try {
      const oneWeekAgo = Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60);
      const newsData = await this.newsService.fetchPortfolioNews(
        symbols.split(','),
        oneWeekAgo,
        Math.floor(Date.now() / 1000)
      );
      
      if ('error' in newsData) {
        return { error: newsData.error };
      }
      return { news: newsData };
    } catch (error) {
      return { error: 'Failed to fetch portfolio news data.' };
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
} 