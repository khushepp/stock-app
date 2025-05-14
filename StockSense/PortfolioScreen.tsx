import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const PortfolioScreen = () => (
  <View style={styles.container}>
    <Text style={styles.text}>Portfolio Screen</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2e7d32',
  },
});

export default PortfolioScreen; 