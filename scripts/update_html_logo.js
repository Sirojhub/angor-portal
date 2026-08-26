const fs = require('fs');
const path = require('path');

const indexHtmlPath = path.join(__dirname, '..', 'index.html');
let html = fs.readFileSync(indexHtmlPath, 'utf8');

const regex = /<img src="data:image\/png;base64,[^"]+"/g;
if (regex.test(html)) {
    html = html.replace(regex, '<img src="logo.png" alt="Angor Agro Star Logo"');
    fs.writeFileSync(indexHtmlPath, html, 'utf8');
    console.log('Successfully updated logo in index.html!');
} else {
    console.log('Base64 logo image tag not found or already updated.');
}
