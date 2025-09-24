const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '..', 'dist', 'index.html');

fs.readFile(indexPath, 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading index.html:', err);
    return;
  }

  const result = data.replace(/<title>cross-platform-app<\/title>/g, '<title>Ben\'s 25th<\/title>');

  fs.writeFile(indexPath, result, 'utf8', (err) => {
    if (err) {
      console.error('Error writing index.html:', err);
      return;
    }
    console.log('Title updated successfully in index.html');
  });
});