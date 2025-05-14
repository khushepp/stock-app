# Background and Motivation
- The app currently has a placeholder `NewsScreen` in the frontend, but does not fetch or display real news.
- The goal is to fetch the latest market news from Finnhub ([API docs](https://finnhub.io/docs/api/market-news)) and display it in the News section of the app.
- No Finnhub integration or API key management is present in the codebase yet.
- The backend is a NestJS server, and the frontend is a React Native app.

# Key Challenges and Analysis
- **API Key Management:** Finnhub requires an API key. This must be securely stored (ideally in a `.env` file on the backend).
- **Backend Integration:** The backend should fetch news from Finnhub and expose it via a new API endpoint (e.g., `/api/news`).
- **Frontend Integration:** The frontend should call this endpoint and display the news in the `NewsScreen`.
- **Error Handling:** Handle API errors, rate limits, and empty news gracefully.
- **Testing:** Add backend and frontend tests to ensure news is fetched and displayed correctly.
- **Security:** Do not expose the Finnhub API key to the frontend.

# High-level Task Breakdown

## Backend Tasks
1. **Add Finnhub API Key Management**
   - Store the Finnhub API key in a `.env` file (or similar secure config).
   - Load the key in the backend using a config library (e.g., `dotenv`).
2. **Implement Finnhub News Fetching Service**
   - Create a service/class to fetch latest market news from Finnhub using their API.
   - Endpoint: `GET https://finnhub.io/api/v1/news?category=general&token=API_KEY`
3. **Expose News Endpoint**
   - Add a new route/controller method (e.g., `GET /api/news`) that returns the latest news (JSON).
   - Add error handling for failed API calls or rate limits.
4. **Backend Unit/Integration Tests**
   - Test the news fetching service and endpoint for success and failure cases.

## Frontend Tasks
5. **Fetch News from Backend**
   - Update `NewsScreen.tsx` to fetch news from the backend `/api/news` endpoint.
   - Show loading, error, and empty states.
6. **Display News List**
   - Render a scrollable list of news articles with title, summary, source, and published date.
   - Each item should be tappable to open the full article in a webview or browser.
7. **Frontend UI/UX Improvements**
   - Style the news list for clarity and usability.
   - Add pull-to-refresh if feasible.
8. **Frontend Tests**
   - Add tests to ensure news is fetched and rendered correctly.

## Project Management
9. **Update Documentation**
   - Document the new environment variable and endpoint in the README.
10. **Manual Testing & User Feedback**
    - Verify the news section works end-to-end and is robust to API failures.

# Success Criteria
- [ ] Finnhub API key is securely managed and not exposed to the frontend.
- [ ] Backend `/api/news` endpoint returns latest news from Finnhub.
- [ ] NewsScreen fetches and displays news articles with proper UI/UX.
- [ ] Errors and empty states are handled gracefully.
- [ ] Tests cover both backend and frontend logic for news fetching and display.
- [ ] Documentation is updated.

# Project Status Board
- [x] Add Finnhub API key to backend config
- [x] Implement Finnhub news fetching service in backend
- [x] Expose `/api/news` endpoint in backend
- [x] Add backend tests for news fetching
- [x] Update frontend to fetch news from backend
- [x] Display news in NewsScreen with proper UI (in progress)
- [ ] Add frontend tests for news display
- [ ] Update documentation
- [ ] Manual end-to-end test and user feedback

# Executor's Feedback or Assistance Requests
- Frontend now fetches and displays news from backend. Next: finalize UI and add frontend tests.

# Lessons
- Use `dotenv` to securely load environment variables in NestJS backend.
- Use `axios` for HTTP requests to external APIs like Finnhub.
- Expose new endpoints with clear error handling and response structure.
- Place e2e tests in the `test/` directory and use `supertest` for HTTP endpoint testing.
- Use React Native `FlatList` for efficient list rendering and handle loading, error, and empty states for robust UX.
