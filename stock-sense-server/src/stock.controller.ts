import { Controller, Post, Body, Get, Query, Param, Inject } from '@nestjs/common';
import yahooFinance from 'yahoo-finance2';
import axios from 'axios';
import { SentimentService, SentimentResult } from './sentiment/sentiment.service';

class FinnhubNewsService {
  private apiKey = process.env.FINNHUB_API_KEY;
  private baseUrl = 'https://finnhub.io/api/v1/news';
  private companyNewsUrl = 'https://finnhub.io/api/v1/company-news';

  constructor(private readonly sentimentService: SentimentService) {}

  async fetchLatestNews(category: string = 'general') {
    if (!this.apiKey) {
      throw new Error('Finnhub API key not set');
    }
    try {
      const url = `${this.baseUrl}?category=${category}&token=${this.apiKey}`;
      const response = await axios.get(url);
      
      // Add sentiment analysis to each news item
      const newsWithSentiment = await Promise.all(
        response.data.map(async (newsItem: any) => ({
          ...newsItem,
          sentiment: await this.analyzeNewsSentiment(newsItem)
        }))
      );
      
      return newsWithSentiment;
    } catch (error: any) {
      // Handle rate limit or API errors
      return { error: error?.response?.data?.error || 'Failed to fetch news' };
    }
  }

  private async analyzeNewsSentiment(newsItem: any): Promise<SentimentResult> {
    try {
      // Use headline and summary for sentiment analysis
      const textToAnalyze = [newsItem.headline, newsItem.summary].filter(Boolean).join('. ');
      return await this.sentimentService.analyzeSentiment(textToAnalyze);
    } catch (error) {
      console.error('Error in sentiment analysis:', error);
      return {
        sentiment_score: 0,
        sentiment: 'neutral' as const,
      };
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
      let allNews = responses.flatMap(response => response.data);
      
      // Add sentiment analysis to each news item
      allNews = await Promise.all(
        allNews.map(async (newsItem: any) => ({
          ...newsItem,
          sentiment: await this.analyzeNewsSentiment(newsItem)
        }))
      );
      
      // Sort news by datetime in descending order
      return allNews.sort((a, b) => b.datetime - a.datetime);
    } catch (error: any) {
      console.error('Error in fetchPortfolioNews:', error);
      return { error: error?.response?.data?.error || 'Failed to fetch portfolio news' };
    }
  }
}

@Controller('api/stock-details')
export class StockController {
  private newsService: FinnhubNewsService;

  constructor(@Inject('SENTIMENT_SERVICE') private readonly sentimentService: SentimentService) {
    this.newsService = new FinnhubNewsService(sentimentService);
  }

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
      // Fetch quote data with proper typing
      const quote = await yahooFinance.quote(ticker);
      
      // Fetch additional details using yahooFinance.quoteSummary
      const quoteSummary = await yahooFinance.quoteSummary(ticker, {
        modules: ['price', 'summaryDetail', 'financialData', 'defaultKeyStatistics']
      });
      
      // Extract data from quoteSummary if available
      const summaryDetail = quoteSummary.summaryDetail;
      const financialData = quoteSummary.financialData;
      const defaultKeyStatistics = quoteSummary.defaultKeyStatistics;
      const priceData = quoteSummary.price;
      const summaryProfile = quoteSummary.summaryProfile;
      
      // Extract market data with fallbacks
      const price = quote.regularMarketPrice;
      const previousClose = summaryDetail?.regularMarketPreviousClose ?? quote.regularMarketPreviousClose;
      const open = summaryDetail?.regularMarketOpen ?? quote.regularMarketOpen;
      const dayHigh = summaryDetail?.regularMarketDayHigh ?? quote.regularMarketDayHigh;
      const dayLow = summaryDetail?.regularMarketDayLow ?? quote.regularMarketDayLow;
      const volume = summaryDetail?.regularMarketVolume ?? quote.regularMarketVolume;
      const avgVolume = summaryDetail?.averageDailyVolume10Day ?? summaryDetail?.averageVolume;
      
      // Extract 52-week range
      const fiftyTwoWeekHigh = summaryDetail?.fiftyTwoWeekHigh;
      const fiftyTwoWeekLow = summaryDetail?.fiftyTwoWeekLow;
      
      // Extract valuation metrics
      const marketCap = summaryDetail?.marketCap;
      const trailingPE = summaryDetail?.trailingPE;
      const forwardPE = summaryDetail?.forwardPE;
      const priceToBook = defaultKeyStatistics?.priceToBook;
      
      // Extract dividend data
      const dividendYield = summaryDetail?.dividendYield ? summaryDetail.dividendYield * 100 : undefined;
      const dividendRate = summaryDetail?.dividendRate;
      const payoutRatio = summaryDetail?.payoutRatio ? summaryDetail.payoutRatio * 100 : undefined;
      
      // Extract company information
      const longName = summaryProfile?.name || priceData?.longName || quote.longName || quote.shortName || ticker;
      const sector = summaryProfile?.sector;
      const industry = summaryProfile?.industry;
      const website = summaryProfile?.website;
      const longBusinessSummary = summaryProfile?.longBusinessSummary;
      
      // Extract earnings data
      const eps = defaultKeyStatistics?.trailingEps;
      const epsForward = defaultKeyStatistics?.forwardEps;
      
      // Extract beta
      const beta = summaryDetail?.beta;
      
      // Prepare the response object
      const response = {
        // Basic info
        id: ticker.toLowerCase(), // Use ticker as ID if not available
        symbol: quote.symbol,
        name: longName,
        currentPrice: price,
        change: quote.regularMarketChange || 0,
        changePercent: quote.regularMarketChangePercent || 0,
        currency: quote.currency || 'USD',
        
        // Market data
        regularMarketPreviousClose: previousClose,
        regularMarketOpen: open,
        regularMarketDayHigh: dayHigh,
        regularMarketDayLow: dayLow,
        regularMarketVolume: volume,
        averageDailyVolume3Month: avgVolume,
        
        // 52-week range
        fiftyTwoWeekHigh,
        fiftyTwoWeekLow,
        
        // Valuation metrics
        marketCap,
        trailingPE,
        forwardPE,
        priceToBook,
        
        // Dividends
        dividendYield,
        dividendRate,
        payoutRatio,
        trailingAnnualDividendYield: dividendYield ? dividendYield / 100 : undefined,
        trailingAnnualDividendRate: dividendRate,
        
        // Company info
        sector,
        industry,
        website,
        longBusinessSummary,
        
        // Earnings
        epsTrailingTwelveMonths: eps,
        epsForward,
        
        // Risk
        beta,
        
        // Additional fields
        exchange: priceData?.exchange || quote.exchange,
        exchangeName: priceData?.exchangeName,
        marketState: quote.marketState,
        quoteType: quote.quoteType,
        
        // Averages
        fiftyDayAverage: summaryDetail?.fiftyDayAverage,
        twoHundredDayAverage: summaryDetail?.twoHundredDayAverage,
        
        // Timestamp
        lastUpdated: new Date().toISOString()
      };
      
      return response;
      
    } catch (error) {
      console.error('Error fetching stock details:', error);
      return { 
        error: 'Failed to fetch stock details',
        details: error.message 
      };
    }
  }

  @Get('/historical/:symbol')
  async getHistoricalData(
    @Param('symbol') symbol: string,
    @Query('interval') interval: '1d' | '1wk' | '1mo' = '1d',
    @Query('range') range: string = '1y'
  ) {
    if (!symbol) {
      return { error: 'Symbol is required' };
    }

    try {
      // Validate interval
      const validIntervals = ['1d', '1wk', '1mo'];
      if (!validIntervals.includes(interval)) {
        return { error: 'Invalid interval. Must be one of: 1d, 1wk, 1mo' };
      }

      // Calculate date range
      let period1: string | Date = '1970-01-01'; // Default to all available data
      
      if (range === '1d') {
        period1 = new Date();
        period1.setDate(period1.getDate() - 1);
      } else if (range === '5d') {
        period1 = new Date();
        period1.setDate(period1.getDate() - 5);
      } else if (range === '1mo') {
        period1 = new Date();
        period1.setMonth(period1.getMonth() - 1);
      } else if (range === '3mo') {
        period1 = new Date();
        period1.setMonth(period1.getMonth() - 3);
      } else if (range === '6mo') {
        period1 = new Date();
        period1.setMonth(period1.getMonth() - 6);
      } else if (range === '1y') {
        period1 = new Date();
        period1.setFullYear(period1.getFullYear() - 1);
      } else if (range === '5y') {
        period1 = new Date();
        period1.setFullYear(period1.getFullYear() - 5);
      }

      // Fetch historical data
      const result = await yahooFinance.historical(symbol, {
        period1,
        interval,
        includeAdjustedClose: true,
      });

      if (!result || result.length === 0) {
        console.error('No historical data found for', symbol);
        return { error: 'No historical data found' };
      }

      // Transform to TradingView format
      const historicalData = result.map(item => {
        if (!item.date) {
          console.error('Item missing date field:', item);
          return null;
        }
        return {
          time: item.date.toISOString().split('T')[0], // Format as YYYY-MM-DD
          open: item.open || 0,
          high: item.high || 0,
          low: item.low || 0,
          close: item.close || 0,
          volume: item.volume || 0,
        };
      }).filter(Boolean); // Remove any null entries

      return { data: historicalData };
    } catch (error) {
      console.error('Error fetching historical data:', error);
      return { 
        error: 'Failed to fetch historical data',
        details: error.message 
      };
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