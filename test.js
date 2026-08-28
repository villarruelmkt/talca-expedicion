const fs = require('fs');
const js = fs.readFileSync('c:/Users/p15vi/OneDrive/Desktop/Talca Expedición Salta/app.min.js', 'utf8');
const { JSDOM } = require('jsdom');
const dom = new JSDOM(`<!DOCTYPE html><html><head></head><body></body></html>`, {
  runScripts: "dangerously"
});

dom.window.onerror = function(msg, url, lineNo, columnNo, error) {
  console.log('WINDOW ERROR:', msg, error);
};

dom.window.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
dom.window.sessionStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
dom.window.firebase = {
  initializeApp: () => {},
  firestore: () => ({
    collection: () => ({
      doc: () => ({
        onSnapshot: (cb) => { 
          console.log('onSnapshot attached, firing synchronously');
          cb({ exists: true, data: () => ({ stockBuckets: {}, products: [], fleteros: [], employees: [], users: [] }) });
        },
        set: () => Promise.resolve()
      })
    })
  })
};

try {
  dom.window.eval(js);
  console.log("Evaluation complete.");
} catch (e) {
  console.error("EVAL ERROR:", e);
}
