export interface Stock {
  id: string;
  symbol: string;
  name: string;
  currentPrice: number;
  change: number;
  changePercent: number;
  
  // Additional details from Yahoo Finance API
  currency?: string;
  exchange?: string;
  exchangeName?: string;
  marketState?: string;
  quoteType?: string;
  
  // Market data
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  regularMarketPreviousClose?: number;
  regularMarketOpen?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  regularMarketVolume?: number;
  averageDailyVolume3Month?: number;
  marketCap?: number;
  
  // 52-week range
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  
  // Averages
  fiftyDayAverage?: number;
  twoHundredDayAverage?: number;
  
  // Valuation metrics
  trailingPE?: number;
  forwardPE?: number;
  priceToBook?: number;
  beta?: number;  // Stock's beta value
  
  // Dividends
  dividendRate?: number;
  dividendYield?: number;
  payoutRatio?: number;
  trailingAnnualDividendRate?: number;
  trailingAnnualDividendYield?: number;
  
  // Earnings
  epsTrailingTwelveMonths?: number;
  epsForward?: number;
  earningsTimestamp?: number;
  earningsTimestampStart?: number;
  earningsTimestampEnd?: number;
  
  // Company info
  longName?: string;
  shortName?: string;
  website?: string;
  industry?: string;
  sector?: string;
  longBusinessSummary?: string;
  
  // Additional info
  sharesOutstanding?: number;
  bookValue?: number;
  priceToSalesTrailing12Months?: number;
  
  // Technical indicators
  fiftyDayAverageChange?: number;
  fiftyDayAverageChangePercent?: number;
  twoHundredDayAverageChange?: number;
  twoHundredDayAverageChangePercent?: number;
  
  // Volume data
  averageVolume?: number;
  averageVolume10days?: number;
  
  // Other
  priceHint?: number;
  trailingPegRatio?: number;
  
  // Timestamps
  firstTradeDateEpochUtc?: number;
  timeZoneFullName?: string;
  timeZoneShortName?: string;
  gmtOffSetMilliseconds?: number;
  
  // Additional data points
  bid?: number;
  ask?: number;
  bidSize?: number;
  askSize?: number;
  lastMarket?: string;
  
  // Timestamps
  lastUpdated?: string;
  
  // Error handling
  error?: string;
}
