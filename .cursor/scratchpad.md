# Portfolio News Feature

## Background and Motivation
- Current implementation shows general market news
- Need to add portfolio-specific news section
- Will use Finnhub API to fetch news for user's portfolio stocks
- News will be divided into two sections: Portfolio News and Market News

## Key Challenges and Analysis
1. Backend Modifications
   - Need to add endpoint for fetching portfolio news
   - Need to handle multiple stock symbols in a single request
   - Finnhub API handles date filtering natively

2. Frontend Modifications
   - Need to modify NewsScreen to show two sections
   - Need to fetch portfolio stocks from Supabase
   - Need to fetch and display portfolio news
   - Need to maintain existing market news functionality

3. Data Management
   - Portfolio data is stored in Supabase 'portfolio' table
   - Each portfolio item has: id, user_id, ticker, shares, buy_price, company_name
   - Need to handle potential rate limiting from Finnhub API
   - Consider caching strategies for news data

## High-level Task Breakdown

### Backend Tasks
1. Add new endpoint `/api/stock-details/portfolio-news`
   - Accept portfolio stock symbols as query parameter
   - Fetch news for each symbol from Finnhub
   - Use Finnhub's native date filtering (from=, to= parameters)
   - Return aggregated news data

2. Update existing news endpoint
   - Maintain existing functionality
   - Consider adding optional date range filtering

### Frontend Tasks
1. Modify NewsScreen component
   - Add portfolio news section
   - Fetch portfolio stocks from Supabase using user_id
   - Make API call to portfolio news endpoint
   - Display news in two sections
   - Maintain existing market news functionality

2. Add loading states and error handling
   - Separate loading states for portfolio and market news
   - Error handling for portfolio news API calls
   - Refresh functionality for both sections

3. UI Improvements
   - Clear visual separation between portfolio and market news
   - Add section headers
   - Maintain consistent news item layout

## Project Status Board
- [ ] Backend: Portfolio news endpoint
- [ ] Backend: Date range filtering
- [ ] Frontend: Portfolio news section
- [ ] Frontend: Data fetching and display
- [ ] Frontend: UI improvements
- [ ] Testing and validation

## Executor’s Feedback or Assistance Requests
- Need to verify Finnhub API rate limits
- Finnhub API handles date filtering natively (from=, to= parameters)

## Lessons
- Always check API rate limits before implementation
- Consider caching strategies for news data
- Handle edge cases for empty portfolio