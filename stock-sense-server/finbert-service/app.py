from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from transformers import pipeline
import numpy as np

app = FastAPI()

# Initialize the pipeline with CPU for minimal memory usage
sentiment_analyzer = pipeline(
    "sentiment-analysis",
    model="ProsusAI/finbert",
    tokenizer="ProsusAI/finbert",
    device=-1  # Use CPU for minimal setup
)

class TextRequest(BaseModel):
    text: str

@app.post("/analyze")
async def analyze_sentiment(request: TextRequest):
    try:
        if not request.text.strip():
            return {"error": "Text cannot be empty"}
            
        # Process in chunks if text is too long (FinBERT has a 512 token limit)
        max_chunk_length = 500
        text = request.text
        chunks = [text[i:i + max_chunk_length] for i in range(0, len(text), max_chunk_length)]
        
        # Get sentiment for each chunk and average the scores
        results = []
        for chunk in chunks:
            result = sentiment_analyzer(chunk)[0]
            score = result['score'] if result['label'] == 'positive' else -result['score']
            results.append(score)
        
        avg_score = float(np.mean(results)) if results else 0.0
        
        return {
            "sentiment_score": avg_score,
            "sentiment": "positive" if avg_score > 0 else "negative" if avg_score < 0 else "neutral"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
