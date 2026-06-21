const fs = require('fs');
const cheerio = require('cheerio');

const html = fs.readFileSync('C:/Users/User/Downloads/REPORTE  POLLA 2026 (1).html', 'utf8');
const $ = cheerio.load(html);
const teams = new Set();

$('td').each((i, el) => {
  const txt = $(el).text().trim();
  if (txt && !/^#\d+$/.test(txt) && !/^\d[A-L]$/.test(txt) && !/^\d[A-L\/]+$/.test(txt) && isNaN(parseInt(txt)) && txt.length > 2) {
    teams.add(txt);
  }
});

console.log([...teams].sort().join('\n'));
