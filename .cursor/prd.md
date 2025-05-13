<prd>

---

## **Product Requirements Document (PRD)**

**Product Name:** Sentiment-Based Portfolio Assistant
**Target Platform:** React Native (mobile)
**Backend:** NestJS
**Data Sources:** yFinance, FinBERT, Supabase
**Charting:** TradingView Lightweight Charts

---

### **Product Overview**

This mobile application allows users to manage their US stock portfolio and watchlist while leveraging AI-based sentiment analysis using FinBERT on financial news to recommend buy/sell/hold actions. The app also compares user transactions with known trading models to offer actionable feedback, helping users improve their trading strategies over time.

---

### **User Stories**

1. **Given** I am a new user, **when** I open the app, **then** I should be able to sign up using my email and password.
2. **Given** I have signed up, **when** I open the app again, **then** I should be able to log in securely.
3. **Given** I am logged in, **when** I visit my dashboard, **then** I should see my portfolio and watchlist.
4. **Given** I have no stocks added, **when** I open the dashboard, **then** I should see an option to add new stocks.
5. **Given** I add a stock, **when** I input a valid ticker symbol, **then** the app should fetch data from yFinance and show the latest price and chart.
6. **Given** I am viewing a stock, **when** I open the chart, **then** I should see a real-time line chart via TradingView.
7. **Given** a stock is added, **when** I view its details, **then** I should see sentiment analysis results based on news.
8. **Given** sentiment is negative, **when** the analysis is displayed, **then** I should see a recommendation to sell or hold.
9. **Given** sentiment is positive, **when** the analysis is displayed, **then** I should see a recommendation to buy or hold.
10. **Given** I have made a trade, **when** I input the transaction, **then** the app should store and analyze it.
11. **Given** trades are stored, **when** I view history, **then** I should see matching trading models.
12. **Given** model comparison is done, **when** results are shown, **then** I should see suggestions to improve my strategy.
13. **Given** I want to edit a stock, **when** I open the edit option, **then** I should be able to update stock quantity or price.
14. **Given** I want to remove a stock, **when** I press delete, **then** the stock should be removed from my portfolio.
15. **Given** I want to add to watchlist, **when** I select a stock, **then** I should see an option to watch without owning it.
16. **Given** I have a watchlist, **when** I open the watchlist, **then** I should see stock charts and sentiment only.
17. **Given** I have multiple stocks, **when** I open the dashboard, **then** I should see each stock's summary.
18. **Given** a stock changes significantly, **when** the app syncs, **then** I should get a notification if sentiment changes.
19. **Given** I forget my password, **when** I use the forgot password option, **then** I should get a reset link.
20. **Given** I want to logout, **when** I press logout, **then** I should be securely signed out.

---

### **User Flows**

#### **1. Onboarding Flow**

* Open App → Welcome Screen → Sign Up / Login → Supabase Auth → Redirect to Dashboard

#### **2. Portfolio Management Flow**

* Dashboard → Add Stock → Input Ticker → Fetch from yFinance → Store in Supabase → Display Stock Info + Chart

#### **3. Sentiment Analysis Flow**

* Select Stock → Backend fetches financial news → FinBERT processes sentiment → Backend returns sentiment + recommendation → Display in frontend

#### **4. Trade Entry and Model Comparison**

* Navigate to Trades → Add Transaction (buy/sell) → Save to Supabase → Backend runs model comparison → Return best-fit model → Display insights

#### **5. Charting Flow**

* Select Stock → yFinance data → Feed to TradingView Lightweight Chart component → Display chart

---

### **Screens and UI/UX**

| Screen         | Description                                      |
| -------------- | ------------------------------------------------ |
| Login/Signup   | Email/password form, integrates Supabase auth    |
| Dashboard      | Portfolio overview, Watchlist, Add Stock button  |
| Add/Edit Stock | Ticker input, quantity, price, action type       |
| Stock Details  | Price data, TradingView chart, sentiment results |
| Transactions   | List of trades with model-fit suggestions        |
| Settings       | Account settings, logout, password reset         |

**UI Style:**

* Dark mode default, modern financial dashboard theme
* Real-time cards and charts with sliding tabs
* Toasts for confirmations, modals for edits

---

### **Features and Functionality**

* User authentication via Supabase
* Portfolio CRUD operations
* Watchlist management
* yFinance integration for price data
* FinBERT-based news sentiment analysis
* TradingView charts
* Transaction tracking
* Trade-model matching algorithm
* Notification system (future roadmap)

---

### **Technical Architecture**

#### **Frontend: React Native**

* Cross-platform mobile
* Interfaces with backend using REST
* Displays charts with TradingView Lightweight Charts
* Uses Supabase client SDK for auth & DB ops

#### **Backend: NestJS**

* RESTful API server
* Fetches financial news and stock data
* Interfaces with FinBERT sentiment model
* Analyzes trades and compares with models

#### **External Services**

* **yFinance**: Real-time stock data (accessed via backend)
* **Supabase**: Auth, PostgreSQL, Realtime DB
* **TradingView Lightweight**: Chart rendering (frontend)

#### **Python Microservice (Optional)**

* Separate container/service to run FinBERT
* Communicates with NestJS via HTTP or message queue

---

### **System Design**

**Components:**

* React Native App
* NestJS Backend Server
* PostgreSQL via Supabase
* FinBERT Python Microservice
* External APIs: yFinance

**Data Flow:**
User Input → API → Fetch/Analyze → Supabase Store → Return to App

**Deployment Architecture:**

* React Native: Play Store / App Store
* NestJS + FinBERT: Dockerized on AWS ECS or Render
* Supabase: Cloud-managed

---

### **API Specifications**

| Endpoint                | Method | Description                 |
| ----------------------- | ------ | --------------------------- |
| `/auth/signup`          | POST   | Registers new user          |
| `/auth/login`           | POST   | Authenticates user          |
| `/portfolio/add`        | POST   | Adds a stock to portfolio   |
| `/portfolio/:id`        | GET    | Fetches details for a stock |
| `/sentiment/:ticker`    | GET    | Runs sentiment analysis     |
| `/chart/:ticker`        | GET    | Returns yFinance data       |
| `/transactions/add`     | POST   | Logs a trade                |
| `/transactions/analyze` | GET    | Matches trade with models   |
| `/watchlist/add`        | POST   | Adds stock to watchlist     |

All responses: `JSON` format
Auth via Supabase JWT token in headers

---

### **Data Model**

**Users**

* id (UUID)
* email
* password (hashed)
* created\_at

**Portfolio**

* id
* user\_id (FK)
* ticker
* shares
* buy\_price
* date\_added

**Transactions**

* id
* user\_id
* ticker
* shares
* action (buy/sell)
* price
* timestamp

**Sentiment Analysis**

* id
* ticker
* sentiment\_score (float)
* label (positive/negative/neutral)
* recommendation (buy/sell/hold)
* date\_fetched

**Watchlist**

* id
* user\_id
* ticker
* added\_at

---

### **Security Considerations**

* JWT-based auth via Supabase
* HTTPS enforced across API
* RBAC for user-level access to resources
* Secure storage of tokens and credentials
* Rate limiting and input sanitization on backend

---

### **Performance Requirements**

* Sentiment API response: < 1.5s
* Chart load time: < 1s
* Portfolio load on dashboard: < 2s for 20 stocks
* 95th percentile latency for API: < 500ms

---

### **Scalability Considerations**

* Supabase handles scaling of authentication and DB
* Backend supports horizontal scaling via container orchestration (Docker + ECS/Kubernetes)
* Caching layer (Redis or in-memory) for frequently accessed tickers
* Future migration to microservices for heavy modules (e.g., NLP, model analysis)

---

### **Testing Strategy**

* Unit Tests for backend services (NestJS - Jest)
* Integration Tests for API endpoints
* UI Testing with Detox (React Native)
* Manual test cases for news parsing and sentiment edge cases
* Load testing via Postman or Artillery
* Test coverage target: ≥ 85%

---

### **Deployment Plan**

* GitHub Actions for CI/CD
* Backend deployed to Render or AWS ECS
* Mobile app signed and submitted to Play Store / App Store
* Supabase project initialized and linked with backend
* FinBERT microservice container deployed alongside API

---

### **Maintenance and Support**

* Monitor with Sentry (for frontend) and Prometheus/Grafana (for backend)
* Bug reports via in-app form
* Weekly backend checks on news parsing accuracy
* Monthly performance audit and FinBERT model retraining if needed

---

</prd>