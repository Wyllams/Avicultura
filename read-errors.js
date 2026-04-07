const fs = require('fs');
const content = fs.readFileSync('typescript-errors.txt', 'utf16le');
console.log(content);
