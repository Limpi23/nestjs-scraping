import { Module } from '@nestjs/common';
import { ScrapingService } from './scraping/scraping.service';
import { ScrapingController } from './scraping/scraping.controller';

@Module({
  imports: [],
  controllers: [ScrapingController],
  providers: [ScrapingService],
})
export class AppModule { }
