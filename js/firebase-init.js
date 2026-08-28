// --- MODULE: FIREBASE CONFIGURATION & INIT ---
const firebaseConfig = {
  apiKey: "AIzaSyCeeHUCuY0oGYhIPFeE1fhJk6-_O9eYxVU",
  authDomain: "talca-expedicion.firebaseapp.com",
  projectId: "talca-expedicion",
  storageBucket: "talca-expedicion.firebasestorage.app",
  messagingSenderId: "658825484631",
  appId: "1:658825484631:web:cb95fdc34a838b6306c612",
  measurementId: "G-HXL7VNKPJ7"
};
firebase.initializeApp(firebaseConfig);
const firestoreDb = firebase.firestore();
try {
  firestoreDb.enablePersistence().catch(e => console.warn('Persistence error:', e));
} catch(e) {
  console.warn('Sync persistence error:', e);
}
const docRef = firestoreDb.collection("talca").doc("data");
let isFirebaseReady = false;
const PRODUCT_SEED=[
 {id:'5670',name:'Talca Cola 3 L',pack:6,perCut:15,cuts:4},
 {id:'5675',name:'Talca Lima Limón 3 L',pack:6,perCut:15,cuts:4},
 {id:'5680',name:'Talca Manzana 3 L',pack:6,perCut:15,cuts:4},
 {id:'5685',name:'Talca Naranja 3 L',pack:6,perCut:15,cuts:4},
 {id:'5690',name:'Talca Pomelo 3 L',pack:6,perCut:15,cuts:4},
 {id:'5051',name:'Talca Cola 500 ml',pack:12,perCut:20,cuts:7},
 {id:'5056',name:'Talca Lima Limón 500 ml',pack:12,perCut:20,cuts:7},
 {id:'5061',name:'Talca Manzana 500 ml',pack:12,perCut:20,cuts:7},
 {id:'5066',name:'Talca Naranja 500 ml',pack:12,perCut:20,cuts:7},
 {id:'5071',name:'Talca Pomelo 500 ml',pack:12,perCut:20,cuts:7},
 {id:'8670',name:'Agua 2 L',pack:6,perCut:20,cuts:4},
 {id:'4900',name:'Soda 2,25 L',pack:6,perCut:20,cuts:4},
 {id:'4171',name:'Soda 500 ml',pack:12,perCut:20,cuts:7},
 {id:'4910',name:'Soda sifón 2 L',pack:6,perCut:20,cuts:4},
 {id:'BIDON',name:'Bidón de agua',pack:1,perCut:42,cuts:2}
];
const V1_EMPLOYEE_SEED=[{"id": "emp_10054", "legajo": "10054", "name": "JOSE ANTONIO", "surname": "LOPEZ MENA", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_10055", "legajo": "10055", "name": "FACUNDO", "surname": "MOLINA", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_10101", "legajo": "10101", "name": "SERGIO OMAR", "surname": "FERNANDEZ", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_10102", "legajo": "10102", "name": "CLAUDIA INES", "surname": "LIZONDO", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_10103", "legajo": "10103", "name": "ADOLFO HEN", "surname": "LI", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_10112", "legajo": "10112", "name": "GONZALO", "surname": "LOPEZ", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_10113", "legajo": "10113", "name": "CLAUDIA", "surname": "ALBORNOZ", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_10117", "legajo": "10117", "name": "MONICA LILIANA", "surname": "JIMENEZ", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_10118", "legajo": "10118", "name": "MARCO ANTONIO", "surname": "CORTEZ", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_10419", "legajo": "10419", "name": "JORGE RAUL", "surname": "ARAOZ", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_10426", "legajo": "10426", "name": "HUGO LUIS", "surname": "PORTAL", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_10430", "legajo": "10430", "name": "CARLOS", "surname": "FLORES", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_10432", "legajo": "10432", "name": "SERGIO", "surname": "GOMEZ", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_10437", "legajo": "10437", "name": "ALEJANDRO A", "surname": "FERLATTI", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_10439", "legajo": "10439", "name": "BARTOLOME", "surname": "MORALES", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_10440", "legajo": "10440", "name": "ALDO GONZALO", "surname": "PLAZA", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_10441", "legajo": "10441", "name": "DIEGO", "surname": "LIENDRO", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_10442", "legajo": "10442", "name": "EDGAR", "surname": "QUARTIN", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_10711", "legajo": "10711", "name": "ANDRES RICARDO", "surname": "GUAYMAS", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_10725", "legajo": "10725", "name": "CARLOS S", "surname": "BARBOZA E", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_10754", "legajo": "10754", "name": "MARIA VICTORIA", "surname": "LUI VEGAS", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_10902", "legajo": "10902", "name": "JOSE LUIS", "surname": "JUAREZ", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_10903", "legajo": "10903", "name": "MARCOS", "surname": "BORDON", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_10906", "legajo": "10906", "name": "JOAQUIN", "surname": "CONDE", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_10907", "legajo": "10907", "name": "EXEQUIEL", "surname": "BARCELO", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_10908", "legajo": "10908", "name": "HERNAN", "surname": "BALDIVIEZO", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_10909", "legajo": "10909", "name": "ISAAC", "surname": "RODRIGUEZ", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11002", "legajo": "11002", "name": "VICTOR HUGO", "surname": "RUIZ BAREA", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11004", "legajo": "11004", "name": "AGUSTIN", "surname": "CARRERAS", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11005", "legajo": "11005", "name": "VICTOR HUGO", "surname": "CHUNGARA", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11007", "legajo": "11007", "name": "ISMAEL", "surname": "FIGUEROA", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11008", "legajo": "11008", "name": "ORLANDO DARIO", "surname": "LOPEZ", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11009", "legajo": "11009", "name": "CARLOS GUALBERTO", "surname": "ROMERO", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11010", "legajo": "11010", "name": "SERGIO ALEJANDRO", "surname": "LOPEZ", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11011", "legajo": "11011", "name": "RICARDO CESAR", "surname": "OSORES", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11012", "legajo": "11012", "name": "SANTOS P", "surname": "ALBERTO", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11013", "legajo": "11013", "name": "CHRISTIAN", "surname": "PALAVECINO", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11018", "legajo": "11018", "name": "RAUL OBDULIO", "surname": "ARIAS", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11021", "legajo": "11021", "name": "JUAN CARLOS", "surname": "CORTEZ", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11022", "legajo": "11022", "name": "JORGE LUIS", "surname": "AVILA OLGUIN", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11026", "legajo": "11026", "name": "SERGIO ROLANDO", "surname": "SARDINA", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11027", "legajo": "11027", "name": "RICHARD", "surname": "CUELLAR", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11029", "legajo": "11029", "name": "NESTOR RAMON", "surname": "LOPEZ", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11030", "legajo": "11030", "name": "NELSON", "surname": "GARIN RODRIGUEZ", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11031", "legajo": "11031", "name": "OSCAR ALBERTO", "surname": "GIRAUDO", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11034", "legajo": "11034", "name": "GUSTAVO ADRIAN", "surname": "ORTEGA", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11035", "legajo": "11035", "name": "FRANCISCO GABINO", "surname": "SULCA", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11037", "legajo": "11037", "name": "JOSE LUIS", "surname": "ARCE", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11039", "legajo": "11039", "name": "ROMUALDO ABEL", "surname": "CRUZ", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11041", "legajo": "11041", "name": "RAUL", "surname": "CRUZ", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11046", "legajo": "11046", "name": "FREDY ARIEL", "surname": "MORALES", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11048", "legajo": "11048", "name": "PABLO JESUS", "surname": "VILTE", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11050", "legajo": "11050", "name": "JESUS HUGO", "surname": "LOPEZ", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11054", "legajo": "11054", "name": "JORGE EDUARDO", "surname": "GUANCA", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11062", "legajo": "11062", "name": "OSCAR RENE", "surname": "VILTE", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11063", "legajo": "11063", "name": "RUFINO", "surname": "LEMOS", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11071", "legajo": "11071", "name": "DIEGO", "surname": "RIOS", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11072", "legajo": "11072", "name": "DANIEL", "surname": "SARDINAS", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11078", "legajo": "11078", "name": "RAUL LEONARDO", "surname": "ORELLANA", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11079", "legajo": "11079", "name": "CARLOS CESAR", "surname": "ALVAREZ", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11082", "legajo": "11082", "name": "ALBERTO", "surname": "REALES", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11088", "legajo": "11088", "name": "ADRIAN", "surname": "TAPIA", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11090", "legajo": "11090", "name": "DELFIN", "surname": "RODRIGUEZ", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11095", "legajo": "11095", "name": "JUAN", "surname": "FERNANDEZ", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11096", "legajo": "11096", "name": "FACUNDO", "surname": "JODOR", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11104", "legajo": "11104", "name": "LUCAS", "surname": "CHILIGUAY", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11503", "legajo": "11503", "name": "RENE ANICETO", "surname": "GRAMAJO", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11602", "legajo": "11602", "name": "DANIEL GUALBERTO", "surname": "BARRO", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11607", "legajo": "11607", "name": "JOSE LUIS", "surname": "MARTINEZ", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11608", "legajo": "11608", "name": "JOSE", "surname": "CRUZ YEBARA", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11609", "legajo": "11609", "name": "CARLOS MARTIN", "surname": "BRAVO", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11610", "legajo": "11610", "name": "ABEL RAMIRO", "surname": "CRUZ", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11611", "legajo": "11611", "name": "ESTEBAN MISAEL", "surname": "MARTINEZ", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11613", "legajo": "11613", "name": "DIEGO PAUL", "surname": "CORDOBA", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11615", "legajo": "11615", "name": "JUAN", "surname": "CABELLER PONCE", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11950", "legajo": "11950", "name": "FELIX A", "surname": "PATIÑO FERNANDEZ", "active": true, "balance": 0, "lastCredit": ""}];
const DEMO={
 audit:[],
 counters:{CE:0,AE:0},
 users:[
  {id:'u1',username:'encargado1',displayName:'Encargado 1',password:'1234',active:true},
  {id:'u2',username:'encargado2',displayName:'Encargado 2',password:'1234',active:true},
  {id:'u3',username:'suplente',displayName:'Encargado suplente',password:'1234',active:true}
 ],
 products:PRODUCT_SEED,
 fleteros:[{id:'f1',name:'Distribuidora G-7',surname:'',company:'Distribuidora G-7'},{id:'f2',name:'Fletero habitual',surname:'',company:''}],
 employees:V1_EMPLOYEE_SEED,
 stock:Object.fromEntries(PRODUCT_SEED.map(p=>[p.id,0])),
 orders:[],movements:[],materialMoves:[],counts:[]
};
const memoryStorage={};
function clone(x){return JSON.parse(JSON.stringify(x))}
function safeGet(storage,key){
 try{return storage.getItem(key)}catch(err){return memoryStorage[key]||null}
}
function safeSet(storage,key,value){
 try{storage.setItem(key,value);return true}catch(err){memoryStorage[key]=value;return false}
}
function safeRemove(storage,key){
 try{storage.removeItem(key)}catch(err){delete memoryStorage[key]}
}
function safeJSON(value,fallback=null){
 try{return value?JSON.parse(value):fallback}catch(err){return fallback}
}
function load(){
 let x=safeGet(localStorage,'talcaExpV02')||safeGet(localStorage,'talcaExpV01');
 let data=safeJSON(x,null)||clone(DEMO);
 data.users=(data.users&&data.users.length)?data.users:clone(DEMO.users);
 data.counters=data.counters||{CE:0,AE:0};
 data.audit=data.audit||[];
 data.products=(data.products&&data.products.length)?data.products:clone(DEMO.products);
 data.fleteros=(data.fleteros&&data.fleteros.length)?data.fleteros:clone(DEMO.fleteros);
 data.employees=(data.employees&&data.employees.length)?data.employees:clone(DEMO.employees);
 data.stock=data.stock||{};
 data.orders=data.orders||[];
 data.movements=data.movements||[];
 data.materialMoves=data.materialMoves||[];
 data.counts=data.counts||[];
 data.products.forEach(p=>{if(data.stock[p.id]===undefined)data.stock[p.id]=0});
 return data;
}
