# Background and Motivation
The user wants to display small, real-time charts for NASDAQ, S&P 500, and Dow Jones at the top of the HomeScreen in the React Native app. The backend now provides index values, but the user wants to use TradingView Lightweight Charts for a more visual, interactive experience. This aligns with the PRD's focus on a modern financial dashboard and real-time data.

# Key Challenges and Analysis
- TradingView Lightweight Charts is a web-based library and does not natively support React Native. The most common approach is to use a WebView to embed the chart, as discussed in the [official TradingView repo](https://github.com/tradingview/lightweight-charts/discussions/733).
- We need to fetch historical data for each index (not just the latest value) to render a chart. The backend may need to be extended to provide this data.
- The UI must fit three small charts horizontally or in a scrollable row at the top of the HomeScreen.
- Communication between React Native and the WebView (for dynamic data updates) must be considered.

# High-level Task Breakdown
- [ ] 1. Extend backend to provide historical data (e.g., last 7 days or 1 month) for ^IXIC, ^GSPC, ^DJI.
    - Success: GET /api/stock-details/indices-history returns time series for all three indices.
- [ ] 2. Create a minimal HTML/JS file that renders a TradingView Lightweight Chart for a given index, accepting data via props or postMessage.
    - Success: Chart renders in browser with sample data.
- [ ] 3. Integrate a WebView in React Native to display the chart for each index, passing data from the backend.
    - Success: Each index chart is visible at the top of HomeScreen, showing correct data.
- [ ] 4. Style the charts to fit nicely (side-by-side or scrollable row), with index name and current value.
    - Success: UI is visually appealing and responsive.
- [ ] 5. (Optional) Add loading/error states and refresh logic for the charts.
    - Success: User sees loading indicator or error if data is unavailable.

# Project Status Board
- [ ] Extend backend for index historical data
- [ ] Create HTML/JS for TradingView chart
- [ ] Integrate WebView in React Native
- [ ] Style and finalize UI
- [ ] Add loading/error states

# Executor's Feedback or Assistance Requests
- None yet

# Lessons
- TradingView Lightweight Charts can be used in React Native via WebView with a local HTML file ([reference](https://github.com/tradingview/lightweight-charts/discussions/733)).
- Backend must provide time series data, not just latest value, for charting.
