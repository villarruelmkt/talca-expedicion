const fs = require('fs');
const { JSDOM } = require('jsdom');
const html = fs.readFileSync('index.html', 'utf8').replace(/\?v=\d+/g, '');

const virtualConsole = new (require('jsdom')).VirtualConsole();
virtualConsole.on("jsdomError", (e) => {
  console.error("JSDOM Error:", e.message);
});
virtualConsole.on("error", (e) => {
  console.error("Browser Error:", e);
});

const dom = new JSDOM(html, {
  runScripts: "dangerously",
  resources: "usable",
  virtualConsole
});

setTimeout(() => {
  const window = dom.window;
  const document = window.document;
  try {
    console.log("DB status:", window.db ? "Exists" : "Undefined");
    if(window.db) console.log("DB products length:", window.db.products?.length);
    window.session = { user: 'u1', shift: 'Mañana' };
    if (window.renderStockV1) window.renderStockV1();
    console.log("Employees Body:", document.getElementById('employeesBody')?.innerHTML.length);
    console.log("Stock Body:", document.getElementById('stockBody')?.innerHTML.length);
    console.log("Users List:", document.getElementById('usersList')?.innerHTML.length);
    console.log("Fleteros List:", document.getElementById('fleterosList')?.innerHTML.length);
    console.log("Employee Config List:", document.getElementById('employeeConfigList')?.innerHTML.length);
  } catch(e) {
    console.error("Error in test:", e);
  }
  process.exit(0);
}, 3000);
