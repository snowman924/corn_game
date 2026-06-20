const http = require('http');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// 1. 초간단 정적 파일 웹 서버 구동
const server = http.createServer((req, res) => {
    let filePath = path.join(__dirname, '..', req.url === '/' ? 'index.html' : req.url.split('?')[0]);
    
    const ext = path.extname(filePath);
    let contentType = 'text/html';
    if (ext === '.css') contentType = 'text/css';
    else if (ext === '.js') contentType = 'application/javascript';
    else if (ext === '.png') contentType = 'image/png';
    else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    
    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(404);
            res.end('File not found');
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

const PORT = 9999;
server.listen(PORT, async () => {
    console.log(`Temp server listening on port ${PORT}`);
    
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu'
            ]
        });
        
        const page = await browser.newPage();
        
        page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
        page.on('pageerror', err => console.log('BROWSER ERROR:', err.toString()));
        
        // ----------------- 세로 모드 E2E 시나리오 -----------------
        console.log('\n--- PORTRAIT E2E SEQUENCE ---');
        await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
        await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'networkidle2' });
        
        await delay(1000);
        await page.screenshot({ path: path.join(__dirname, '..', 'screenshot_portrait_1_intro.png') });
        console.log('Saved screenshot_portrait_1_intro.png');
        
        console.log('Clicking Skip Intro...');
        await page.click('#skip-intro-btn');
        await delay(1000);
        await page.screenshot({ path: path.join(__dirname, '..', 'screenshot_portrait_2_lobby.png') });
        console.log('Saved screenshot_portrait_2_lobby.png');
        
        console.log('Clicking Start Game...');
        await page.click('#start-game-btn');
        await delay(1500); // 프라이팬 및 캐릭터 렌더링 돌 때까지 대기
        await page.screenshot({ path: path.join(__dirname, '..', 'screenshot_portrait_3_game.png') });
        console.log('Saved screenshot_portrait_3_game.png');
        
        // ----------------- 가로 모드 E2E 시나리오 -----------------
        console.log('\n--- LANDSCAPE E2E SEQUENCE ---');
        await page.setViewport({ width: 844, height: 390, isMobile: true, hasTouch: true });
        await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'networkidle2' });
        
        await delay(1000);
        await page.screenshot({ path: path.join(__dirname, '..', 'screenshot_landscape_1_intro.png') });
        console.log('Saved screenshot_landscape_1_intro.png');
        
        console.log('Clicking Skip Intro...');
        await page.click('#skip-intro-btn');
        await delay(1000);
        await page.screenshot({ path: path.join(__dirname, '..', 'screenshot_landscape_2_lobby.png') });
        console.log('Saved screenshot_landscape_2_lobby.png');
        
        console.log('Clicking Start Game...');
        await page.click('#start-game-btn');
        await delay(1500);
        await page.screenshot({ path: path.join(__dirname, '..', 'screenshot_landscape_3_game.png') });
        console.log('Saved screenshot_landscape_3_game.png');
        
    } catch (e) {
        console.error('Error during E2E sequence:', e);
    } finally {
        if (browser) await browser.close();
        server.close(() => {
            console.log('Temp server closed.');
        });
    }
});
