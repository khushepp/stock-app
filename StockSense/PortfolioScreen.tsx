import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, Button, FlatList, TouchableOpacity, ActivityIndicator, Modal, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { supabase } from './App';

// Define the type for a portfolio item
interface PortfolioItem {
  id: string;
  user_id: string;
  ticker: string;
  shares: number;
  buy_price: number;
  date_added?: string;
  company_name?: string;
}

// Add WatchlistItem interface
interface WatchlistItem {
  id: string;
  user_id: string;
  ticker: string;
  company_name: string;
  date_added?: string;
}

interface Suggestion {
  symbol: string;
  name: string;
}

const PortfolioScreen = () => {
  const [ticker, setTicker] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true); // for portfolio fetch
  const [addLoading, setAddLoading] = useState(false); // for add operation
  const [error, setError] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Autocomplete state
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceTimeout = useRef<any>(null);

  // Add companyName state
  const [companyName, setCompanyName] = useState('');

  // Remove modal state
  const [removeModalVisible, setRemoveModalVisible] = useState(false);
  const [selectedToRemove, setSelectedToRemove] = useState<PortfolioItem | null>(null);
  const [removeLoading, setRemoveLoading] = useState(false);
  // New: Inputs for selling
  const [sellQuantity, setSellQuantity] = useState('');
  const [sellPrice, setSellPrice] = useState('');

  // Edit modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editStock, setEditStock] = useState<PortfolioItem | null>(null);
  const [editQuantity, setEditQuantity] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  // State for current prices
  const [currentPrices, setCurrentPrices] = useState<{ [ticker: string]: { price?: number; currency?: string; loading: boolean; error?: string } }>({});

  // Section toggle state
  const [section, setSection] = useState<'portfolio' | 'watchlist'>('portfolio');

  // Watchlist state
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [watchlistLoading, setWatchlistLoading] = useState(false);
  const [addWatchlistModalVisible, setAddWatchlistModalVisible] = useState(false);
  const [addWatchlistLoading, setAddWatchlistLoading] = useState(false);
  const [watchlistTicker, setWatchlistTicker] = useState('');
  const [watchlistCompanyName, setWatchlistCompanyName] = useState('');
  const [watchlistSuggestions, setWatchlistSuggestions] = useState<Suggestion[]>([]);
  const [watchlistSuggestionsLoading, setWatchlistSuggestionsLoading] = useState(false);
  const [watchlistShowSuggestions, setWatchlistShowSuggestions] = useState(false);
  const watchlistDebounceTimeout = useRef<any>(null);
  const [removeWatchlistLoading, setRemoveWatchlistLoading] = useState(false);
  const [selectedWatchlistToRemove, setSelectedWatchlistToRemove] = useState<WatchlistItem | null>(null);

  // Fetch user and portfolio on mount
  useEffect(() => {
    const fetchUserAndPortfolio = async () => {
      setLoading(true);
      setError('');
      // Use session() to get the user (v1)
      const session = supabase.auth.session();
      const user = session?.user;
      if (!user) {
        setError('User not authenticated.');
        setLoading(false);
        return;
      }
      setUserId(user.id);
      // Fetch portfolio
      const { data, error: fetchError } = await supabase
        .from('portfolio')
        .select('*')
        .eq('user_id', user.id)
        .order('date_added', { ascending: false });
      if (fetchError) {
        setError('Failed to fetch portfolio.');
      } else {
        setPortfolio((data as PortfolioItem[]) || []);
      }
      setLoading(false);
    };
    fetchUserAndPortfolio();
  }, []);

  // After portfolio is loaded, extract unique tickers and prepare for price fetching
  useEffect(() => {
    if (!loading && portfolio.length > 0) {
      const uniqueTickers = Array.from(new Set(portfolio.map(item => item.ticker.toUpperCase())));
      // Prepare state for each ticker
      setCurrentPrices(prev => {
        const newState = { ...prev };
        uniqueTickers.forEach(ticker => {
          if (!newState[ticker]) {
            newState[ticker] = { loading: true };
          }
        });
        // Remove tickers that are no longer in the portfolio
        Object.keys(newState).forEach(ticker => {
          if (!uniqueTickers.includes(ticker)) {
            delete newState[ticker];
          }
        });
        return newState;
      });
      // Fetch current prices for each ticker
      uniqueTickers.forEach(async (ticker) => {
        setCurrentPrices(prev => ({ ...prev, [ticker]: { ...prev[ticker], loading: true, error: undefined } }));
        try {
          // Get JWT from Supabase
          const session = supabase.auth.session();
          const jwt = session?.access_token;
          if (!jwt) {
            setCurrentPrices(prev => ({ ...prev, [ticker]: { ...prev[ticker], loading: false, error: 'Not authenticated' } }));
            return;
          }
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
          if (!response.ok || data.error) {
            setCurrentPrices(prev => ({ ...prev, [ticker]: { ...prev[ticker], loading: false, error: data.error || 'Failed to fetch price' } }));
          } else {
            setCurrentPrices(prev => ({ ...prev, [ticker]: { price: data.price, currency: data.currency, loading: false } }));
          }
        } catch (err) {
          setCurrentPrices(prev => ({ ...prev, [ticker]: { ...prev[ticker], loading: false, error: 'Network error' } }));
        }
      });
    }
  }, [loading, portfolio]);

  // Watchlist: Fetch on mount and when userId changes
  useEffect(() => {
    if (!userId || section !== 'watchlist') return;
    setWatchlistLoading(true);
    supabase
      .from('watchlist')
      .select('*')
      .eq('user_id', userId)
      .order('date_added', { ascending: false })
      .then(({ data, error }) => {
        if (!error) setWatchlist((data as WatchlistItem[]) || []);
        setWatchlistLoading(false);
      });
  }, [userId, section]);

  // Watchlist: Fetch current prices for watchlist tickers
  const [watchlistPrices, setWatchlistPrices] = useState<{ [ticker: string]: { price?: number; currency?: string; loading: boolean; error?: string } }>({});
  useEffect(() => {
    if (section !== 'watchlist' || watchlist.length === 0) return;
    const uniqueTickers = Array.from(new Set(watchlist.map(item => item.ticker.toUpperCase())));
    setWatchlistPrices(prev => {
      const newState = { ...prev };
      uniqueTickers.forEach(ticker => {
        if (!newState[ticker]) newState[ticker] = { loading: true };
      });
      Object.keys(newState).forEach(ticker => {
        if (!uniqueTickers.includes(ticker)) delete newState[ticker];
      });
      return newState;
    });
    uniqueTickers.forEach(async (ticker) => {
      setWatchlistPrices(prev => ({ ...prev, [ticker]: { ...prev[ticker], loading: true, error: undefined } }));
      try {
        const session = supabase.auth.session();
        const jwt = session?.access_token;
        if (!jwt) {
          setWatchlistPrices(prev => ({ ...prev, [ticker]: { ...prev[ticker], loading: false, error: 'Not authenticated' } }));
          return;
        }
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
        if (!response.ok || data.error) {
          setWatchlistPrices(prev => ({ ...prev, [ticker]: { ...prev[ticker], loading: false, error: data.error || 'Failed to fetch price' } }));
        } else {
          setWatchlistPrices(prev => ({ ...prev, [ticker]: { price: data.price, currency: data.currency, loading: false } }));
        }
      } catch (err) {
        setWatchlistPrices(prev => ({ ...prev, [ticker]: { ...prev[ticker], loading: false, error: 'Network error' } }));
      }
    });
  }, [watchlist, section]);

  // Debounced suggestions fetch
  const fetchSuggestions = async (query: string) => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    setSuggestionsLoading(true);
    try {
      // Get JWT from Supabase
      const session = supabase.auth.session();
      const jwt = session?.access_token;
      if (!jwt) {
        setSuggestions([]);
        setShowSuggestions(false);
        setSuggestionsLoading(false);
        return;
      }
      const backendUrl = 'http://10.0.2.2:3000/api/stock-details/suggestions';
      const response = await fetch(backendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwt}`,
        },
        body: JSON.stringify({ query }),
      });
      const data = await response.json();
      setSuggestions(data.suggestions || []);
      setShowSuggestions(true);
    } catch (err) {
      setSuggestions([]);
      setShowSuggestions(false);
    }
    setSuggestionsLoading(false);
  };

  const handleTickerChange = (text: string) => {
    setTicker(text);
    setCompanyName(''); // Reset company name if user types manually
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }
    debounceTimeout.current = setTimeout(() => {
      fetchSuggestions(text);
    }, 300);
  };

  const handleSuggestionSelect = (symbol: string) => {
    setTicker(symbol);
    const suggestion = suggestions.find(s => s.symbol === symbol);
    setCompanyName(suggestion ? suggestion.name : '');
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleAddStock = async () => {
    console.log('handleAddStock called', { ticker, quantity, price, userId, companyName });
    if (!ticker.trim() || !quantity.trim() || !price.trim() || !userId) {
      setError('All fields are required.');
      return;
    }
    if (!companyName) {
      setError('Please select a valid ticker from the suggestions.');
      return;
    }
    setAddLoading(true);
    setError('');
    try {
      const { data, error: insertError } = await supabase
        .from('portfolio')
        .insert([
          {
            user_id: userId,
            ticker: ticker.trim(),
            shares: Number(quantity),
            buy_price: Number(price),
            company_name: companyName,
          },
        ])
        .select();
      if (insertError) {
        setError(insertError.message || 'Failed to add stock.');
        setAddLoading(false);
        return;
      }
      setPortfolio(prev => [data[0] as PortfolioItem, ...prev]);
      setTicker('');
      setQuantity('');
      setPrice('');
      setCompanyName('');
      setModalVisible(false);
    } catch (err) {
      setError('Exception: ' + (err as Error).message);
    }
    setAddLoading(false);
  };

  const isAddDisabled =
    addLoading ||
    !ticker.trim() ||
    !quantity.trim() ||
    !price.trim() ||
    !companyName;

  // Watchlist: Suggestions logic
  const fetchWatchlistSuggestions = async (query: string) => {
    if (!query || query.length < 2) {
      setWatchlistSuggestions([]);
      setWatchlistShowSuggestions(false);
      return;
    }
    setWatchlistSuggestionsLoading(true);
    try {
      const session = supabase.auth.session();
      const jwt = session?.access_token;
      if (!jwt) {
        setWatchlistSuggestions([]);
        setWatchlistShowSuggestions(false);
        setWatchlistSuggestionsLoading(false);
        return;
      }
      const backendUrl = 'http://10.0.2.2:3000/api/stock-details/suggestions';
      const response = await fetch(backendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwt}`,
        },
        body: JSON.stringify({ query }),
      });
      const data = await response.json();
      setWatchlistSuggestions(data.suggestions || []);
      setWatchlistShowSuggestions(true);
    } catch (err) {
      setWatchlistSuggestions([]);
      setWatchlistShowSuggestions(false);
    }
    setWatchlistSuggestionsLoading(false);
  };
  const handleWatchlistTickerChange = (text: string) => {
    setWatchlistTicker(text);
    setWatchlistCompanyName('');
    if (watchlistDebounceTimeout.current) clearTimeout(watchlistDebounceTimeout.current);
    watchlistDebounceTimeout.current = setTimeout(() => {
      fetchWatchlistSuggestions(text);
    }, 300);
  };
  const handleWatchlistSuggestionSelect = (symbol: string) => {
    setWatchlistTicker(symbol);
    const suggestion = watchlistSuggestions.find(s => s.symbol === symbol);
    setWatchlistCompanyName(suggestion ? suggestion.name : '');
    setWatchlistShowSuggestions(false);
    setWatchlistSuggestions([]);
  };

  // Add to watchlist
  const handleAddWatchlist = async () => {
    if (!watchlistTicker.trim() || !userId || !watchlistCompanyName) return;
    setAddWatchlistLoading(true);
    try {
      const { data, error: insertError } = await supabase
        .from('watchlist')
        .insert([
          {
            user_id: userId,
            ticker: watchlistTicker.trim(),
            company_name: watchlistCompanyName,
          },
        ])
        .select();
      if (insertError) {
        setAddWatchlistLoading(false);
        return;
      }
      setWatchlist(prev => [data[0] as WatchlistItem, ...prev]);
      setWatchlistTicker('');
      setWatchlistCompanyName('');
      setAddWatchlistModalVisible(false);
    } catch (err) {}
    setAddWatchlistLoading(false);
  };
  const isAddWatchlistDisabled =
    addWatchlistLoading ||
    !watchlistTicker.trim() ||
    !watchlistCompanyName;

  // Remove from watchlist
  const handleRemoveWatchlist = async (item: WatchlistItem) => {
    setRemoveWatchlistLoading(true);
    try {
      const { error: deleteError } = await supabase
        .from('watchlist')
        .delete()
        .eq('id', item.id);
      if (!deleteError) {
        setWatchlist(prev => prev.filter(w => w.id !== item.id));
      }
    } catch (err) {
      console.error('Error removing from watchlist:', err);
    } finally {
      setRemoveWatchlistLoading(false);
      setSelectedWatchlistToRemove(null);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>YOUR STOCKS</Text>
      </View>
      
      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tabButton, section === 'portfolio' && styles.activeTabButton]}
          onPress={() => setSection('portfolio')}
        >
          <Text style={[styles.tabText, section === 'portfolio' && styles.activeTabText]}>
            Portfolio
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabButton, section === 'watchlist' && styles.activeTabButton]}
          onPress={() => setSection('watchlist')}
        >
          <Text style={[styles.tabText, section === 'watchlist' && styles.activeTabText]}>
            Watchlist
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content based on active tab */}
      <View style={styles.contentContainer}>
        {section === 'portfolio' && (
        <>
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
              <Icon name="add" size={16} color="#fff" />
              <Text style={styles.addButtonText}>ADD PURCHASED STOCK</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.removeButton} 
              onPress={() => setRemoveModalVisible(true)}
            >
              <Icon name="remove" size={16} color="#fff" />
              <Text style={styles.removeButtonText}>REMOVE SOLD STOCK</Text>
            </TouchableOpacity>
          </View>
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Stock</Text>
            <View style={styles.inputRow}>
              <View style={{ flex: 1 }}>
                <TextInput
                  style={styles.input}
                  placeholder="Stock Ticker"
                  value={ticker}
                  onChangeText={text => {
                    setTicker(text);
                    setCompanyName(''); // Always clear company name if user types
                    if (debounceTimeout.current) {
                      clearTimeout(debounceTimeout.current);
                    }
                    debounceTimeout.current = setTimeout(() => {
                      fetchSuggestions(text);
                    }, 300);
                  }}
                  autoCapitalize="characters"
                  onFocus={() => ticker.length >= 2 && suggestions.length > 0 && setShowSuggestions(true)}
                />
                {/* Autocomplete suggestions */}
                {showSuggestions && suggestions.length > 0 && (
                  <View style={styles.suggestionsBox}>
                    {suggestionsLoading ? (
                      <ActivityIndicator style={{ margin: 8 }} />
                    ) : (
                      <ScrollView style={{ maxHeight: 180 }}>
                        {suggestions.map((s, idx) => (
                          <TouchableOpacity key={s.symbol + idx} onPress={() => handleSuggestionSelect(s.symbol)}>
                            <Text style={styles.suggestion}>{s.symbol} - {s.name}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    )}
                  </View>
                )}
              </View>
              <TextInput
                style={[styles.input, { width: 80, marginLeft: 8 }]}
                placeholder="Qty"
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="numeric"
              />
              <TextInput
                style={[styles.input, { width: 100, marginLeft: 8 }]}
                placeholder="Price per Stock"
                value={price}
                onChangeText={setPrice}
                keyboardType="numeric"
              />
            </View>
            {error ? <Text style={{ color: 'red', marginBottom: 8 }}>{error}</Text> : null}
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 }}>
              <Button title="Cancel" onPress={() => setModalVisible(false)} color="#888" />
              <View style={{ width: 12 }} />
              <Button
                title="Add"
                onPress={handleAddStock}
                disabled={isAddDisabled}
              />
            </View>
          </View>
        </View>
      </Modal>
      <Modal
        visible={removeModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setRemoveModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Remove Sold Stock</Text>
            {portfolio.length === 0 ? (
              <Text style={{ marginBottom: 16 }}>No stocks to remove.</Text>
            ) : selectedToRemove ? (
              <>
                <Text style={{ fontWeight: 'bold', fontSize: 16 }}>{selectedToRemove.ticker}</Text>
                <Text style={{ fontSize: 13, color: '#555' }}>{selectedToRemove.company_name || '[No company name]'}</Text>
                <Text style={{ fontSize: 14 }}>Qty owned: {selectedToRemove.shares} | Purchased at: ${selectedToRemove.buy_price}</Text>
                <View style={styles.inputRow}>
                  <TextInput
                    style={[styles.input, { width: 80 }]}
                    placeholder="Qty sold"
                    value={sellQuantity}
                    onChangeText={setSellQuantity}
                    keyboardType="numeric"
                    maxLength={selectedToRemove.shares.toString().length}
                  />
                  <TextInput
                    style={[styles.input, { width: 100, marginLeft: 8 }]}
                    placeholder="Sell price"
                    value={sellPrice}
                    onChangeText={setSellPrice}
                    keyboardType="numeric"
                  />
                </View>
              </>
            ) : (
              <ScrollView style={{ maxHeight: 200, marginBottom: 16 }}>
                {portfolio.map((item: PortfolioItem) => {
                  const isSelected = selectedToRemove !== null && (selectedToRemove as PortfolioItem).id === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={{
                        padding: 12,
                        backgroundColor: isSelected ? '#ffcdd2' : '#f5f5f5',
                        borderRadius: 6,
                        marginBottom: 8,
                        borderWidth: isSelected ? 2 : 1,
                        borderColor: isSelected ? '#c62828' : '#ccc',
                      }}
                      onPress={() => {
                        setSelectedToRemove(item);
                        setSellQuantity('');
                        setSellPrice('');
                      }}
                    >
                      <Text style={{ fontWeight: 'bold', fontSize: 16 }}>{item.ticker}</Text>
                      {item.company_name ? <Text style={{ fontSize: 13, color: '#555' }}>{item.company_name}</Text> : <Text style={{ fontSize: 13, color: '#c62828' }}>[No company name]</Text>}
                      <Text style={{ fontSize: 14 }}>Qty: {item.shares} | Price: ${item.buy_price}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
            {error ? <Text style={{ color: 'red', marginBottom: 8 }}>{error}</Text> : null}
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
              <Button title="Cancel" onPress={() => { setRemoveModalVisible(false); setSelectedToRemove(null); setSellQuantity(''); setSellPrice(''); }} color="#888" />
              <View style={{ width: 12 }} />
              <Button
                title={removeLoading ? 'Saving...' : 'Confirm Sale'}
                color="#c62828"
                disabled={
                  !selectedToRemove ||
                  removeLoading ||
                  !sellQuantity.trim() ||
                  !sellPrice.trim() ||
                  isNaN(Number(sellQuantity)) ||
                  isNaN(Number(sellPrice)) ||
                  Number(sellQuantity) <= 0 ||
                  Number(sellPrice) <= 0 ||
                  Number(sellQuantity) > (selectedToRemove ? selectedToRemove.shares : 0)
                }
                onPress={async () => {
                  if (!selectedToRemove) return;
                  setRemoveLoading(true);
                  setError('');
                  const quantitySold = Number(sellQuantity);
                  const priceSoldNum = Number(sellPrice);
                  try {
                    // Insert into transactions table with new schema
                    const { error: insertError } = await supabase
                      .from('transactions')
                      .insert([
                        {
                          user_id: selectedToRemove.user_id,
                          ticker: selectedToRemove.ticker,
                          company_name: selectedToRemove.company_name,
                          quantity_bought: selectedToRemove.shares, // original shares at purchase
                          price_bought: selectedToRemove.buy_price,
                          date_bought: selectedToRemove.date_added,
                          quantity_sold: quantitySold,
                          price_sold: priceSoldNum,
                          date_sold: new Date().toISOString(),
                        },
                      ]);
                    if (insertError) {
                      setError(insertError.message || 'Failed to record transaction.');
                      setRemoveLoading(false);
                      return;
                    }
                    // Update portfolio: subtract shares or remove entry
                    if (quantitySold < selectedToRemove.shares) {
                      // Partial sale: update shares
                      const { error: updateError } = await supabase
                        .from('portfolio')
                        .update({ shares: selectedToRemove.shares - quantitySold })
                        .eq('id', selectedToRemove.id);
                      if (updateError) {
                        setError(updateError.message || 'Failed to update portfolio.');
                        setRemoveLoading(false);
                        return;
                      }
                      setPortfolio(prev => prev.map(item =>
                        item.id === selectedToRemove.id
                          ? { ...item, shares: item.shares - quantitySold }
                          : item
                      ));
                    } else {
                      // Full sale: remove entry
                      const { error: deleteError } = await supabase
                        .from('portfolio')
                        .delete()
                        .eq('id', selectedToRemove.id);
                      if (deleteError) {
                        setError(deleteError.message || 'Failed to remove stock from portfolio.');
                        setRemoveLoading(false);
                        return;
                      }
                      setPortfolio(prev => prev.filter(item => item.id !== selectedToRemove.id));
                    }
                    setSelectedToRemove(null);
                    setSellQuantity('');
                    setSellPrice('');
                    setRemoveModalVisible(false);
                  } catch (err) {
                    setError('Exception: ' + (err as Error).message);
                  }
                  setRemoveLoading(false);
                }}
              />
            </View>
          </View>
        </View>
      </Modal>
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Stock</Text>
            {editStock && (
              <>
                <Text style={{ fontWeight: 'bold', fontSize: 12, marginBottom: 8 }}>
                  {editStock.company_name || '[No company name]'}
                </Text>
                <TextInput
                  style={[styles.input, { marginBottom: 8 }]}
                  placeholder="Quantity"
                  value={editQuantity}
                  onChangeText={setEditQuantity}
                  keyboardType="numeric"
                />
                <TextInput
                  style={[styles.input, { marginBottom: 8 }]}
                  placeholder="Price per Stock"
                  value={editPrice}
                  onChangeText={setEditPrice}
                  keyboardType="numeric"
                />
              </>
            )}
            {error ? <Text style={{ color: 'red', marginBottom: 8 }}>{error}</Text> : null}
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
              <Button title="Cancel" onPress={() => setEditModalVisible(false)} color="#888" />
              <View style={{ width: 12 }} />
              <Button
                title={editLoading ? 'Saving...' : 'Save'}
                disabled={editLoading || !editStock || !editQuantity.trim() || !editPrice.trim()}
                onPress={async () => {
                  if (!editStock) return;
                  setEditLoading(true);
                  setError('');
                  const { error: updateError } = await supabase
                    .from('portfolio')
                    .update({ shares: Number(editQuantity), buy_price: Number(editPrice) })
                    .eq('id', editStock.id);
                  setEditLoading(false);
                  if (updateError) {
                    setError(updateError.message || 'Failed to update stock.');
                    return;
                  }
                  setPortfolio(prev => prev.map(item =>
                    item.id === editStock.id
                      ? { ...item, shares: Number(editQuantity), buy_price: Number(editPrice) }
                      : item
                  ));
                  setEditModalVisible(false);
                }}
              />
            </View>
          </View>
        </View>
      </Modal>
      {loading ? (
        <ActivityIndicator size="large" color="#2e7d32" style={{ marginTop: 32 }} />
      ) : (
        <FlatList
          data={portfolio}
          keyExtractor={item => item.id}
          renderItem={({ item }) => {
            const ticker = item.ticker.toUpperCase();
            const priceInfo = currentPrices[ticker];
            return (
              <TouchableOpacity onPress={() => {
                setEditStock(item);
                setEditQuantity(item.shares.toString());
                setEditPrice(item.buy_price.toString());
                setEditModalVisible(true);
              }}>
                <View style={styles.stockRow}>
                  <View style={{ flex: 2 }}>
                    <Text style={styles.ticker}>{item.ticker}</Text>
                    {item.company_name ? (
                      <Text style={styles.companyName}>{item.company_name}</Text>
                    ) : (
                      <Text style={[styles.companyName, { color: '#c62828' }]}>[No company name]</Text>
                    )}
                  </View>
                  <View style={styles.centeredQtyCell}>
                    <Text style={styles.quantity}>Qty: {item.shares}</Text>
                  </View>
                  <View style={{ flex: 2, alignItems: 'flex-end' }}>
                    {priceInfo ? (
                      priceInfo.loading ? (
                        <ActivityIndicator size="small" color="#1565c0" style={{ marginBottom: 2 }} />
                      ) : priceInfo.error ? (
                        <Text style={{ color: '#c62828', fontSize: 10, marginBottom: 2 }}>Err: {priceInfo.error}</Text>
                      ) : (
                        <Text style={{ color: '#2e7d32', fontSize: 10, marginBottom: 2 }}>
                          Current: ${priceInfo.price} {priceInfo.currency || ''}
                        </Text>
                      )
                    ) : null}
                    <Text style={styles.price}>Purchased Price: ${item.buy_price}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
          style={{ marginTop: 24, width: '100%' }}
        />
      )}
        </>
      )}
      {section === 'watchlist' && (
        <>
    
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.addButton} onPress={() => setAddWatchlistModalVisible(true)}>
              <Text style={styles.addButtonText}>ADD TO WATCHLIST</Text>
            </TouchableOpacity>
          </View>
          <Modal
            visible={addWatchlistModalVisible}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setAddWatchlistModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Add to Watchlist</Text>
                <View style={styles.inputRow}>
                  <View style={{ flex: 1 }}>
                    <TextInput
                      style={styles.input}
                      placeholder="Stock Ticker"
                      value={watchlistTicker}
                      onChangeText={handleWatchlistTickerChange}
                      autoCapitalize="characters"
                      onFocus={() => watchlistTicker.length >= 2 && watchlistSuggestions.length > 0 && setWatchlistShowSuggestions(true)}
                    />
                    {/* Autocomplete suggestions */}
                    {watchlistShowSuggestions && watchlistSuggestions.length > 0 && (
                      <View style={styles.suggestionsBox}>
                        {watchlistSuggestionsLoading ? (
                          <ActivityIndicator style={{ margin: 8 }} />
                        ) : (
                          <ScrollView style={{ maxHeight: 180 }}>
                            {watchlistSuggestions.map((s, idx) => (
                              <TouchableOpacity key={s.symbol + idx} onPress={() => handleWatchlistSuggestionSelect(s.symbol)}>
                                <Text style={styles.suggestion}>{s.symbol} - {s.name}</Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        )}
                      </View>
                    )}
                  </View>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 }}>
                  <Button title="Cancel" onPress={() => setAddWatchlistModalVisible(false)} color="#888" />
                  <View style={{ width: 12 }} />
                  <Button
                    title="Add"
                    onPress={handleAddWatchlist}
                    disabled={isAddWatchlistDisabled}
                  />
                </View>
              </View>
            </View>
          </Modal>
          {watchlistLoading ? (
            <ActivityIndicator size="large" color="#2e7d32" style={{ marginTop: 32 }} />
          ) : (
            <FlatList
              data={watchlist}
              keyExtractor={item => item.id}
              renderItem={({ item }) => {
                const ticker = item.ticker.toUpperCase();
                const priceInfo = watchlistPrices[ticker];
                return (
                  <View style={styles.stockRow}>
                    <View style={{ flex: 2 }}>
                      <Text style={styles.ticker}>{item.ticker}</Text>
                      <Text style={styles.companyName}>{item.company_name}</Text>
                    </View>
                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                      {priceInfo ? (
                        priceInfo.loading ? (
                          <ActivityIndicator size="small" color="#1565c0" style={{ marginBottom: 2 }} />
                        ) : priceInfo.error ? (
                          <Text style={{ color: '#c62828', fontSize: 10, marginBottom: 2 }}>Err: {priceInfo.error}</Text>
                        ) : (
                          <Text style={{ color: '#2e7d32', fontSize: 10, marginBottom: 2 }}>
                            Current: ${priceInfo.price} {priceInfo.currency || ''}
                          </Text>
                        )
                      ) : null}
                    </View>
                    <TouchableOpacity 
                      onPress={() => setSelectedWatchlistToRemove(item)}
                      style={styles.deleteButton}
                    >
                      <Icon name="delete" size={16} color="#c62828" />
                    </TouchableOpacity>

                  </View>
                );
              }}
              style={{ marginTop: 24, width: '100%' }}
            />
          )}
          {/* Remove modal */}
          <Modal
            visible={!!selectedWatchlistToRemove}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setSelectedWatchlistToRemove(null)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Remove from Watchlist</Text>
                {selectedWatchlistToRemove && (
                  <>
                    <Text style={{ fontWeight: 'bold', fontSize: 16 }}>{selectedWatchlistToRemove.ticker}</Text>
                    <Text style={{ fontSize: 13, color: '#555' }}>{selectedWatchlistToRemove.company_name}</Text>
                  </>
                )}
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 }}>
                  <Button title="Cancel" onPress={() => setSelectedWatchlistToRemove(null)} color="#888" />
                  <View style={{ width: 12 }} />
                  <Button
                    title={removeWatchlistLoading ? 'Removing...' : 'Remove'}
                    color="#c62828"
                    onPress={() => selectedWatchlistToRemove && handleRemoveWatchlist(selectedWatchlistToRemove)}
                    disabled={removeWatchlistLoading}
                  />
                </View>
              </View>
            </View>
          </Modal>
        </>
      )}
    </View>
  </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#2e7d32',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTabButton: {
    borderBottomColor: 'white',
  },
  tabText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '500',
  },
  activeTabText: {
    color: 'white',
    fontWeight: '600',
  },
  contentContainer: {
    flex: 1,
    width: '100%',
    padding: 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 8,
    backgroundColor: '#fff',
    fontSize: 12,
  },
  suggestionsBox: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    marginTop: 2,
    zIndex: 10,
    position: 'absolute',
    width: '100%',
  },
  suggestion: {
    padding: 6,
    fontSize: 11,
  },
  stockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  ticker: {
    fontWeight: 'bold',
    fontSize: 12,
  },
  quantity: {
    fontSize: 10,
    textAlign: 'center',
    alignSelf: 'center',
    width: 60,
  },
  price: {
    fontSize: 10,
    color: '#1565c0',
    alignSelf: 'flex-end',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 18,
    width: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#2e7d32',
    alignSelf: 'center',
  },
  companyName: {
    fontSize: 9,
    color: '#555',
    marginTop: 2,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  addButton: {
    flex: 1,
    backgroundColor: '#2e7d32',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 6,
    elevation: 2,
    shadowColor: '#2e7d32',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    flexDirection: 'row',
    justifyContent: 'center',
    minHeight: 40,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
    letterSpacing: 0.3,
    marginLeft: 4,
  },
  removeButton: {
    flex: 1,
    backgroundColor: '#e53935',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginLeft: 6,
    elevation: 2,
    shadowColor: '#e53935',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    flexDirection: 'row',
    justifyContent: 'center',
    minHeight: 40,
  },
  removeButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
    letterSpacing: 0.3,
    marginLeft: 4,
  },
  centeredQtyCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ffebee',
  },
  deleteButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ffebee',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
});

export default PortfolioScreen; 