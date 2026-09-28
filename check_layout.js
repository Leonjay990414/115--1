const fs = require('fs');
const html = fs.readFileSync('index/index.html', 'utf8');
const lines = html.split('\n');

let depth = 0;
let started = false;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('id="admin-main-app"')) {
    started = true;
    console.log('Started admin-main-app at line', i + 1);
  }
  if (started) {
    const opens = (line.match(/<div(\s|>)/gi) || []).length;
    const closes = (line.match(/<\/div>/gi) || []).length;
    depth += opens - closes;
    if (depth <= 0) {
      console.log('Closed admin-main-app at line', i + 1, 'final depth:', depth);
      break;
    }
  }
}
