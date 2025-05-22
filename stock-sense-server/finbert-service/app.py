from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import google.generativeai as genai
import os

app = FastAPI()

# Configure Gemini API Key
genai.configure(api_key="AIzaSyBmESDAqA_WnQ5oDs4nOcnT5UxgwJIWZUM")  # Set this in your environment

# Initialize Gemini Flash-Lite Model
model = genai.GenerativeModel(model_name="gemini-2.0-flash-lite")

class SentimentRequest(BaseModel):
    text: str
    ticker: str

@app.post("/analyze")
async def analyze_sentiment(request: SentimentRequest):
    try:
        if not request.text.strip() or not request.ticker.strip():
            return {"error": "News text and ticker symbol cannot be empty"}

        prompt = f"""
        I want to perform sentiment analysis on financial news. 
        You will be given a news article and a company related to the news. 
        Provide sentiment (positive, negative, or neutral) along with confidence of the sentiment between 0 to 1. 
        Positive means company market sentiment would increase positively, leading to gain in stock prices. 
        This news is fixed for the US stock market and hence make decisions correctly. 
        
        Output format (strictly):
        sentiment:[positive/negative/neutral]
        sentiment-score:[0.xxxx]

        News to analyse: {request.text}
        Company context: {request.ticker}
        """

        response = model.generate_content(prompt)
        output = response.text.strip()

        # Simple validation and formatting
        if "sentiment:" not in output or "sentiment-score:" not in output:
            raise ValueError("Unexpected response format from Gemini model.")

        return {"result": output}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)