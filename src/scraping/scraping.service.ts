import { Injectable } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import * as xlsx from 'xlsx';
import * as fs from 'fs';
import axios from 'axios';

@Injectable()
export class ScrapingService {
  
  // Método para leer un archivo Excel
  readExcel(filePath: string): string[] {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
    const names = data.map((row: any) => row[0]);
    return names.filter((name: string) => name); // Filtra filas vacías
  }

  // Guardar cookies después del inicio de sesión
  async saveCookies(page: puppeteer.Page) {
    const cookies = await page.cookies();
    fs.writeFileSync('cookies.json', JSON.stringify(cookies));
  }

  // Cargar cookies guardadas para mantener la sesión
  async loadCookies(page: puppeteer.Page) {
    if (fs.existsSync('cookies.json')) {
      const cookies = JSON.parse(fs.readFileSync('cookies.json', 'utf-8'));
      await page.setCookie(...cookies);
    }
  }

  // Método para resolver captchas con 2Captcha
  async solveCaptcha(page: puppeteer.Page, captchaSiteKey: string) {
    const response = await axios.post(
      `https://2captcha.com/in.php?key=your-api-key&method=userrecaptcha&googlekey=${captchaSiteKey}&pageurl=${page.url()}`
    );
    const captchaId = response.data.split('|')[1];

    // Espera hasta que el captcha esté resuelto
    let captchaResult;
    do {
      await this.delay(5000); // Espera 5 segundos entre cada intento
      const result = await axios.get(
        `https://2captcha.com/res.php?key=your-api-key&action=get&id=${captchaId}`
      );
      captchaResult = result.data;
    } while (captchaResult === 'CAPCHA_NOT_READY');

    const captchaToken = captchaResult.split('|')[1];

    // Inyecta la respuesta del captcha en la página
    await page.evaluate(`document.getElementById('g-recaptcha-response').innerHTML="${captchaToken}";`);
  }

  // Simulación de comportamiento humano
  async simulateHumanBehavior(page: puppeteer.Page) {
    await page.mouse.move(Math.random() * 800, Math.random() * 600);  // Movimiento aleatorio del mouse
    await this.delay(Math.random() * 2000 + 1000);  // Pausa aleatoria
    await page.evaluate(() => window.scrollBy(0, window.innerHeight)); // Scroll hacia abajo
  }

  // Método principal de scraping
  async scrapeLinkedIn(names: string[]) {
    const browser = await puppeteer.launch({
      headless: false,
      args: ['--proxy-server=http://your-proxy-server:port'] // Configuración de proxy rotativo
    });
    const page = await browser.newPage();

    await this.loadCookies(page);  // Cargar cookies si existen

    // Si no hay cookies, iniciar sesión y guardar las cookies
    if (!fs.existsSync('cookies.json')) {
      await page.goto('https://www.linkedin.com/login');
      await page.type('#username', 'your-email');
      await page.type('#password', 'your-password');
      await page.click('[type="submit"]');
      await page.waitForNavigation();
      await this.saveCookies(page);
    }

    // Interceptar las solicitudes de LinkedIn para obtener información útil
    page.on('request', request => {
      if (request.url().includes('/sales-api/search')) {
        console.log('API Request Intercepted:', request.url());
      }
    });

    // Iterar sobre la lista de nombres para realizar scraping
    for (const name of names) {
      await page.goto(`https://www.linkedin.com/sales/search/people?q=${encodeURIComponent(name)}`);
      await this.simulateHumanBehavior(page);  // Simula interacciones humanas

      const data = await page.evaluate(() => {
        const profile = document.querySelector('.result-lockup__name > a');
        return profile ? profile.getAttribute('href') : null;
      });

      console.log(`Data for ${name}: `, data);

      await this.delay(Math.random() * 2000 + 1000); // Pausa aleatoria entre solicitudes
    }

    await browser.close();
  }

  // Función para crear pausas aleatorias
  private delay(time: number) {
    return new Promise(resolve => setTimeout(resolve, time));
  }
}
