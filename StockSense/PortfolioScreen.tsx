import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, Button, FlatList, TouchableOpacity, ActivityIndicator, Modal, ScrollView } from 'react-native';
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

  return (
  <View style={styles.container}>
      <Text style={styles.header}>Your Portfolio</Text>
      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
          <Text style={styles.addButtonText}>ADD PURCHASED STOCK</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.removeButton} onPress={() => setRemoveModalVisible(true)}>
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
  </View>
);
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#f5f5f5',
  },
  header: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 16,
    alignSelf: 'center',
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
    padding: 7,
    backgroundColor: '#e8f5e9',
    borderRadius: 6,
    marginBottom: 4,
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
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    minHeight: 32,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  removeButton: {
    flex: 1,
    backgroundColor: '#c62828',
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
    marginLeft: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    minHeight: 32,
  },
  removeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  centeredQtyCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default PortfolioScreen; 