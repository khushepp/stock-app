import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';

export interface SentimentResult {
  sentiment: 'positive' | 'negative' | 'neutral';
  sentiment_score: number;
}

@Injectable()
export class SentimentService {
  private readonly finbertUrl = 'http://localhost:8000/analyze';

  /**
   * Analyzes the sentiment of the given text with optional ticker context
   * @param text - The text to analyze
   * @param ticker - Optional stock ticker for context (default: 'general market')
   * @returns Promise resolving to sentiment analysis result
   * @throws HttpException if text is empty or invalid
   */
  async analyzeSentiment(text: string, ticker: string = 'general market'): Promise<SentimentResult> {
    try {
      // Input validation
      if (!text?.trim()) {
        throw new HttpException('Text cannot be empty', HttpStatus.BAD_REQUEST);
      }

      // Clean and prepare the text
      const cleanText = text.trim().substring(0, 10000);
      const cleanTicker = (ticker || 'general market').trim().toUpperCase();
      
      console.log(`Analyzing sentiment for ticker: ${cleanTicker}, text length: ${cleanText.length} chars`);
      
      const startTime = Date.now();
      const response = await axios.post(
        this.finbertUrl, 
        { 
          text: cleanText,
          ticker: cleanTicker
        },
        { 
          timeout: 10000, // 10 second timeout
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );
      
      const processingTime = Date.now() - startTime;
      
      if (!response.data?.result) {
        console.error('Empty or invalid response from sentiment service:', response.data);
        throw new HttpException('Invalid response from sentiment service', HttpStatus.SERVICE_UNAVAILABLE);
      }

      const result = response.data.result;
      console.log(`Sentiment analysis completed in ${processingTime}ms`);
      
      // Parse the response
      const sentimentMatch = typeof result === 'string' 
        ? result.match(/sentiment:(positive|negative|neutral)/i)
        : null;
        
      const scoreMatch = typeof result === 'string'
        ? result.match(/sentiment-score:([\d.]+)/i)
        : null;
      
      if (sentimentMatch && scoreMatch) {
        const sentiment = sentimentMatch[1].toLowerCase() as 'positive' | 'negative' | 'neutral';
        const score = parseFloat(scoreMatch[1]);
        
        if (isNaN(score) || !['positive', 'negative', 'neutral'].includes(sentiment)) {
          console.error('Invalid sentiment or score format:', { sentiment, score });
          throw new HttpException('Invalid sentiment analysis result format', HttpStatus.INTERNAL_SERVER_ERROR);
        }
        
        return { 
          sentiment, 
          sentiment_score: parseFloat(score.toFixed(4)) // Ensure consistent decimal places
        };
      }
      
      console.error('Failed to parse sentiment analysis result:', result);
      throw new HttpException('Failed to parse sentiment analysis result', HttpStatus.INTERNAL_SERVER_ERROR);
      
    } catch (error) {
      console.error('Error in analyzeSentiment:', {
        message: error.message,
        url: this.finbertUrl,
        ticker,
        error: error.response?.data || 'No additional error info'
      });
      return this.getNeutralSentiment();
    }
  }
  
  private getNeutralSentiment(): SentimentResult {
    return {
      sentiment: 'neutral',
      sentiment_score: 0
    };
  }
}
