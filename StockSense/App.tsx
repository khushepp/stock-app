/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, Button, StyleSheet, TextInput, Alert, ActivityIndicator, TouchableOpacity, Image, ScrollView } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'node-libs-react-native/globals';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import NewsScreen from './NewsScreen';
import PortfolioScreen from './PortfolioScreen';
import ProfileScreen from './ProfileScreen';
import AgentModeScreen from './AgentModeScreen';

// TODO: Replace with your Supabase project URL and anon key
const SUPABASE_URL = 'https://egmznvekiwvesxzcmwcq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnbXpudmVraXd2ZXN4emNtd2NxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcxMTQyMjgsImV4cCI6MjA2MjY5MDIyOH0.5VALCgaciPl0_BvdZyHKixlpFFLUvkT5zSEzskz0Rug';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function Logo() {
  return (
    <View style={{ alignItems: 'center', marginBottom: 32 }}>
      {/* Replace with your logo if available */}
      <Image source={{ uri: 'https://img.icons8.com/ios-filled/100/2e7d32/stocks.png' }} style={{ width: 64, height: 64, marginBottom: 8 }} />
      <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#2e7d32' }}>StockSense</Text>
    </View>
  );
}

function AuthButton({ title, onPress, loading }: { title: string; onPress: () => void; loading?: boolean }) {
  return (
    <TouchableOpacity style={styles.button} onPress={onPress} disabled={loading}>
      {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{title}</Text>}
    </TouchableOpacity>
  );
}

function LoginScreen({ navigation, onAuth }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    const { error, user } = await supabase.auth.signIn({ email, password });
    setLoading(false);
    if (error) {
      Alert.alert('Login Error', error.message);
    } else {
      Alert.alert('Success', 'Logged in successfully!');
      onAuth();
    }
  };

  return (
    <View style={styles.container}>
      <Logo />
      <Text style={styles.title}>Login</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        placeholderTextColor="#888"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        placeholderTextColor="#888"
      />
      <AuthButton title="Login" onPress={handleLogin} loading={loading} />
      <TouchableOpacity onPress={() => navigation.navigate('SignUp')} style={styles.linkContainer}>
        <Text style={styles.linkText}>Don't have an account? Sign Up</Text>
      </TouchableOpacity>
    </View>
  );
}

function SignUpScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      Alert.alert('Sign Up Error', error.message);
    } else {
      Alert.alert('Success', 'Sign up successful! Please check your email to confirm your account.');
      navigation.navigate('Login');
    }
  };

  return (
    <View style={styles.container}>
      <Logo />
      <Text style={styles.title}>Sign Up</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        placeholderTextColor="#888"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        placeholderTextColor="#888"
      />
      <AuthButton title="Sign Up" onPress={handleSignUp} loading={loading} />
      <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.linkContainer}>
        <Text style={styles.linkText}>Already have an account? Login</Text>
      </TouchableOpacity>
    </View>
  );
}

export function HomeScreen({ onLogout }: any) {
  const [ticker, setTicker] = useState('');
  const [stock, setStock] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceTimeout = React.useRef<any>(null);

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
      setError('Network error.');
    }
    setLoading(false);
  };

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
      const session = await supabase.auth.session();
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
    setStock(null);
    setError('');
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }
    debounceTimeout.current = setTimeout(() => {
      fetchSuggestions(text);
    }, 300);
  };

  const handleSuggestionSelect = (symbol: string) => {
    setTicker(symbol);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  return (
    <View style={styles.container}>
      <Logo />
      <Text style={styles.title}>Welcome!</Text>
      {/* Stock Ticker Input */}
      <TextInput
        style={styles.input}
        placeholder="Enter stock name"
        value={ticker}
        onChangeText={handleTickerChange}
        autoCapitalize="characters"
        placeholderTextColor="#888"
        onFocus={() => ticker.length >= 2 && suggestions.length > 0 && setShowSuggestions(true)}
      />
      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <View style={{ width: '90%', backgroundColor: '#fff', borderColor: '#bdbdbd', borderWidth: 1, borderRadius: 8, maxHeight: 180, marginBottom: 8, zIndex: 10 }}>
          {suggestionsLoading ? (
            <ActivityIndicator style={{ margin: 8 }} />
          ) : (
            <ScrollView style={{ maxHeight: 180 }}>
              {suggestions.map((s, idx) => (
                <TouchableOpacity key={s.symbol + idx} onPress={() => handleSuggestionSelect(s.symbol)} style={{ padding: 12, borderBottomWidth: idx !== suggestions.length - 1 ? 1 : 0, borderBottomColor: '#eee' }}>
                  <Text style={{ fontSize: 16 }}>{s.symbol} - {s.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      )}
      <TouchableOpacity style={styles.button} onPress={handleFetchStock} disabled={loading || !ticker}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Get Stock Details</Text>}
      </TouchableOpacity>
      {/* Display Stock Details or Error */}
      {error ? <Text style={{ color: 'red', marginVertical: 8 }}>{error}</Text> : null}
      {stock && (
        <View style={{ marginVertical: 12, alignItems: 'center' }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold' }}>{stock.symbol} - {stock.name}</Text>
          <Text style={{ fontSize: 18 }}>Price: {stock.price} {stock.currency}</Text>
        </View>
      )}
      <AuthButton title="Logout" onPress={onLogout} />
    </View>
  );
}

function MainTabs({ onLogout }: { onLogout: () => void }) {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Home">
        {props => <HomeScreen {...props} onLogout={onLogout} />}
      </Tab.Screen>
      <Tab.Screen name="News" component={NewsScreen} />
      <Tab.Screen name="Portfolio" component={PortfolioScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
      <Tab.Screen name="AgentMode" component={AgentModeScreen} options={{ title: 'Agent Mode' }} />
    </Tab.Navigator>
  );
}

function App(): React.JSX.Element {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on mount
    const getSession = async () => {
      const session = supabase.auth.session();
      setSession(session ?? null);
      setLoading(false);
    };
    getSession();

    // Listen for auth state changes
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => {
      listener?.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#2e7d32" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {session ? (
          <Stack.Screen name="MainTabs">
            {props => <MainTabs {...props} onLogout={handleLogout} />}
          </Stack.Screen>
        ) : (
          <>
            <Stack.Screen name="Login">
              {props => <LoginScreen {...props} onAuth={() => setSession(true)} />}
            </Stack.Screen>
            <Stack.Screen name="SignUp" component={SignUpScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 24,
    letterSpacing: 0.5,
  },
  hello: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  input: {
    width: '90%',
    height: 48,
    borderColor: '#bdbdbd',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 16,
    paddingHorizontal: 14,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  button: {
    width: '90%',
    backgroundColor: '#2e7d32',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  linkContainer: {
    marginTop: 8,
  },
  linkText: {
    color: '#2e7d32',
    fontSize: 16,
    textDecorationLine: 'underline',
    fontWeight: '500',
  },
});

export default App;
