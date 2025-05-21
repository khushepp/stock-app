import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { StockController } from './stock.controller';
import { SentimentModule } from './sentiment/sentiment.module';
import { SentimentService } from './sentiment/sentiment.service';

@Module({
  imports: [SentimentModule],
  controllers: [AppController, StockController],
  providers: [
    AppService,
    {
      provide: 'SENTIMENT_SERVICE',
      useClass: SentimentService,
    },
  ],
  exports: ['SENTIMENT_SERVICE'],
})
export class AppModule {}
