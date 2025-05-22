export interface SentimentResult {
    sentiment: 'positive' | 'negative' | 'neutral';
    sentiment_score: number;
}
export declare class SentimentService {
    private readonly finbertUrl;
    analyzeSentiment(text: string, ticker?: string): Promise<SentimentResult>;
    private getNeutralSentiment;
}
