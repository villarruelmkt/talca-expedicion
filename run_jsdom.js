const { JSDOM } = require('jsdom');
const path = require('path');
const fs = require('fs');

const indexHtml = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf-8');

const dom = new JSDOM(indexHtml, {
  url: "http://localhost:8080/",
  runScripts: "dangerously",
  resources: "usable"
});

dom.window.addEventListener('error', (event) => {
  console.error("JSDOM Caught Error:", event.error ? event.error.message : event.message, event.error ? event.error.stack : '');
});

dom.window.addEventListener('unhandledrejection', (event) => {
  console.error("JSDOM Unhandled Promise:", event.reason);
});

setTimeout(() => {
  console.log("JSDOM Execution finished after 5 seconds.");
}, 5000);
