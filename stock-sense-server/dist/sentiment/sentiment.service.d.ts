export interface SentimentResult {
    sentiment_score: number;
    sentiment: 'positive' | 'negative' | 'neutral';
}
export declare class SentimentService {
    private readonly finbertUrl;
    analyzeSentiment(text: string): Promise<SentimentResult>;
}
