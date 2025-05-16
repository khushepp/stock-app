import { createContext, useContext, useState } from 'react';
import { Stock } from '../types/stock';

interface StockContextType {
  selectedStock: Stock | null;
  isOpen: boolean;
  showStockDetails: (stock: Stock) => void;
  hideStockDetails: () => void;
}

const StockContext = createContext<StockContextType | undefined>(undefined);

export const StockProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const showStockDetails = (stock: Stock) => {
    setSelectedStock(stock);
    setIsOpen(true);
  };

  const hideStockDetails = () => {
    setIsOpen(false);
    // Small delay before clearing the stock to allow for exit animation
    setTimeout(() => setSelectedStock(null), 300);
  };

  return (
    <StockContext.Provider value={{ selectedStock, isOpen, showStockDetails, hideStockDetails }}>
      {children}
    </StockContext.Provider>
  );
};

export const useStockContext = () => {
  const context = useContext(StockContext);
  if (context === undefined) {
    throw new Error('useStockContext must be used within a StockProvider');
  }
  return context;
};
