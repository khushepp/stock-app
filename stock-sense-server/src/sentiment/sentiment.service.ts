import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';

export interface SentimentResult {
  sentiment_score: number;
  sentiment: 'positive' | 'negative' | 'neutral';
}

@Injectable()
export class SentimentService {
  private readonly finbertUrl = 'http://localhost:8000/analyze';

  async analyzeSentiment(text: string): Promise<SentimentResult> {
    try {
      const response = await axios.post(this.finbertUrl, { text });
      return response.data;
    } catch (error) {
      console.error('Error analyzing sentiment:', error.message);
      // Return neutral sentiment in case of error to not break the flow
      return {
        sentiment_score: 0,
        sentiment: 'neutral' as const,
      };
    }
  }
}
