## Project Status Board

- [x] 1.1 Confirm backend `/api/stock-details` endpoint supports fetching current price for a single ticker (✅ Done)
- [x] 1.2 (Optional) Consider batch endpoint for multiple tickers (Not required for now)
- [x] 2.1 On portfolio load, extract all unique tickers
- [x] 2.2 For each ticker, call backend API to fetch current price
- [x] 2.3 Store current prices in state
- [x] 2.4 Handle loading/error states for price fetching
- [x] 3.1 Update FlatList to show current price for each stock
- [x] 3.2 Show loading indicator/placeholder while fetching
- [x] 3.3 Show error message if price fetch fails
- [x] 4.1 Test with various portfolio sizes and error cases
- [x] 1.1 Confirm or create a `transactions` table in Supabase with all portfolio fields plus sale details (renamed and expanded from `sales`).
- [x] 2.1 When a stock is selected for sale, open a modal to input quantity sold and price per stock.
- [x] 2.2 Validate input (quantity ≤ owned, price > 0).
- [x] 3.1 On confirmation, insert a new transaction record into the `transactions` table with all portfolio and sale details.
- [x] 3.2 Update the portfolio: subtract sold quantity from shares, or remove entry if all sold.
- [x] 3.3 Handle errors and show feedback to the user.
- [ ] 4.1 Test partial and full sales, invalid input, and error handling.

---

# New Feature: Sell Stock with Quantity and Price Input

## Background and Motivation
Currently, selling a stock removes the entire holding. The new flow will prompt for quantity and price, record the sale in the database, and update the portfolio accordingly.

## High-level Task Breakdown
- [ ] 2.1 When a stock is selected for sale, open a modal to input quantity sold and price per stock.
- [ ] 2.2 Validate input (quantity ≤ owned, price > 0).
- [ ] 3.1 On confirmation, insert a new transaction record into the `transactions` table with all portfolio and sale details.
- [ ] 3.2 Update the portfolio: subtract sold quantity from shares, or remove entry if all sold.
- [ ] 3.3 Handle errors and show feedback to the user.
- [ ] 4.1 Test partial and full sales, invalid input, and error handling.

---

## Executor's Feedback or Assistance Requests
- Previous project (current price integration) is complete.
- Task 1.1 complete: `transactions` table (with all portfolio and sale fields) is ready in Supabase.
- Next: Update frontend to insert all portfolio details plus sale details into transactions on sale.
- Tasks 3.1, 3.2, 3.3 complete: Sale now records all details in transactions and updates/removes portfolio as needed.
- Next: Test partial and full sales, invalid input, and error handling (Task 4.1). Please verify in the app and let me know if you encounter any issues.
