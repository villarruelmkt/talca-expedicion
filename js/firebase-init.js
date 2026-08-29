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
 employees:[{id:'e1',legajo:'11607',name:'José',surname:'Martínez',active:true,balance:4,lastCredit:'2026-07'}],
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
 let data=safeJSON(x,null)||{users:[],products:PRODUCT_SEED,fleteros:[],employees:[],stock:{},orders:[],movements:[],materialMoves:[],counts:[],audit:[],counters:{CE:0,AE:0}};
 data.users = (data.users && data.users.length) ? data.users : clone(DEMO.users);
 data.counters=data.counters||{CE:0,AE:0};
 data.audit=data.audit||[];
 data.products=data.products||PRODUCT_SEED;
 data.fleteros = (data.fleteros && data.fleteros.length) ? data.fleteros : clone(DEMO.fleteros);
 data.employees = (data.employees && data.employees.length) ? data.employees : clone(DEMO.employees);
 data.stock=data.stock||{};
 data.orders=data.orders||[];
 data.movements=data.movements||[];
 data.materialMoves=data.materialMoves||[];
 data.counts=data.counts||[];
 data.products.forEach(p=>{if(data.stock[p.id]===undefined)data.stock[p.id]=0});
 return data
}
