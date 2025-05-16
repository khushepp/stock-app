import React from 'react';
import { useStockContext } from '../context/StockContext';
import { Stock } from '../types/stock';
import { Modal, TouchableOpacity, View, Text, ScrollView, StyleSheet } from 'react-native';

const StockDetailsOverlay: React.FC = () => {
  const { selectedStock, isOpen, hideStockDetails } = useStockContext();

  if (!selectedStock || !isOpen) return null;

  return (
    <Modal
      visible={isOpen}
      transparent={true}
      animationType="slide"
      onRequestClose={hideStockDetails}
    >
      <TouchableOpacity 
        style={styles.modalOverlay} 
        activeOpacity={1}
        onPress={hideStockDetails}
      >
        <View 
          style={styles.modalContent}
          onStartShouldSetResponder={() => true}
        >
          <View style={styles.header}>
            <View>
              <Text style={styles.stockName}>{selectedStock.name}</Text>
              <Text style={styles.stockSymbol}>{selectedStock.symbol}</Text>
            </View>
            <TouchableOpacity 
              onPress={hideStockDetails}
              style={styles.closeButton}
              hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
            >
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.content}>
            <View style={styles.priceContainer}>
              <Text style={styles.price}>
                ${selectedStock.currentPrice.toFixed(2)}
              </Text>
              <Text 
                style={[
                  styles.priceChange,
                  selectedStock.change >= 0 ? styles.positiveChange : styles.negativeChange
                ]}
              >
                {selectedStock.change >= 0 ? '+' : ''}{selectedStock.change.toFixed(2)} 
                ({selectedStock.changePercent.toFixed(2)}%)
              </Text>
            </View>
            
            <View style={styles.detailsGrid}>
              <View style={styles.detailRow}>
                <DetailItem label="Open" value={selectedStock.currentPrice.toFixed(2)} />
                <DetailItem label="High" value={(selectedStock.currentPrice * 1.02).toFixed(2)} />
              </View>
              <View style={styles.detailRow}>
                <DetailItem label="Low" value={(selectedStock.currentPrice * 0.98).toFixed(2)} />
                <DetailItem label="Volume" value="1.2M" />
              </View>
            </View>
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

// Helper component for detail items
const DetailItem = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.detailItem}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
    maxHeight: '90%',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  stockName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
  },
  stockSymbol: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  closeButton: {
    padding: 5,
  },
  closeButtonText: {
    fontSize: 28,
    color: '#666',
    lineHeight: 28,
  },
  content: {
    flex: 1,
  },
  priceContainer: {
    marginBottom: 20,
  },
  price: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000',
  },
  priceChange: {
    fontSize: 18,
    marginTop: 4,
  },
  positiveChange: {
    color: '#2e7d32',
  },
  negativeChange: {
    color: '#c62828',
  },
  detailsGrid: {
    marginTop: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  detailItem: {
    width: '48%',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
});

export default StockDetailsOverlay;
