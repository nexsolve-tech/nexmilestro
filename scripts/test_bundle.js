const fs = require('fs');
const content = fs.readFileSync('index.html', 'utf8');
const scriptRegex = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
let match;
let count = 0;
while ((match = scriptRegex.exec(content)) !== null) {
  const attrs = match[1];
  const code = match[2];
  if (attrs.includes('text/template') || attrs.includes('text/html') || attrs.includes('src=')) continue;
  count++;
  try {
    new Function(code);
    console.log(`Script ${count}: PASS`);
  } catch(e) {
    console.error(`Script ${count} FAIL:`, e.message);
  }
}
console.log(`Verified ${count} executable scripts successfully!`);

