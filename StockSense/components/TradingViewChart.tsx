import React, { useRef, useEffect, useCallback } from 'react';
import { View, StyleSheet, Platform, useWindowDimensions, Text, ActivityIndicator } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import type { DimensionValue } from 'react-native';

export interface CandleData {
  time: string; // Format: YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface TradingViewChartProps {
  symbol: string;
  data?: CandleData[];
  isLoading?: boolean;
  error?: string | null;
  height?: DimensionValue;
  width?: DimensionValue;
}

const TradingViewChart: React.FC<TradingViewChartProps> = ({
  symbol,
  data,
  isLoading = false,
  error: propError = null,
  height = 300,
  width = '100%',
}) => {
  const [webViewError, setWebViewError] = React.useState<string | null>(null);
  const error = webViewError || propError;
  const webViewRef = useRef<WebView>(null);
  const { width: screenWidth } = useWindowDimensions();
  const chartId = `chart-${symbol}-${Date.now()}`;

  const generateChartHtml = useCallback(() => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <script src="https://unpkg.com/lightweight-charts@3.8.0/dist/lightweight-charts.standalone.production.js"></script>
        <style>
          body, html {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            overflow: hidden;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
          }
          #chart-container {
            width: 100%;
            height: 100%;
            position: relative;
          }
          #error-message {
            display: none;
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(255, 0, 0, 0.1);
            padding: 10px 20px;
            border-radius: 5px;
            color: #f44336;
            text-align: center;
            z-index: 1000;
            max-width: 90%;
            word-wrap: break-word;
          }
          #loading-message {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: #666;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div id="chart-container">
          <div id="loading-message">Loading chart data...</div>
          <div id="error-message"></div>
          <div id="chart" style="width:100%; height:100%;"></div>
        </div>
        <script>
          // Make chart globally available for debugging
          window.chart = null;
          let candleSeries = null;
          let isInitialized = false;
          
          function logToConsole(message) {
            console.log('[WebView]', message);
            // Uncomment to send logs back to React Native
            // window.ReactNativeWebView.postMessage(JSON.stringify({
            //   type: 'LOG',
            //   message: message
            // }));
          }
          
          function showError(message) {
            logToConsole('Error: ' + message);
            const errorEl = document.getElementById('error-message');
            if (errorEl) {
              errorEl.textContent = String(message).substring(0, 200);
              errorEl.style.display = 'block';
            }
            
            const loadingEl = document.getElementById('loading-message');
            if (loadingEl) loadingEl.style.display = 'none';
            
            setTimeout(() => {
              if (errorEl) errorEl.style.display = 'none';
            }, 5000);
          }
          
          function initializeChart() {
            if (isInitialized) {
              logToConsole('Chart already initialized');
              return true;
            }
            
            try {
              logToConsole('Initializing chart...');
              const container = document.getElementById('chart');
              
              if (!container) {
                throw new Error('Chart container not found');
              }
              
              // Clear any existing chart
              container.innerHTML = '';
              
              // Initialize chart
              window.chart = LightweightCharts.createChart(container, {
                width: container.clientWidth,
                height: container.clientHeight,
                layout: {
                  backgroundColor: '#ffffff',
                  textColor: '#333',
                  fontSize: 12,
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif',
                },
                grid: {
                  vertLines: {
                    color: 'rgba(197, 203, 206, 0.1)',
                  },
                  horzLines: {
                    color: 'rgba(197, 203, 206, 0.1)',
                  },
                },
                crosshair: {
                  mode: LightweightCharts.CrosshairMode.Normal,
                },
                timeScale: {
                  timeVisible: true,
                  secondsVisible: false,
                  borderColor: 'rgba(197, 203, 206, 0.8)',
                },
                rightPriceScale: {
                  borderColor: 'rgba(197, 203, 206, 0.8)',
                },
              });
              
              // Add candlestick series
              candleSeries = window.chart.addCandlestickSeries({
                upColor: '#26a69a',
                downColor: '#ef5350',
                borderVisible: false,
                wickUpColor: '#26a69a',
                wickDownColor: '#ef5350',
              });
              
              // Handle window resize
              const resizeObserver = new ResizeObserver(entries => {
                if (!window.chart) return;
                
                for (let entry of entries) {
                  try {
                    const { width, height } = entry.contentRect;
                    logToConsole('Resizing chart to ' + width + 'x' + height);
                    window.chart.applyOptions({ width, height });
                    window.chart.timeScale().fitContent();
                  } catch (err) {
                    showError('Error resizing chart: ' + err.message);
                  }
                }
              });
              
              resizeObserver.observe(container);
              
              isInitialized = true;
              logToConsole('Chart initialized successfully');
              
              // Hide loading message
              const loadingEl = document.getElementById('loading-message');
              if (loadingEl) loadingEl.style.display = 'none';
              
              return true;
              
            } catch (error) {
              showError('Failed to initialize chart: ' + error.message);
              return false;
            }
          }
          
          // Initialize chart when the page loads
          document.addEventListener('DOMContentLoaded', () => {
            logToConsole('DOM content loaded');
            initializeChart();
            
            // Notify React Native that the WebView is ready
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ 
                type: 'WEBVIEW_READY',
                message: 'WebView initialized successfully' 
              }));
            } else {
              logToConsole('ReactNativeWebView not available');
            }
          });
          
          // Handle messages from React Native
          window.addEventListener('message', function(event) {
            try {
              logToConsole('Received message from React Native');
              
              if (!window.chart) {
                logToConsole('Chart not initialized, initializing...');
                if (!initializeChart()) {
                  throw new Error('Failed to initialize chart');
                }
              }
              
              let message;
              try {
                message = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
              } catch (e) {
                throw new Error('Invalid message format: ' + e.message);
              }
              
              if (message && message.type === 'UPDATE_DATA' && message.data) {
                logToConsole('Updating chart with ' + message.data.length + ' data points');
                
                // Validate data format
                if (!Array.isArray(message.data)) {
                  throw new Error('Expected data to be an array');
                }
                
                if (message.data.length === 0) {
                  throw new Error('No data points received');
                }
                
                // Validate first data point
                const firstPoint = message.data[0];
                const requiredFields = ['time', 'open', 'high', 'low', 'close'];
                const missingFields = requiredFields.filter(field => !(field in firstPoint));
                
                if (missingFields.length > 0) {
                  throw new Error('Missing required fields in data: ' + missingFields.join(', '));
                }
                
                // Update chart data
                candleSeries.setData(message.data);
                window.chart.timeScale().fitContent();
                
                // Hide loading message
                const loadingEl = document.getElementById('loading-message');
                if (loadingEl) loadingEl.style.display = 'none';
                
                logToConsole('Chart data updated successfully');
              }
              
            } catch (error) {
              showError('Error processing message: ' + error.message);
            }
          });
        </script>
        </script>
      </body>
      </html>
    `;
  }, [symbol]);

  // Function to send data to WebView
  const sendChartData = useCallback(() => {
    if (!webViewRef.current || !data || data.length === 0) {
      console.log('Not sending data - WebView not ready or no data');
      return;
    }
    
    try {
      console.log(`Sending ${data.length} data points to WebView`);
      
      // Create a clean data object with only the required fields
      const chartData = data.map(item => ({
        time: item.time,
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
        volume: item.volume
      }));
      
      const message = {
        type: 'UPDATE_DATA',
        data: chartData
      };
      
      // Send message to WebView
      webViewRef.current.injectJavaScript(`
        (function() {
          try {
            window.postMessage(${JSON.stringify(message)}, '*');
            true;
          } catch (error) {
            console.error('Error in injected JavaScript:', error);
            false;
          }
        })();
      `);
      
    } catch (error) {
      console.error('Error preparing chart data:', error);
    }
  }, [data]);
  
  // Handle WebView messages
  const onMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const message = typeof event.nativeEvent.data === 'string' 
        ? JSON.parse(event.nativeEvent.data) 
        : event.nativeEvent.data;
      
      console.log('Message from WebView:', message);
      
      if (message && message.type === 'WEBVIEW_READY') {
        console.log('WebView is ready, sending initial data');
        // Use setTimeout to ensure the chart is fully initialized
        setTimeout(sendChartData, 100);
      } else if (message && message.type === 'LOG') {
        console.log('WebView Log:', message.message);
      }
    } catch (error) {
      console.error('Error parsing WebView message:', error, 'Raw data:', event.nativeEvent.data);
    }
  }, [sendChartData]);
  
  // Send data when WebView is ready or when data changes
  useEffect(() => {
    if (webViewRef.current && data && data.length > 0) {
      sendChartData();
    }
  }, [data, sendChartData]);

  // Show loading state
  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent, { width, height }]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading chart data...</Text>
      </View>
    );
  }

  // Show error state
  if (error) {
    return (
      <View style={[styles.container, styles.centerContent, { width, height }]}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { width, height }]}>
      <WebView
        ref={webViewRef}
        source={{ html: generateChartHtml() }}
        style={styles.webview}
        onMessage={onMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        originWhitelist={['*']}
        allowsInlineMediaPlayback={true}
        allowsFullscreenVideo={false}
        mediaPlaybackRequiresUserAction={false}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading chart...</Text>
          </View>
        )}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          const errorMessage = `WebView error: ${nativeEvent.description || 'Unknown error'}`;
          console.error(errorMessage, nativeEvent);
          setWebViewError(errorMessage);
        }}
        onHttpError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          const errorMessage = `WebView HTTP error: ${nativeEvent.statusCode || 'Unknown status'}`;
          console.warn(errorMessage);
          setWebViewError(errorMessage);
        }}
        onContentProcessDidTerminate={() => {
          console.log('WebView content process terminated, reloading...');
          webViewRef.current?.reload();
        }}
      />
      {webViewError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            {webViewError}
          </Text>
          <Text 
            style={styles.retryText}
            onPress={() => {
              setWebViewError(null);
              webViewRef.current?.reload();
            }}
          >
            Tap to retry
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: 300, // Default height, can be adjusted
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
  errorContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  errorText: {
    color: '#f44336',
    textAlign: 'center',
    fontSize: 14,
    marginBottom: 10,
  },
  retryText: {
    color: '#007AFF',
    fontWeight: 'bold',
    textDecorationLine: 'underline',
    marginTop: 10,
  },
});

export default TradingViewChart;
