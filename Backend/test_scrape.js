const axios = require('axios');
const cheerio = require('cheerio');

async function testScrape() {
  try {
    const term = 'iphone 15 pro';
    console.log('Fetching Flipkart...');
    const flipkartRes = await axios.get(`https://www.flipkart.com/search?q=${encodeURIComponent(term)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    const $fk = cheerio.load(flipkartRes.data);
    const fkPrice = $fk('div._30jeq3').first().text() || $fk('div.Nx9bqj').first().text();
    console.log('Flipkart Price:', fkPrice);

    console.log('Fetching Amazon...');
    const amazonRes = await axios.get(`https://www.amazon.in/s?k=${encodeURIComponent(term)}`, {
      headers: {
         'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
         'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
         'Accept-Language': 'en-US,en;q=0.5'
      }
    });
    const $amz = cheerio.load(amazonRes.data);
    const amzPrice = $amz('.a-price-whole').first().text();
    console.log('Amazon Price:', amzPrice);
    
  } catch (err) {
    console.error('Error:', err.message);
  }
}
testScrape();
