// init_data.js
// Script to initialize empty JSON data files for Mundial2026 Polla application
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// List of initial JSON files to create
const files = [
  'teams.json',
  'groups.json',
  'fixtures.json',
  'users.json',
  'bets.json',
  'scores.json'
];

files.forEach(file => {
  const filePath = path.join(dataDir, file);
  if (!fs.existsSync(filePath)) {
    // Write empty array or object depending on file purpose
    let initialContent = '[]';
    if (file === 'scores.json') {
      initialContent = '{}';
    }
    fs.writeFileSync(filePath, initialContent, 'utf8');
    console.log(`Created ${filePath}`);
  } else {
    console.log(`${filePath} already exists`);
  }
});

console.log('Initialization complete.');
