import { Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ScrapingService } from './scraping.service';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('scraping')
export class ScrapingController {
  constructor(private readonly scrapingService: ScrapingService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads', 
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = extname(file.originalname);
        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
      }
    }),
  }))
  async uploadFile(@UploadedFile() file: any) {
    const names = this.scrapingService.readExcel(file.path);
    await this.scrapingService.scrapeLinkedIn(names);
    return { message: 'Scraping iniciado', filePath: file.path };
  }
}
