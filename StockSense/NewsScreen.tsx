import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList, TouchableOpacity, Linking, RefreshControl, Image, SafeAreaView, Button } from 'react-native';
import { supabase } from './App';
import { useStockContext } from './context/StockContext';
import StockDetailsOverlay from './components/StockDetailsOverlay';

const BACKEND_URL = 'http://10.0.2.2:3000/api/stock-details'; // Base URL for API endpoints

// Move cache outside the component to persist between renders
const companyNameCache: {[key: string]: string} = {};

const NewsScreen = () => {
  const [portfolioNews, setPortfolioNews] = useState<any[]>([]);
  const [watchlistNews, setWatchlistNews] = useState<any[]>([]);
  const [marketNews, setMarketNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [category, setCategory] = useState('business'); // Default category
  const [userId, setUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'portfolio' | 'watchlist' | 'market'>('portfolio'); // Track active tab
  const [companyNames, setCompanyNames] = useState<Record<string, string>>({}); // Cache for company names
  const { showStockDetails } = useStockContext();

  // Function to preload company names from portfolio and watchlist
  const preloadCompanyNames = useCallback(async (userId: string) => {
    try {
      // Check if we already have data to prevent unnecessary fetches
      if (Object.keys(companyNameCache).length > 0) return;

      // Fetch all portfolio entries
      const { data: portfolioData } = await supabase
        .from('portfolio')
        .select('ticker, company_name')
        .eq('user_id', userId);

      // Fetch all watchlist entries
      const { data: watchlistData } = await supabase
        .from('watchlist')
        .select('ticker, company_name')
        .eq('user_id', userId);

      const newCache = { ...companyNameCache };
      let hasUpdates = false;

      // Update cache with portfolio data
      if (portfolioData) {
        portfolioData.forEach(item => {
          if (item.ticker && item.company_name && !newCache[item.ticker]) {
            newCache[item.ticker] = item.company_name;
            hasUpdates = true;
          }
        });
      }

      // Update cache with watchlist data (watchlist overrides portfolio if same ticker exists in both)
      if (watchlistData) {
        watchlistData.forEach(item => {
          if (item.ticker && item.company_name) {
            newCache[item.ticker] = item.company_name;
            hasUpdates = true;
          }
        });
      }

      // Only update state if we have new data
      if (hasUpdates) {
        // Update the module-level cache
        Object.assign(companyNameCache, newCache);
        // Update state to trigger re-render
        setCompanyNames({ ...newCache });
      }
    } catch (error) {
      // Silently handle the error in production
    }
  }, []);

  useEffect(() => {
    // Get user ID from Supabase session
    const session = supabase.auth.session();
    const user = session?.user;
    if (user) {
      setUserId(user.id);
      preloadCompanyNames(user.id);
    }
  }, []);

  const fetchPortfolioNews = async () => {
    try {
      setLoading(true);
      setError('');
      
      if (!userId) {
        setError('User not authenticated');
        setPortfolioNews([]);
        setLoading(false);
        return;
      }
      
      const { data: portfolioData, error: fetchError } = await supabase
        .from('portfolio')
        .select('ticker')
        .eq('user_id', userId);

      if (fetchError) {
        setError('Failed to fetch portfolio data');
        setPortfolioNews([]);
        setLoading(false);
        return;
      }

      // If no portfolio items, set empty array and return
      if (!portfolioData || portfolioData.length === 0) {
        setPortfolioNews([]);
        setLoading(false);
        return;
      }

      // Extract unique tickers from portfolio
      const portfolioStocks = Array.from(new Set(portfolioData.map(item => item.ticker)));
      const symbols = portfolioStocks.join(',');
      
      // Fetch news for portfolio stocks
      const response = await fetch(`${BACKEND_URL}/portfolio-news?symbols=${encodeURIComponent(symbols)}`);
      
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
        setPortfolioNews([]);
      } else {
        // Ensure we have an array of news items
        const newsItems = Array.isArray(data.news) ? data.news : 
                         Array.isArray(data) ? data : [];
                          
        setPortfolioNews(newsItems);
      }
    } catch (err) {
      setError('Failed to fetch portfolio news. Please check your connection.');
      setPortfolioNews([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchWatchlistNews = async () => {
    try {
      setLoading(true);
      setError('');
      
      if (!userId) {
        setError('User not authenticated');
        setWatchlistNews([]);
        setLoading(false);
        return;
      }
      
      // Fetch watchlist tickers from Supabase
      const { data: watchlistData, error: fetchError } = await supabase
        .from('watchlist')
        .select('ticker')
        .eq('user_id', userId);

      if (fetchError) {
        setError('Failed to fetch watchlist data');
        setWatchlistNews([]);
        setLoading(false);
        return;
      }

      // If no watchlist items, set empty array and return
      if (!watchlistData || watchlistData.length === 0) {
        setWatchlistNews([]);
        setLoading(false);
        return;
      }

      // Extract unique tickers from watchlist
      const watchlistTickers = Array.from(new Set(watchlistData.map(item => item.ticker)));
      const symbols = watchlistTickers.join(',');
      
      // Fetch news for watchlist tickers
      const response = await fetch(`${BACKEND_URL}/portfolio-news?symbols=${encodeURIComponent(symbols)}`);
      
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
        setWatchlistNews([]);
      } else {
        // Process the news items
        const newsItems = Array.isArray(data.news) ? data.news : 
                         Array.isArray(data) ? data : [];
                          
        setWatchlistNews(newsItems);
      }
    } catch (err) {
      setError('Failed to fetch watchlist news. Please check your connection.');
      setWatchlistNews([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMarketNews = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Use the correct endpoint for market news
      const apiUrl = `${BACKEND_URL}/news?category=${encodeURIComponent(category)}`;
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('The news endpoint was not found. Please check the API configuration.');
        } else if (response.status >= 500) {
          throw new Error('Server error. Please try again later.');
        } else {
          throw new Error(`API request failed with status ${response.status}`);
        }
      }
      
      const result = await response.json();
      
      // Handle the response format from our backend
      let newsItems = [];
      if (result.error) {
        throw new Error(result.error);
      } else if (result.news && Array.isArray(result.news)) {
        newsItems = result.news;
      } else if (Array.isArray(result)) {
        newsItems = result;
      }
      
      setMarketNews(newsItems);
      
      if (newsItems.length === 0) {
        setError('No market news available at the moment.');
      }
      
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(`Failed to fetch market news: ${errorMessage}`);
      setMarketNews([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      try {
        await Promise.all([
          fetchPortfolioNews(),
          fetchWatchlistNews(),
          fetchMarketNews()
        ]);
      } catch (error) {
        if (isMounted) {
          setError('Failed to load news. Please try again.');
          setLoading(false);
        }
      }
    };
    
    loadData();
    
    return () => {
      isMounted = false;
    };
  }, [userId]); // Re-fetch when userId changes

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      if (activeTab === 'portfolio') {
        await fetchPortfolioNews();
      } else if (activeTab === 'watchlist') {
        await fetchWatchlistNews();
      } else {
        await fetchMarketNews();
      }
    } catch (error) {
    }
    setRefreshing(false);
  };

  // Function to fetch company name from ticker symbol using cache
  const fetchCompanyName = async (ticker: string): Promise<string> => {
    // Return from cache if available
    if (companyNameCache[ticker]) {
      return companyNameCache[ticker];
    }

    // If not in cache, try to fetch from API
    try {
      const session = await supabase.auth.session();
      const jwt = session?.access_token;
      
      if (!jwt) return ticker;
      
      const response = await fetch(BACKEND_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwt}`,
        },
        body: JSON.stringify({ ticker })
      });
      
      if (!response.ok) return ticker;
      
      const data = await response.json();
      
      let companyName = ticker;
      if (data?.name) companyName = data.name;
      else if (data?.shortName) companyName = data.shortName;
      else if (data?.symbol) companyName = data.symbol;
      
      // Cache the result for future use
      companyNameCache[ticker] = companyName;
      return companyName;
      
    } catch (apiError) {
      // Silently handle the error in production
      return ticker;
    }
  };
  
  // Effect to update company names when news changes
  useEffect(() => {
    if (!portfolioNews?.length) return;
    
    // Get all unique tickers from the news items
    const allTickers = new Set<string>();
    portfolioNews.forEach(item => {
      if (item.related) {
        const related = Array.isArray(item.related) ? item.related : [item.related];
        related.forEach((ticker: string) => allTickers.add(ticker));
      }
    });
    
    // Create a mapping of tickers to their display names
    const newNames = Array.from(allTickers).reduce<Record<string, string>>((acc, ticker) => ({
      ...acc,
      [ticker]: companyNameCache[ticker] || ticker
    }), {});
    
    // Only update if there are actual changes
    setCompanyNames((prevNames: Record<string, string>) => {
      const hasChanges = Object.keys(newNames).some(
        (key: string) => prevNames[key] !== newNames[key]
      );
      return hasChanges ? { ...prevNames, ...newNames } : prevNames;
    });
  }, [portfolioNews]);
  
  // Load company names when userId changes
  useEffect(() => {
    if (userId) {
      preloadCompanyNames(userId);
    }
  }, [userId, preloadCompanyNames]);
  
  // Generate a unique key for each news item
  const getItemKey = (item: any, index: number) => {
    // Use a combination of item.id, index, and timestamp to ensure uniqueness
    return `${item.id || 'item'}-${index}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  const renderItem = ({ item, index }: { item: any, index: number }) => {
    // Safely access properties with fallbacks
    const title = item.headline || item.title || 'No title';
    const imageUrl = item.image || item.image_url;
    const source = item.source || 'Unknown source';
    const date = item.datetime ? new Date(item.datetime * 1000).toLocaleString() : item.publishedDate || '';
    
    // Get related companies
    const relatedCompanies = item.related ? 
      (Array.isArray(item.related) ? item.related : [item.related]) : [];
    
    return (
      <TouchableOpacity 
        onPress={() => item.url && Linking.openURL(item.url)} 
        style={styles.newsItem}
      >
        <View style={styles.imageContainer}>
          {imageUrl && (
            <Image 
              source={{ uri: imageUrl }} 
              style={styles.newsImage} 
              resizeMode="cover"
              onError={(e) => {}}
            />
          )}
        </View>
        
        {/* Company and Sentiment Row */}
        <View style={styles.companyRow}>
          {/* Related companies/tickers */}
          {relatedCompanies.length > 0 && (
            <View style={styles.companyContainer}>
              {relatedCompanies.map((ticker: string, idx: number) => {
                const displayName = companyNames[ticker] || ticker;
                // Create a unique key using multiple identifiers
                const uniqueKey = `company-${ticker}-${idx}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
                return (
                  <TouchableOpacity 
                    key={uniqueKey} 
                    style={styles.companyBadge}
                    onPress={async () => {
                      try {
                        const session = await supabase.auth.session();
                        const jwt = session?.access_token;
                        
                        if (!jwt) {
                          return;
                        }
                        
                        const response = await fetch(`http://10.0.2.2:3000/api/stock-details`, {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${jwt}`,
                          },
                          body: JSON.stringify({ ticker }),
                        });
                        
                        if (response.ok) {
                          const data = await response.json();
                          showStockDetails(data);
                        }
                      } catch (error) {
                        // Silently handle the error in production
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.companyText}>
                      {displayName}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
          
          {/* Sentiment Indicator */}
          {item.sentiment && (
            <Text style={[
              styles.sentimentText,
              { color: getSentimentStyle(item.sentiment.sentiment).color }
            ]}>
              {formatSentiment(item.sentiment)}
            </Text>
          )}
        </View>
        
        <Text style={styles.newsTitle} numberOfLines={2} ellipsizeMode="tail">
          {title}
        </Text>
        
        {item.summary && (
          <Text 
            style={styles.newsSummary} 
            numberOfLines={3} 
            ellipsizeMode="tail"
          >
            {item.summary}
          </Text>
        )}
        
        <View style={styles.newsMeta}>
          <Text style={styles.newsSource} numberOfLines={1}>
            {source}
          </Text>
          {date && (
            <Text style={styles.newsDate}>
              {date}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && (!portfolioNews?.length && !marketNews?.length && !watchlistNews?.length)) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#2e7d32" />
        <Text style={{ marginTop: 10 }}>Loading news...</Text>
      </View>
    );
  }

  // Helper function to get sentiment styling
  const getSentimentStyle = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return { color: '#4caf50' }; // Green for positive
      case 'negative':
        return { color: '#f44336' }; // Red for negative
      default:
        return { color: '#757575' }; // Grey for neutral
    }
  };

  // Format sentiment text with percentage
  const formatSentiment = (sentiment: any) => {
    if (!sentiment) return null;
    
    const score = Math.abs(sentiment.sentiment_score * 100).toFixed(0);
    return `${sentiment.sentiment}-${score}%`;
  };

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={{ color: 'red', marginBottom: 10 }}>{error}</Text>
        <Button 
          title="Retry" 
          onPress={() => {
            setError('');
            fetchPortfolioNews();
            fetchWatchlistNews();
            fetchMarketNews();
          }} 
        />
      </View>
    );
  }

  return (
    <>
      <SafeAreaView style={styles.listContainer}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>NEWS</Text>
        
        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'portfolio' && styles.activeTabButton]}
            onPress={() => setActiveTab('portfolio')}
          >
            <Text style={[styles.tabText, activeTab === 'portfolio' && styles.activeTabText]}>
              Portfolio
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'watchlist' && styles.activeTabButton]}
            onPress={() => setActiveTab('watchlist')}
          >
            <Text style={[styles.tabText, activeTab === 'watchlist' && styles.activeTabText]}>
              Watchlist
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'market' && styles.activeTabButton]}
            onPress={() => setActiveTab('market')}
          >
            <Text style={[styles.tabText, activeTab === 'market' && styles.activeTabText]}>
              Market
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content based on active tab */}
      <View style={styles.contentContainer}>
        {activeTab === 'portfolio' && (
          <View style={styles.newsContainer}>
            {loading && portfolioNews.length === 0 ? (
              <ActivityIndicator size="large" color="#2e7d32" />
            ) : error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
                <Button
                  title="Try Again"
                  onPress={fetchPortfolioNews}
                  color="#2e7d32"
                />
              </View>
            ) : (
              <FlatList
                data={portfolioNews}
                keyExtractor={(item, idx) => getItemKey(item, idx)}
                renderItem={({ item, index }) => renderItem({ item, index })}
                contentContainerStyle={styles.listContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                initialNumToRender={5}
                maxToRenderPerBatch={10}
                windowSize={10}
                removeClippedSubviews={true}
                ListEmptyComponent={
                  <Text style={styles.noNews}>No portfolio news available. Add stocks to your portfolio to see relevant news.</Text>
                }
                extraData={portfolioNews.length}
              />
            )}
          </View>
        )}

        {activeTab === 'watchlist' && (
          <View style={styles.newsContainer}>
            {loading && watchlistNews.length === 0 ? (
              <ActivityIndicator size="large" color="#2e7d32" />
            ) : error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
                <Button
                  title="Try Again"
                  onPress={fetchWatchlistNews}
                  color="#2e7d32"
                />
              </View>
            ) : (
              <FlatList
                data={watchlistNews}
                keyExtractor={(item, idx) => getItemKey(item, idx)}
                renderItem={({ item, index }) => renderItem({ item, index })}
                contentContainerStyle={styles.listContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                initialNumToRender={5}
                maxToRenderPerBatch={10}
                windowSize={10}
                removeClippedSubviews={true}
                ListEmptyComponent={
                  <Text style={styles.noNews}>No watchlist news available. Add stocks to your watchlist to see relevant news.</Text>
                }
                extraData={watchlistNews.length}
              />
            )}
          </View>
        )}

        {activeTab === 'market' && (
          <View style={styles.newsContainer}>
            {loading && marketNews.length === 0 ? (
              <ActivityIndicator size="large" color="#2e7d32" />
            ) : error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
                <Button
                  title="Try Again"
                  onPress={fetchMarketNews}
                  color="#2e7d32"
                />
              </View>
            ) : (
              <FlatList
                data={marketNews}
                keyExtractor={(item, idx) => getItemKey(item, idx)}
                renderItem={({ item, index }) => renderItem({ item, index })}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                contentContainerStyle={styles.listContent}
                initialNumToRender={5}
                maxToRenderPerBatch={10}
                windowSize={10}
                removeClippedSubviews={true}
                ListEmptyComponent={
                  <Text style={styles.noNews}>No market news available at the moment.</Text>
                }
                extraData={marketNews.length}
              />
            )}
          </View>
        )}
      </View>
      </SafeAreaView>
      <StockDetailsOverlay />
    </>
  );
};

const styles = StyleSheet.create({
  // ... existing styles ...
  imageContainer: {
    marginBottom: 8,
  },
  companyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  companyContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    flex: 1,
    marginRight: 8,
    marginBottom: 10,
    justifyContent: 'flex-start',
    alignItems: 'center',
    width: '100%',
  },
  sentimentText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
    marginLeft: 'auto', // Pushes the sentiment to the right
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    margin: 10,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTabButton: {
    backgroundColor: '#2e7d32',
  },
  tabText: {
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#fff',
    fontWeight: '600',
  },
  contentContainer: {
    flex: 1,
    width: '100%',
  },
  newsContainer: {
    flex: 1,
    minHeight: 200, // Ensure minimum height for the container
  },
  loader: {
    marginTop: 20,
  },
  listContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  listContent: {
    padding: 12,
    paddingBottom: 30, // Add padding at the bottom for better scrolling
  },
  header: {
    backgroundColor: '#2e7d32',
    padding: 16,
    alignItems: 'center',
  },
  headerTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  section: {
    flex: 1,
    marginVertical: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    padding: 10,
    backgroundColor: '#f5f5f5',
  },
  noNews: {
    padding: 10,
    textAlign: 'center',
    color: '#666',
  },
  newsImage: {
    width: '100%',
    height: 180,
    borderRadius: 6,
    marginBottom: 10,
  },
  newsItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    width: '100%',
  },
  newsTitle: {
    fontSize: 15,  // Reduced from 18
    fontWeight: '600',  // Slightly lighter bold
    color: '#2e7d32',
    marginBottom: 3,  // Reduced from 4
    lineHeight: 20,  // Added for better readability
  },
  newsSummary: {
    fontSize: 13,  // Reduced from 15
    color: '#333',
    marginBottom: 5,  // Reduced from 6
    lineHeight: 18,  // Added for better readability
  },
  newsMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },

  companyBadge: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginRight: 4,
    marginBottom: 6,
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    elevation: 0.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 1,
  },
  companyText: {
    fontSize: 9,
    fontWeight: '500',
  },
  newsSource: {
    fontSize: 12,
    color: '#888',
  },
  newsDate: {
    color: '#666',
    fontSize: 12,
    marginTop: 5,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: 'red',
    marginBottom: 15,
    textAlign: 'center',
    fontSize: 13,
  },
});

export default NewsScreen; 