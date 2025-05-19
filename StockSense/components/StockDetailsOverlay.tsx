import React, { useEffect, useState } from 'react';
import { useStockContext } from '../context/StockContext';
import { Stock } from '../types/stock';
import { Modal, TouchableOpacity, View, Text, ScrollView, StyleSheet, ActivityIndicator, Linking } from 'react-native';
import { supabase } from '../App';

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
const formatPercent = (value?: number, decimals: number = 2): string => {
  if (value === undefined || value === null) return 'N/A';
  return `${value > 0 ? '+' : ''}${value.toFixed(decimals)}%`;
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStockDetails = async () => {
      if (!initialStock || !isOpen) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const session = await supabase.auth.session();
        const jwt = session?.access_token;
        
        if (!jwt) {
          throw new Error('User not authenticated');
        }
        
        // Use the same endpoint as in App.tsx for consistency
        const backendUrl = 'http://10.0.2.2:3000/api/stock-details';
        const requestBody = { ticker: initialStock.symbol };
        
        // Fetching stock details
        
        // Fetch detailed stock data using POST request to match the backend endpoint
        const response = await fetch(backendUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${jwt}`,
          },
          body: JSON.stringify(requestBody),
        });
        
        // Processing response
        
        if (!response.ok) {
          let errorMessage = 'Failed to fetch stock details';
          let errorData;
          try {
            errorData = await response.json();
            // Error response received
            errorMessage = errorData.error || errorMessage;
          } catch (e) {
            // If we can't parse the error JSON, use the status text
            // Error parsing response
            errorMessage = response.statusText || errorMessage;
          }
          throw new Error(errorMessage);
        }
        
        const data = await response.json();
        // Stock data received
        
        // Map the API response to our Stock interface
        const stockData: Stock = {
          // Required fields with fallbacks
          id: data.id || initialStock.id,
          symbol: data.symbol || initialStock.symbol,
          name: data.name || initialStock.name,
          currentPrice: data.currentPrice || data.price || initialStock.currentPrice,
          change: data.change || initialStock.change,
          changePercent: data.changePercent || initialStock.changePercent,
          
          // Map all available fields from the API response
          currency: data.currency || 'USD',
          regularMarketPrice: data.currentPrice || data.price,
          regularMarketVolume: data.regularMarketVolume || data.volume,
          regularMarketOpen: data.regularMarketOpen || data.open,
          regularMarketDayHigh: data.regularMarketDayHigh || data.dayHigh,
          regularMarketDayLow: data.regularMarketDayLow || data.dayLow,
          regularMarketPreviousClose: data.regularMarketPreviousClose || data.previousClose,
          averageDailyVolume3Month: data.averageDailyVolume3Month || data.averageVolume,
          trailingPE: data.trailingPE || data.peRatio,
          forwardPE: data.forwardPE,
          priceToBook: data.priceToBook,
          dividendYield: data.dividendYield,
          dividendRate: data.dividendRate,
          payoutRatio: data.payoutRatio,
          trailingAnnualDividendYield: data.trailingAnnualDividendYield,
          trailingAnnualDividendRate: data.trailingAnnualDividendRate,
          fiftyTwoWeekHigh: data.fiftyTwoWeekHigh || data.yearHigh,
          fiftyTwoWeekLow: data.fiftyTwoWeekLow || data.yearLow,
          marketCap: data.marketCap,
          epsTrailingTwelveMonths: data.epsTrailingTwelveMonths,
          epsForward: data.epsForward,
          beta: data.beta,
          exchange: data.exchange,
          exchangeName: data.exchangeName,
          marketState: data.marketState,
          quoteType: data.quoteType,
          fiftyDayAverage: data.fiftyDayAverage,
          twoHundredDayAverage: data.twoHundredDayAverage,
          lastUpdated: data.lastUpdated
        };
        
        // Log the available data for debugging
        // Stock data processed
        setStock(stockData);
      } catch (err: any) {
        // Error fetching stock details
        setError(err.message || 'Failed to load stock details');
      } finally {
        setLoading(false);
      }
    };
    
    fetchStockDetails();
  }, [initialStock, isOpen]);

  if (!initialStock || !isOpen) return null;

  const renderLoading = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#2e7d32" />
      <Text style={styles.loadingText}>Loading stock details...</Text>
    </View>
  );

  const renderError = () => (
    <View style={styles.errorContainer}>
      <Text style={styles.errorText}>Error: {error}</Text>
      <TouchableOpacity 
        style={styles.retryButton}
        onPress={() => {
          // Reset the state to trigger a refetch
          setError(null);
          setLoading(true);
          // The useEffect will automatically refetch when loading is set to true
        }}
      >
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  const renderContent = () => {
    if (loading) return renderLoading();
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
  // Layout
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
  errorText: {
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
