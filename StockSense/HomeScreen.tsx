import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView, Image } from 'react-native';
import { supabase } from './App';

type HomeScreenProps = {
  route: any;
  navigation: any;
};

export default function HomeScreen({ route, navigation }: HomeScreenProps) {
  const [ticker, setTicker] = useState('');
  const [stock, setStock] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceTimeout = useRef<any>(null);

  const handleFetchStock = async () => {
    setLoading(true);
    setError('');
    setStock(null);
    try {
      // Get JWT from Supabase
      const session = await supabase.auth.session();
      const jwt = session?.access_token;
      if (!jwt) {
        setError('User not authenticated.');
        setLoading(false);
        return;
      }
      // Replace with your backend URL
      const backendUrl = 'http://10.0.2.2:3000/api/stock-details';
      const response = await fetch(backendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwt}`,
        },
        body: JSON.stringify({ ticker }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Failed to fetch stock details.');
      } else {
        setStock(data);
      }
    } catch (err) {
      setError('An error occurred while fetching stock details.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionSelect = (suggestion: any) => {
    setTicker(suggestion.symbol);
    setShowSuggestions(false);
    handleFetchStock();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image source={{ uri: 'https://img.icons8.com/ios-filled/100/2e7d32/stocks.png' }} style={styles.logo} />
        <Text style={styles.title}>StockSense</Text>
      </View>
      
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Enter stock ticker (e.g., AAPL)"
          value={ticker}
          onChangeText={setTicker}
          placeholderTextColor="#999"
        />
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleFetchStock}
          disabled={loading || !ticker.trim()}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Get Stock Details</Text>
          )}
        </TouchableOpacity>
      </View>

      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : null}

      {stock && (
        <ScrollView style={styles.stockContainer}>
          <View style={styles.stockHeader}>
            <Text style={styles.stockSymbol}>{stock.symbol}</Text>
            <Text style={styles.stockName}>{stock.name}</Text>
          </View>
          
          <View style={styles.stockDetails}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Current Price:</Text>
              <Text style={styles.detailValue}>${stock.price?.toFixed(2)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Change:</Text>
              <Text style={[
                styles.detailValue,
                stock.change >= 0 ? styles.positiveChange : styles.negativeChange
              ]}>
                {stock.change >= 0 ? '+' : ''}{stock.change?.toFixed(2)} ({stock.changePercent?.toFixed(2)}%)
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Market Cap:</Text>
              <Text style={styles.detailValue}>${(stock.marketCap / 1e9).toFixed(2)}B</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Volume:</Text>
              <Text style={styles.detailValue}>{(stock.volume / 1e6).toFixed(2)}M</Text>
            </View>
          </View>
          
          {stock.news && stock.news.length > 0 && (
            <View style={styles.newsSection}>
              <Text style={styles.sectionTitle}>Latest News</Text>
              {stock.news.map((item: any, index: number) => (
                <TouchableOpacity
                  key={index}
                  style={styles.newsItem}
                  onPress={() => {
                    // Handle news item press
                    console.log('News item pressed:', item.url);
                  }}
                >
                  <Text style={styles.newsTitle}>{item.headline}</Text>
                  <Text style={styles.newsSource}>{item.source} • {new Date(item.datetime * 1000).toLocaleDateString()}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    width: 64,
    height: 64,
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2e7d32',
  },
  inputContainer: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  button: {
    backgroundColor: '#2e7d32',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    backgroundColor: '#a5d6a7',
  },
  errorText: {
    color: '#d32f2f',
    marginBottom: 16,
    textAlign: 'center',
  },
  stockContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  stockHeader: {
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 16,
  },
  stockSymbol: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  stockName: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  stockDetails: {
    marginBottom: 24,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 16,
    color: '#666',
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  positiveChange: {
    color: '#2e7d32',
  },
  negativeChange: {
    color: '#d32f2f',
  },
  newsSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  newsItem: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  newsTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  newsSource: {
    fontSize: 12,
    color: '#999',
  },
});
