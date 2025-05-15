# Background and Motivation
The user wants to add a watchlist feature to the app, allowing users to input stocks they are interested in (but do not own). This watchlist should:
- Allow users to add stocks by ticker and company name (no quantity or price input)
- Display ticker, name, and current price for each watchlist item
- Allow users to switch between portfolio and watchlist sections from the top of the page, both following the same styling

# Key Challenges and Analysis
- No existing code for watchlist in the frontend or backend
- Need to create a new Supabase table for watchlist (with only id, user_id, ticker, company_name, date_added)
- UI/UX: Must match the portfolio section and allow easy switching
- Code reuse: PortfolioScreen logic for suggestions, price fetching, and styling should be reused for watchlist
- Navigation: Should be intuitive and not disrupt existing flows
- Test coverage: Need to ensure both portfolio and watchlist are tested

# High-level Task Breakdown

## 1. Database
- [ ] Create a new Supabase table `watchlist` with fields: id, user_id, ticker, company_name, date_added (no quantity or price)
  - Success: Table exists and can be queried/inserted from Supabase dashboard

## 2. Data Model & API
- [ ] Define TypeScript interface for watchlist item (id, user_id, ticker, company_name, date_added)
  - Success: Interface is used in code and type checks pass

## 3. UI/UX & Navigation
- [ ] Update PortfolioScreen to add a toggle (e.g. segmented control or tabs) at the top to switch between Portfolio and Watchlist
  - Success: User can switch between sections, UI matches existing style
- [ ] Create Watchlist section/component that:
  - [ ] Allows adding a stock by ticker (with autocomplete and company name, reusing suggestion logic)
  - [ ] Displays watchlist as a list: ticker, company name, current price (no quantity/price input or display)
  - [ ] Allows removing a stock from watchlist
  - Success: All UI/UX matches portfolio section, but with watchlist logic

## 4. Logic & State Management
- [ ] Fetch watchlist from Supabase for the logged-in user
- [ ] Add stock to watchlist (insert into Supabase)
- [ ] Remove stock from watchlist (delete from Supabase)
- [ ] Fetch and display current price for each watchlist stock (reuse price logic)
  - Success: All CRUD operations work, prices display correctly

## 5. Testing
- [ ] Write tests for watchlist add/remove/display logic
- [ ] Manually test switching, adding, removing, and price display for both sections
  - Success: All tests pass, manual QA confirms correct behavior

# Project Status Board
- [x] Database: watchlist table created
- [x] Data model/interface defined
- [x] UI toggle for Portfolio/Watchlist
- [x] Watchlist add/display/remove logic
- [ ] Price fetching for watchlist
- [ ] Tests and manual QA

# Executor's Feedback or Assistance Requests
- The watchlist table was created in Supabase with fields: id (uuid, PK), user_id (uuid), ticker (text), company_name (text), date_added (timestamptz).
- No foreign key constraint to a users table was added, as there is no users table in the current DB schema. user_id is stored as uuid only.
- The WatchlistItem TypeScript interface was added to PortfolioScreen.tsx, matching the DB schema.
- The UI toggle for switching between Portfolio and Watchlist is implemented at the top of PortfolioScreen. The Watchlist section is now implemented: users can add stocks (with suggestions), display their watchlist (ticker, name, current price), and remove stocks, all matching the Portfolio section's style.

# Lessons
- Read the file before you try to edit it.
- If there are vulnerabilities that appear in the terminal, run npm audit before proceeding
- Always ask before using the -force git command
- Include info useful for debugging in the program output.
