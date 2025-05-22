import React, { useEffect, useState, useCallback } from 'react';
import { useStockContext } from '../context/StockContext';
import { Stock } from '../types/stock';
import { Modal, TouchableOpacity, View, Text, ScrollView, StyleSheet, ActivityIndicator, Linking, Image, FlatList } from 'react-native';
import { supabase } from '../App';
import TradingViewChart, { CandleData } from './TradingViewChart';

type TimeRange = '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y' | '5y';

// Helper function to format numbers with commas and optional decimal places
const formatNumber = (num?: number | null, decimals: number = 2): string => {
  if (num === undefined || num === null || isNaN(num)) return 'N/A';
  try {
    return num.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals
    });
  } catch (e) {
    return 'N/A';
  }
};

// Helper function to format currency
const formatCurrency = (value?: number | null, currency: string = 'USD'): string => {
  if (value === undefined || value === null || isNaN(value)) return 'N/A';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  } catch (e) {
    return `$${value.toFixed(2)}`; // Fallback to basic formatting
  }
};

// Helper function to format percentage
const formatPercent = (value?: number, decimals: number = 0): string => {
  if (value === undefined || value === null) return 'N/A';
  // Convert decimal to percentage and round to nearest integer (e.g., 0.05 -> 5%)
  const percentageValue = Math.abs(value * 100);
  return `${value > 0 ? '+' : ''}${percentageValue.toFixed(decimals)}%`;
};

// Helper function to format sentiment text
const formatSentiment = (sentiment: any) => {
  if (!sentiment) return null;
  
  const score = Math.abs(sentiment.sentiment_score * 100).toFixed(0);
  return `${sentiment.sentiment}-${score}%`;
};

// Helper function to get sentiment color
const getSentimentColor = (sentiment: string) => {
  switch (sentiment.toLowerCase()) {
    case 'positive': return '#4caf50';
    case 'negative': return '#f44336';
    case 'neutral': return '#757575';
    default: return '#757575';
  }
};

// Helper function to format large numbers (thousands, millions, billions)
const formatBigNumber = (num?: number, decimals: number = 2): string => {
  if (num === undefined || num === null) return 'N/A';
  
  if (num >= 1000000000) {
    return `${(num / 1000000000).toFixed(decimals)}B`;
  } else if (num >= 1000000) {
    return `${(num / 1000000).toFixed(decimals)}M`;
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(decimals)}K`;
  }
  return num.toFixed(decimals);
};

// Helper function to format date from timestamp
const formatDate = (timestamp?: number): string => {
  if (!timestamp) return 'N/A';
  return new Date(timestamp * 1000).toLocaleDateString();
};

// Helper component for detail rows
const DetailRow: React.FC<{ label: string; value: string | number | undefined, valueColor?: string }> = ({ 
  label, 
  value, 
  valueColor = '#000' 
}) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={[styles.detailValue, { color: valueColor }]}>{value}</Text>
  </View>
);

// Helper component for section headers
const SectionHeader: React.FC<{ title: string }> = ({ title }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionHeaderText}>{title}</Text>
  </View>
);

const StockDetailsOverlay: React.FC = () => {
  const { selectedStock: initialStock, isOpen, hideStockDetails } = useStockContext();
  const [stock, setStock] = useState<Stock | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartData, setChartData] = useState<CandleData[]>([]);
  const [isLoadingChart, setIsLoadingChart] = useState(true);
  const [chartError, setChartError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('1y');
  const [allNews, setAllNews] = useState<any[]>([]);
  const [visibleNewsCount, setVisibleNewsCount] = useState(5);
  const [isLoadingNews, setIsLoadingNews] = useState(false);
  const [newsError, setNewsError] = useState<string | null>(null);
  const [loadingSentiment, setLoadingSentiment] = useState<Record<string, boolean>>({});
  const [sentimentErrors, setSentimentErrors] = useState<Record<string, string>>({});
  
  // Derived state for currently visible news
  const visibleNews = allNews.slice(0, visibleNewsCount);

  const analyzeNewsSentiment = useCallback(async (newsItem: any, index: number) => {
    const newsId = newsItem.id || `news-${index}`;
    
    // Skip if already has sentiment or currently analyzing
    if (newsItem.sentiment || loadingSentiment[newsId]) {
      return null;
    }
    
    try {
      setLoadingSentiment(prev => ({ ...prev, [newsId]: true }));
      setSentimentErrors(prev => ({ ...prev, [newsId]: '' }));
      
      const text = [newsItem.headline, newsItem.summary].filter(Boolean).join('. ');
      const ticker = newsItem.symbol || initialStock?.symbol || '';
      
      const response = await fetch(`http://10.0.2.2:3000/api/stock-details/analyze-sentiment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, ticker })
      });
      
      if (!response.ok) {
        throw new Error('Failed to analyze sentiment');
      }
      
      const result = await response.json();
      
      // Update the news item with sentiment in allNews
      setAllNews(prevNews => 
        prevNews.map(item => 
          (item.id === newsItem.id || item === newsItem) ? { ...item, sentiment: result } : item
        )
      );
      
      return result;
    } catch (err: any) {
      console.error('Error analyzing sentiment:', err);
      setSentimentErrors(prev => ({
        ...prev, 
        [newsId]: 'Failed to analyze sentiment. ' + (err.message || '')
      }));
      return null;
    } finally {
      setLoadingSentiment(prev => ({ ...prev, [newsId]: false }));
    }
  }, [initialStock]);

  // Automatically analyze sentiment for visible news articles when they change
  useEffect(() => {
    if (visibleNews.length > 0) {
      visibleNews.forEach((item, index) => {
        const newsId = item.id || `news-${index}`;
        // Only analyze if no sentiment exists and not currently loading
        if (!item.sentiment && !loadingSentiment[newsId]) {
          analyzeNewsSentiment(item, index);
        }
      });
    }
  }, [visibleNews, loadingSentiment, analyzeNewsSentiment]);

  const fetchNews = useCallback(async (symbol: string) => {
    try {
      setIsLoadingNews(true);
      setNewsError(null);
      
      const url = `http://10.0.2.2:3000/api/stock-details/portfolio-news?symbols=${encodeURIComponent(symbol)}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('News API error response:', errorText);
        throw new Error(`Failed to fetch news: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        console.error('News API returned error:', data.error);
        throw new Error(data.error);
      }
      
      // Get all news items
      const newsItems = Array.isArray(data.news) ? data.news : 
                      Array.isArray(data) ? data : [];
      
      setAllNews(newsItems);
      
      if (newsItems.length === 0) {
        console.log('No news items found for symbol:', symbol);
      }
    } catch (err: any) {
      console.error('Error fetching news:', err);
      setNewsError('Failed to load news. ' + (err.message || ''));
    } finally {
      setIsLoadingNews(false);
    }
  }, []);
  
  // Handle loading more news
  const loadMoreNews = () => {
    const newCount = visibleNewsCount + 5;
    setVisibleNewsCount(newCount);
    
    // Analyze sentiment for the newly visible items
    const newlyVisibleNews = allNews.slice(visibleNewsCount, newCount);
    newlyVisibleNews.forEach((item, index) => {
      const newsId = item.id || `news-${visibleNewsCount + index}`;
      if (!item.sentiment && !loadingSentiment[newsId]) {
        analyzeNewsSentiment(item, visibleNewsCount + index);
      }
    });
  };

  // Reset visible news count when overlay is opened
  useEffect(() => {
    if (isOpen && initialStock) {
      setVisibleNewsCount(5);
    }
  }, [isOpen, initialStock]);

  useEffect(() => {
    const fetchStockDetails = async () => {
      if (!initialStock || !isOpen) return;
      
      setIsLoading(true);
      setError(null);

      try {
        const baseUrl = 'http://10.0.2.2:3000';
        const url = `${baseUrl}/api/stock-details`;
        
        console.log('Fetching stock details from:', url);
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ticker: initialStock.symbol })
        });

        const responseData = await response.json();
        console.log('Stock details response:', responseData);

        if (!response.ok) {
          throw new Error(responseData.message || `HTTP error! status: ${response.status}`);
        }

        if (responseData.error) {
          throw new Error(responseData.error);
        }

        setStock(responseData);
      } catch (err: any) {
        console.error('Error fetching stock details:', err);
        setError(err?.message || 'Failed to load stock details');
      } finally {
        setIsLoading(false);
      }

      fetchChartData(initialStock.symbol, timeRange);
      fetchNews(initialStock.symbol);
    };

    fetchStockDetails();
  }, [initialStock, isOpen, timeRange, fetchNews]);

  const fetchChartData = async (symbol: string, range: TimeRange) => {
    if (!symbol) return;

    setIsLoadingChart(true);
    setChartError(null);

    try {
      let interval: '1d' | '1wk' | '1mo' = '1d';
      if (range === '1y' || range === '5y') {
        interval = '1wk';
      } else if (range === '1mo' || range === '3mo' || range === '6mo') {
        interval = '1d';
      }

      console.log(`Fetching chart data for ${symbol}, interval: ${interval}, range: ${range}`);
      
      // Update this URL to match your NestJS server's URL
      // For development with Android emulator, use 10.0.2.2 to access localhost
      const baseUrl = 'http://10.0.2.2:3000'; // Default NestJS port is 3000
      const url = `${baseUrl}/api/stock-details/historical/${symbol}?interval=${interval}&range=${range}`;
      
      console.log('Fetching from URL:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.message || `HTTP error! status: ${response.status}`);
      }

      // The data should be in the data property of the response
      if (!responseData.data || !Array.isArray(responseData.data)) {
        console.error('Invalid data format:', responseData);
        throw new Error('Invalid data format received');
      }

      setChartData(responseData.data);
    } catch (err: any) {
      console.error('Error fetching chart data:', err);
      setChartError(err?.message || 'Failed to load chart data');
    } finally {
      setIsLoadingChart(false);
    }
  };

  if (!initialStock || !isOpen) return null;

  const renderLoading = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#2e7d32" />
      <Text style={styles.loadingText}>Loading stock details...</Text>
    </View>
  );

  const renderError = () => (
    <View style={styles.errorContainer}>
      <Text style={styles.errorTextLarge}>Error: {error}</Text>
      <TouchableOpacity 
        style={styles.retryButton}
        onPress={() => {
          setError(null);
          setIsLoading(true);
        }}
      >
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  const renderContent = () => {
    if (isLoading) return renderLoading();
    if (error) return renderError();
    if (!stock) return null;

    const isPositive = (stock.change || 0) >= 0;
    const changeColor = isPositive ? '#2e7d32' : '#c62828';
    const changeIcon = isPositive ? '▲' : '▼';

    return (
      <ScrollView style={styles.content}>
        {/* Header with price and change */}
        <View style={styles.priceContainer}>
          <View style={styles.priceRow}>
            <Text style={styles.price}>
              {formatCurrency(stock.currentPrice || stock.regularMarketPrice, stock.currency)}
            </Text>
            <Text style={[styles.priceChange, { color: changeColor }]}>
              {changeIcon} {formatNumber(stock.change || stock.regularMarketChange, 2)} 
              ({formatNumber(stock.changePercent || stock.regularMarketChangePercent, 2)}%)
            </Text>
          </View>
          <Text style={styles.exchangeInfo}>
            {stock.exchangeName || stock.exchange} • {stock.currency}
            {stock.marketState && ` • ${stock.marketState}`}
          </Text>
        </View>

        {/* Time Range Selector */}
        <View style={styles.timeRangeContainer}>
          {(['1d', '5d', '1mo', '3mo', '6mo', '1y', '5y'] as TimeRange[]).map((range) => (
            <TouchableOpacity
              key={range}
              style={[
                styles.timeRangeButton,
                timeRange === range && styles.timeRangeButtonActive
              ]}
              onPress={() => setTimeRange(range)}
            >
              <Text style={[
                styles.timeRangeText,
                timeRange === range && styles.timeRangeTextActive
              ]}>
                {range.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Chart Section */}
        <View style={styles.chartContainer}>
          <TradingViewChart 
            symbol={stock.symbol}
            data={chartData}
            isLoading={isLoadingChart}
            error={chartError}
          />
        </View>

        {/* Key Stats */}
        <SectionHeader title="Key Statistics" />
        <View style={styles.sectionContainer}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Market Cap</Text>
              <Text style={styles.statValue}>
                {formatCurrency(stock.marketCap, stock.currency)}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>52-Week Range</Text>
              <Text style={styles.statValue}>
                {formatCurrency(stock.fiftyTwoWeekLow)} - {formatCurrency(stock.fiftyTwoWeekHigh)}
              </Text>
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Avg Volume</Text>
              <Text style={styles.statValue}>
                {formatBigNumber(stock.averageDailyVolume3Month || stock.averageVolume)}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Volume</Text>
              <Text style={styles.statValue}>
                {formatBigNumber(stock.regularMarketVolume)}
              </Text>
            </View>
          </View>
        </View>

        {/* Valuation Metrics */}
        <SectionHeader title="Valuation" />
        <View style={styles.sectionContainer}>
          <DetailRow label="Market Cap" value={formatCurrency(stock.marketCap, stock.currency)} />
          <DetailRow label="Volume" value={formatNumber(stock.regularMarketVolume)} />
          <DetailRow label="Avg. Volume" value={formatNumber(stock.averageDailyVolume3Month)} />
          <DetailRow label="Open" value={formatCurrency(stock.regularMarketOpen, stock.currency)} />
          <DetailRow label="Previous Close" value={formatCurrency(stock.regularMarketPreviousClose, stock.currency)} />
          <DetailRow 
            label="Day's Range" 
            value={`${formatCurrency(stock.regularMarketDayLow, stock.currency)} - ${formatCurrency(stock.regularMarketDayHigh, stock.currency)}`} 
          />
          <DetailRow 
            label="52-Week Range" 
            value={`${formatCurrency(stock.fiftyTwoWeekLow, stock.currency)} - ${formatCurrency(stock.fiftyTwoWeekHigh, stock.currency)}`} 
          />
        </View>

        {/* Dividends & Yield */}
        {(stock.dividendYield || stock.trailingAnnualDividendYield) && (
          <>
            <SectionHeader title="Dividends & Yield" />
            <View style={styles.sectionContainer}>
              <DetailRow label="P/E Ratio (TTM)" value={formatNumber(stock.trailingPE, 2)} />
              <DetailRow label="Forward P/E" value={formatNumber(stock.forwardPE, 2)} />
              <DetailRow label="EPS (TTM)" value={formatNumber(stock.epsTrailingTwelveMonths, 2)} />
              <DetailRow label="Forward EPS" value={formatNumber(stock.epsForward, 2)} />
              <DetailRow label="Dividend Rate" value={formatCurrency(stock.dividendRate, stock.currency)} />
              <DetailRow label="Dividend Yield" value={formatPercent((stock.dividendYield || 0) * 100, 2)} />
              <DetailRow label="Payout Ratio" value={formatPercent((stock.payoutRatio || 0) * 100, 2)} />
              <DetailRow label="Beta" value={stock.beta ? formatNumber(stock.beta, 2) : 'N/A'} />
            </View>
          </>
        )}

        {/* Company Info */}
        {(stock.longBusinessSummary || stock.industry || stock.sector) && (
          <>
            <SectionHeader title="Company Information" />
            <View style={styles.sectionContainer}>
              {stock.industry && (
                <DetailRow label="Industry" value={stock.industry} />
              )}
              {stock.sector && (
                <DetailRow label="Sector" value={stock.sector} />
              )}
              {stock.website && (
                <TouchableOpacity 
                  onPress={() => Linking.openURL(stock.website!.startsWith('http') ? stock.website! : `https://${stock.website}`)}
                  style={styles.linkRow}
                >
                  <Text style={styles.linkText}>Visit Website</Text>
                </TouchableOpacity>
              )}
              {stock.longBusinessSummary && (
                <View style={styles.summaryContainer}>
                  <Text style={styles.summaryText} numberOfLines={5}>
                    {stock.longBusinessSummary}
                  </Text>
                </View>
              )}
            </View>
          </>
        )}

        {/* Latest News */}
        <SectionHeader title="Latest News" />
        <View style={styles.sectionContainer}>
          {isLoadingNews && allNews.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#2e7d32" />
              <Text style={styles.loadingText}>Loading news...</Text>
            </View>
          ) : newsError ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{newsError}</Text>
            </View>
          ) : allNews.length === 0 ? (
            <Text style={styles.noNewsText}>No news available</Text>
          ) : (
            <FlatList
              data={visibleNews}
              keyExtractor={(item, index) => item.id ? item.id.toString() : `news-${index}`}
              scrollEnabled={false}
              renderItem={({ item, index }) => {
                const newsDate = item.datetime ? new Date(item.datetime * 1000) : null;
                return (
                  <TouchableOpacity 
                    style={styles.newsItem}
                    onPress={() => item.url ? Linking.openURL(item.url) : null}
                  >
                    <View style={styles.newsContent}>
                      <Text style={styles.newsTitle} numberOfLines={2}>
                        {item.headline || 'No title'}
                      </Text>
                      <View style={styles.newsMeta}>
                        <Text style={styles.newsSource} numberOfLines={1}>
                          {item.source || 'Unknown source'}
                          {newsDate && ` • ${newsDate.toLocaleDateString()}`}
                        </Text>
                        <View style={styles.sentimentContainer}>
                          {loadingSentiment[item.id || `news-${index}`] ? (
                            <ActivityIndicator size="small" color="#2e7d32" />
                          ) : item.sentiment ? (
                            <Text style={[
                              styles.sentimentText,
                              { color: getSentimentColor(item.sentiment.sentiment) }
                            ]}>
                              {formatSentiment(item.sentiment)}
                            </Text>
                          ) : (
                            <TouchableOpacity 
                              onPress={() => analyzeNewsSentiment(item, index)}
                              style={styles.analyzeButton}
                            >
                              <Text style={styles.analyzeButtonText}>Analyze</Text>
                            </TouchableOpacity>
                          )}
                          {sentimentErrors[item.id || `news-${index}`] && (
                            <Text style={styles.errorText}>
                              {sentimentErrors[item.id || `news-${index}`]}
                            </Text>
                          )}
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              }}
              ItemSeparatorComponent={() => <View style={styles.newsDivider} />}
              ListFooterComponent={
                allNews.length > visibleNewsCount && allNews.length > 0 ? (
                  <TouchableOpacity 
                    style={styles.loadMoreButton}
                    onPress={loadMoreNews}
                    disabled={isLoadingNews}
                  >
                    <Text style={styles.loadMoreButtonText}>
                      {isLoadingNews ? 'Loading...' : 'Load More'}
                    </Text>
                  </TouchableOpacity>
                ) : null
              }
            />
          )}
        </View>
      </ScrollView>
    );
  };

  return (
    <Modal
      visible={isOpen}
      transparent={true}
      animationType="slide"
      onRequestClose={hideStockDetails}
    >
      <View style={styles.modalOverlay}>
        <View 
          style={styles.modalContent}
          onStartShouldSetResponder={() => true}
        >
          <View style={styles.header}>
            <View style={styles.headerTextContainer}>
              <Text style={styles.stockName} numberOfLines={1}>
                {stock?.longName || stock?.name || 'Stock Details'}
              </Text>
              <Text style={styles.stockSymbol}>
                {stock?.symbol} • {stock?.exchangeName || stock?.exchange || ''}
              </Text>
            </View>
            <TouchableOpacity 
              onPress={hideStockDetails}
              style={styles.closeButton}
              hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
            >
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
          </View>
          
          {renderContent()}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  // Time Range Selector
  timeRangeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  timeRangeButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  timeRangeButtonActive: {
    backgroundColor: '#007AFF',
  },
  timeRangeText: {
    fontSize: 12,
    color: '#666',
  },
  timeRangeTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  
  // Layout
  chartContainer: {
    height: 300,
    width: '100%',
    marginVertical: 10,
    backgroundColor: '#fff',
    position: 'relative',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalContent: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  stockName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  stockSymbol: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  closeButton: {
    padding: 8,
    margin: -8,
  },
  closeButtonText: {
    fontSize: 28,
    color: '#666',
    lineHeight: 28,
  },
  
  // Price Section
  priceContainer: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 4,
  },
  price: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginRight: 12,
  },
  priceChange: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  exchangeInfo: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  
  // Sections
  // Sentiment Analysis
  sentimentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  analyzeButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginLeft: 'auto',
  },
  analyzeButtonText: {
    color: '#007AFF',
    fontSize: 12,
    fontWeight: '500',
  },
  sentimentText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
    marginLeft: 8,
  },
  // Error text for small inline messages (like sentiment analysis errors)
  errorText: {
    fontSize: 10,
    color: '#f44336',
    marginTop: 2,
    textAlign: 'left',
  },
  
  // Sections
  sectionHeader: {
    backgroundColor: '#f8f8f8',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  
  // Stats Grid
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statItem: {
    width: '48%',
    marginBottom: 12,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  
  // Detail Rows
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f8f8',
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000',
  },
  
  // Company Summary
  summaryContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  summaryText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#333',
  },
  
  // News Styles
  newsItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  loadMoreButton: {
    padding: 12,
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    margin: 10,
  },
  loadMoreButtonText: {
    color: '#2e7d32',
    fontWeight: '600',
    fontSize: 16,
  },
  newsContent: {
    flex: 1,
  },
  newsTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000',
    marginBottom: 4,
    lineHeight: 20,
  },
  newsSource: {
    fontSize: 12,
    color: '#888',
    flex: 1,
  },
  newsMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  newsDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginTop: 8,
  },
  noNewsText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingVertical: 16,
  },
  
  // Links
  linkRow: {
    paddingVertical: 8,
  },
  linkText: {
    color: '#2e7d32',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  
  // Loading State
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  
  // Error State
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  // Error container for full-page error states
  errorTextLarge: {
    fontSize: 16,
    color: '#c62828',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#2e7d32',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 4,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default StockDetailsOverlay;
