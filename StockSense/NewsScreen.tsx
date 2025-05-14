import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList, TouchableOpacity, Linking, RefreshControl, Image, SafeAreaView } from 'react-native';

const BACKEND_URL = 'http://10.0.2.2:3000/api/stock-details/news'; // Android emulator uses 10.0.2.2 to access host machine

const NewsScreen = () => {
  const [news, setNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [category, setCategory] = useState('business'); // Default category

  const fetchNews = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${BACKEND_URL}?category=${category}`);
      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
        setNews([]);
      } else {
        setNews(data.news || []);
        console.log('Fetched news:', data.news?.length || 0, 'items');
      }
    } catch (err) {
      console.error('News fetch error:', err);
      setError('Failed to fetch news. Please check your connection.');
      setNews([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchNews();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNews();
    setRefreshing(false);
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity onPress={() => item.url && Linking.openURL(item.url)} style={styles.newsItem}>
      {item.image && (
        <Image 
          source={{ uri: item.image }} 
          style={styles.newsImage} 
          resizeMode="cover"
        />
      )}
      <Text style={styles.newsTitle}>{item.headline || item.title}</Text>
      {item.summary ? <Text style={styles.newsSummary}>{item.summary}</Text> : null}
      <View style={styles.newsMeta}>
        <Text style={styles.newsSource}>{item.source}</Text>
        <Text style={styles.newsDate}>{item.datetime ? new Date(item.datetime * 1000).toLocaleString() : ''}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.container}><ActivityIndicator size="large" color="#2e7d32" /></View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}><Text style={{ color: 'red' }}>{error}</Text></View>
    );
  }

  if (!news.length) {
    return (
      <View style={styles.container}><Text>No news available.</Text></View>
    );
  }

  return (
    <SafeAreaView style={styles.listContainer}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Financial News</Text>
      </View>
      <FlatList
        data={news}
        keyExtractor={(item, idx) => item.id ? String(item.id) : String(idx)}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  listContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  listContent: {
    padding: 12,
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
  newsImage: {
    width: '100%',
    height: 180,
    borderRadius: 6,
    marginBottom: 10,
  },
  newsItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  newsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 4,
  },
  newsSummary: {
    fontSize: 15,
    color: '#333',
    marginBottom: 6,
  },
  newsMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  newsSource: {
    fontSize: 13,
    color: '#888',
  },
  newsDate: {
    fontSize: 13,
    color: '#888',
  },
});

export default NewsScreen; 