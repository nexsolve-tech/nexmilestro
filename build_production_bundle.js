const fs = require('fs');
const path = require('path');

console.log('=== BUILDING PRODUCTION BUNDLE FOR NEXMILESTRO ===');

const baseDir = __dirname;
const indexFile = path.join(baseDir, 'Index.html');

if (!fs.existsSync(indexFile)) {
  console.error('Error: Index.html not found in', baseDir);
  process.exit(1);
}

let content = fs.readFileSync(indexFile, 'utf8');

// Function to recursively replace <?!= include('NAME'); ?>
function inlineIncludes(html, depth = 0) {
  if (depth > 5) return html;
  const includeRegex = /<\?!\s*=\s*include\(['"]([^'"]+)['"]\);\s*\?>/g;
  
  return html.replace(includeRegex, (match, fileName) => {
    // Check multiple potential file extensions/paths
    const candidates = [
      path.join(baseDir, `${fileName}.html`),
      path.join(baseDir, fileName),
      path.join(baseDir, `${fileName}.js`)
    ];
    
    let resolvedPath = candidates.find(p => fs.existsSync(p));
    
    if (resolvedPath) {
      console.log(`[Depth ${depth}] Inlining: ${path.basename(resolvedPath)}`);
      let includedContent = fs.readFileSync(resolvedPath, 'utf8');
      // Recursively resolve includes inside the included file if any
      return inlineIncludes(includedContent, depth + 1);
    } else {
      console.warn(`WARNING: Included file not found: ${fileName}`);
      return match;
    }
  });
}

let bundled = inlineIncludes(content);

// Ensure proper title
bundled = bundled.replace(
  /<title>.*?<\/title>/i,
  '<title>NexMilestro - Project & Milestone Management System | NexSolve</title>'
);

// Check for remaining unreplaced tags
const remainingIncludes = bundled.match(/<\?!\s*=\s*include\([^)]+\);\s*\?>/g);
if (remainingIncludes) {
  console.warn('Warning: Some includes were not resolved:', remainingIncludes);
} else {
  console.log('✓ All include tags resolved successfully!');
}

// Output to dist/index.html
const distDir = path.join(baseDir, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}
const distPath = path.join(distDir, 'index.html');
fs.writeFileSync(distPath, bundled, 'utf8');
const sizeKb = (fs.statSync(distPath).size / 1024).toFixed(2);
console.log(`✓ SUCCESS: Created dist/index.html (${sizeKb} KB)`);
