# FinBERT Sentiment Analysis Service

This is a lightweight FastAPI service that provides sentiment analysis for financial news using the FinBERT model.

## Setup

1. Install the required Python packages:
   ```bash
   pip install -r requirements.txt
   ```

2. Start the service:
   ```bash
   python app.py
   ```

   The service will start on `http://localhost:8000`

## API Endpoints

- `POST /analyze` - Analyze sentiment of financial text
  - Request body: `{ "text": "Your financial news text here..." }`
  - Response: 
    ```json
    {
      "sentiment_score": 0.95,
      "sentiment": "positive"
    }
    ```

## Integration with Stock Sense Backend

The Stock Sense backend is already configured to use this service. Make sure to start this service before running the main NestJS application.
