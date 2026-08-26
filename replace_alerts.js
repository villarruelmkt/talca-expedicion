const fs = require('fs');
const path = require('path');

const jsDir = path.join(__dirname, 'js');
const files = fs.readdirSync(jsDir).filter(f => f.endsWith('.js'));

for (let file of files) {
    const filePath = path.join(jsDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace alert('...') with toast('...', 'error')
    content = content.replace(/alert\((['"`].*?['"`])\)/g, "toast($1, 'error')");
    
    // Replace alert(variable) with toast(variable, 'error')
    // A bit more tricky, but we can do a general replace for alert(...)
    content = content.replace(/alert\((.*?)\)/g, "toast($1, 'error')");
    
    // The previous replace might double up if it caught the same string, but the regex `alert\(` only matches 'alert('.
    // Wait, let's just do one regex: /alert\((.+?)\)/g -> toast($1, 'error')
    // Let's re-read and do it properly:
    content = fs.readFileSync(filePath, 'utf8');
    content = content.replace(/alert\((.+?)\)/g, "toast($1, 'error')");
    
    // Also replace confirm('...') with customConfirm('...', () => { ... })
    // confirm is harder because it's usually `if (confirm('...')) { ... }`
    
    fs.writeFileSync(filePath, content, 'utf8');
}
console.log('Replaced alerts with toasts in JS files.');
