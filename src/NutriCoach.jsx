import { useState, useEffect, useRef, useMemo, Component } from "react";
import { syncConfigured, getSession, aliasOf, signUp, signIn, signOut, resetPassword, updatePassword, onAuthChange, pullRemote, pushRemote } from "./sync.js";
import { estimateFromText, estimateFromPhoto, generateMenu } from "./estimate.js";

/* ============ DATABASE ALIMENTI BASE ============ */
const FOOD_DB = {
  "petto di pollo":{p:31,c:0,f:3.6,kcal:165,label:"Petto di pollo"},"pollo":{p:31,c:0,f:3.6,kcal:165,label:"Petto di pollo"},
  "tacchino":{p:29,c:0,f:1,kcal:135,label:"Petto di tacchino"},"salmone":{p:20,c:0,f:13,kcal:208,label:"Salmone"},
  "tonno al naturale":{p:23,c:0,f:1,kcal:110,label:"Tonno al naturale"},"tonno":{p:23,c:0,f:1,kcal:110,label:"Tonno al naturale"},
  "bresaola":{p:32,c:0,f:2,kcal:151,label:"Bresaola"},"merluzzo":{p:18,c:0,f:0.7,kcal:82,label:"Merluzzo"},
  "uova":{p:13,c:1,f:11,kcal:143,unit:50,label:"Uova (1pz=50g)"},"uovo":{p:13,c:1,f:11,kcal:143,unit:50,label:"Uovo (1pz=50g)"},
  "yogurt greco":{p:10,c:4,f:0,kcal:56,label:"Yogurt greco 0%"},"yogurt":{p:10,c:4,f:0,kcal:56,label:"Yogurt greco 0%"},
  "avena":{p:13,c:66,f:7,kcal:380,label:"Fiocchi avena"},"riso cotto":{p:2.5,c:28,f:0.3,kcal:130,label:"Riso (cotto)"},
  "riso":{p:7,c:78,f:1,kcal:350,label:"Riso (crudo)"},"pasta integrale":{p:13,c:67,f:2.5,kcal:350,label:"Pasta integrale (cruda)"},
  "pasta":{p:13,c:67,f:2.5,kcal:350,label:"Pasta (cruda)"},"pane integrale":{p:9,c:43,f:3,kcal:240,label:"Pane integrale"},
  "pane":{p:9,c:49,f:3,kcal:265,label:"Pane"},"patate dolci":{p:1.6,c:20,f:0.1,kcal:86,label:"Patate dolci"},
  "patate":{p:2,c:17,f:0,kcal:77,label:"Patate"},"gallette di riso":{p:8,c:81,f:3,kcal:387,unit:9,label:"Galletta riso (1pz=9g)"},
  "gallette":{p:8,c:81,f:3,kcal:387,unit:9,label:"Galletta riso (1pz=9g)"},"banana":{p:1,c:23,f:0.3,kcal:89,unit:120,label:"Banana (1pz=120g)"},
  "mela":{p:0.3,c:14,f:0.2,kcal:52,unit:150,label:"Mela (1pz=150g)"},"kiwi":{p:1,c:15,f:0.5,kcal:61,unit:75,label:"Kiwi (1pz=75g)"},
  "arancia":{p:1,c:12,f:0.1,kcal:47,unit:150,label:"Arancia (1pz=150g)"},"pera":{p:0.4,c:15,f:0.1,kcal:57,unit:150,label:"Pera (1pz=150g)"},
  "frutti di bosco":{p:1,c:8,f:0.3,kcal:40,label:"Frutti di bosco"},"fragole":{p:0.7,c:8,f:0.3,kcal:32,label:"Fragole"},
  "verdure":{p:2,c:6,f:0.3,kcal:35,label:"Verdure miste"},"insalata":{p:1.4,c:3,f:0.2,kcal:20,label:"Insalata"},
  "zucchine":{p:1.2,c:3,f:0.3,kcal:17,label:"Zucchine"},"broccoli":{p:2.8,c:7,f:0.4,kcal:34,label:"Broccoli"},
  "spinaci":{p:2.9,c:3.6,f:0.4,kcal:23,label:"Spinaci"},"pomodorini":{p:0.9,c:3.9,f:0.2,kcal:18,label:"Pomodorini"},
  "pomodori":{p:0.9,c:3.9,f:0.2,kcal:18,label:"Pomodori"},"olio evo":{p:0,c:0,f:100,kcal:884,label:"Olio EVO"},
  "olio":{p:0,c:0,f:100,kcal:884,label:"Olio EVO"},"mandorle":{p:21,c:22,f:49,kcal:579,label:"Mandorle"},
  "miele":{p:0,c:82,f:0,kcal:304,label:"Miele"},"pizza":{p:11,c:30,f:10,kcal:266,label:"Pizza"},
  "gelato":{p:4,c:25,f:11,kcal:207,label:"Gelato"},"cioccolato":{p:7,c:50,f:35,kcal:546,label:"Cioccolato"},
  "vino":{p:0,c:2.6,f:0,kcal:83,label:"Vino"},"birra":{p:0.5,c:3.6,f:0,kcal:43,label:"Birra"},
};

/* ===== Alimenti generici "sciolti" (valori medi per 100g) ===== */
const GENERIC_DB={
  // Verdure (crude salvo indicazione)
  "carote bollite":{p:0.8,c:8,f:0.2,kcal:35,label:"Carote bollite"},"carote":{p:1,c:8,f:0.2,kcal:41,label:"Carote"},
  "cavolfiore bollito":{p:1.8,c:4,f:0.3,kcal:25,label:"Cavolfiore bollito"},"cavolfiore":{p:2,c:5,f:0.3,kcal:25,label:"Cavolfiore"},
  "melanzane grigliate":{p:1,c:6,f:0.4,kcal:35,label:"Melanzane grigliate"},"melanzane":{p:1,c:6,f:0.2,kcal:24,label:"Melanzane"},
  "peperoni":{p:1,c:6,f:0.3,kcal:26,label:"Peperoni"},"finocchi":{p:1.2,c:3,f:0.2,kcal:15,label:"Finocchi"},
  "sedano":{p:0.7,c:3,f:0.2,kcal:16,label:"Sedano"},"cetrioli":{p:0.7,c:3.6,f:0.1,kcal:12,label:"Cetrioli"},
  "lattuga":{p:1.4,c:2.9,f:0.2,kcal:15,label:"Lattuga"},"rucola":{p:2.6,c:3.7,f:0.7,kcal:25,label:"Rucola"},
  "cipolla":{p:1.1,c:9.3,f:0.1,kcal:40,label:"Cipolla"},"funghi":{p:3.1,c:3.3,f:0.3,kcal:22,label:"Funghi"},
  "zucca":{p:1,c:6.5,f:0.1,kcal:26,label:"Zucca"},"bietole":{p:1.8,c:3.7,f:0.2,kcal:19,label:"Bietole"},
  "carciofi":{p:3.3,c:10.5,f:0.2,kcal:47,label:"Carciofi"},"cavolo":{p:1.3,c:5.8,f:0.1,kcal:25,label:"Cavolo"},
  "verza":{p:2,c:6,f:0.1,kcal:27,label:"Verza"},"piselli":{p:5.4,c:14.4,f:0.4,kcal:81,label:"Piselli"},
  "mais":{p:3.3,c:19,f:1.4,kcal:86,label:"Mais dolce"},
  // Legumi
  "lenticchie cotte":{p:9,c:20,f:0.4,kcal:116,label:"Lenticchie cotte"},"lenticchie":{p:25,c:53,f:1.1,kcal:353,label:"Lenticchie secche"},
  "ceci cotti":{p:8.9,c:27,f:2.6,kcal:164,label:"Ceci cotti"},"ceci":{p:20.5,c:61,f:6,kcal:364,label:"Ceci secchi"},
  "fagioli cotti":{p:8.7,c:22.8,f:0.5,kcal:127,label:"Fagioli cotti"},"fagioli":{p:21,c:60,f:1.2,kcal:333,label:"Fagioli secchi"},
  "fave":{p:7.9,c:17.6,f:0.6,kcal:88,label:"Fave fresche"},
  // Cereali e derivati
  "farro cotto":{p:5,c:26,f:0.5,kcal:127,label:"Farro cotto"},"farro":{p:15,c:67,f:2.5,kcal:340,label:"Farro crudo"},
  "quinoa cotta":{p:4.4,c:21,f:1.9,kcal:120,label:"Quinoa cotta"},"quinoa":{p:14,c:64,f:6,kcal:368,label:"Quinoa cruda"},
  "cous cous cotto":{p:3.8,c:23,f:0.2,kcal:112,label:"Cous cous cotto"},"cous cous":{p:12.8,c:77.4,f:0.6,kcal:376,label:"Cous cous crudo"},
  "orzo cotto":{p:2.3,c:28,f:0.4,kcal:123,label:"Orzo cotto"},"orzo":{p:10.4,c:70,f:1.4,kcal:354,label:"Orzo perlato crudo"},
  "riso integrale":{p:7.5,c:77,f:1.9,kcal:362,label:"Riso integrale crudo"},"polenta":{p:8.7,c:76,f:2.7,kcal:358,label:"Farina di mais (polenta)"},
  "grissini":{p:12,c:68,f:13,kcal:433,unit:8,label:"Grissini (1pz=8g)"},"crackers":{p:9.4,c:80,f:10,kcal:428,unit:8,label:"Crackers (1pz=8g)"},
  "piadina":{p:8,c:54,f:7,kcal:300,unit:120,label:"Piadina (1pz=120g)"},"gnocchi":{p:3.5,c:28,f:0.5,kcal:133,label:"Gnocchi di patate"},
  "fette biscottate":{p:11,c:76,f:6,kcal:408,unit:8,label:"Fetta biscottata (1pz=8g)"},
  "biscotti secchi":{p:7,c:80,f:8,kcal:416,unit:8,label:"Biscotti secchi (1pz=8g)"},
  "muesli":{p:10,c:62,f:8,kcal:367,label:"Muesli"},"cornflakes":{p:7.5,c:84,f:0.9,kcal:378,label:"Cornflakes"},
  "cornetto":{p:8,c:45,f:20,kcal:400,unit:60,label:"Cornetto (1pz=60g)"},
  // Affettati e formaggi
  "prosciutto crudo":{p:25.5,c:0,f:13,kcal:224,label:"Prosciutto crudo"},"prosciutto cotto":{p:19,c:1,f:7,kcal:145,label:"Prosciutto cotto"},
  "speck":{p:28,c:0.5,f:21,kcal:301,label:"Speck"},"fesa di tacchino":{p:19,c:1.5,f:2,kcal:104,label:"Fesa di tacchino affettata"},
  "mozzarella":{p:18,c:1,f:19,kcal:253,label:"Mozzarella"},"parmigiano":{p:33,c:0,f:29,kcal:392,label:"Parmigiano"},
  "grana":{p:33,c:0,f:29,kcal:398,label:"Grana"},"ricotta":{p:8.8,c:3.5,f:10.9,kcal:146,label:"Ricotta vaccina"},
  "fiocchi di latte":{p:11,c:3,f:4.5,kcal:99,label:"Fiocchi di latte"},"feta":{p:14,c:4,f:21,kcal:264,label:"Feta"},
  // Proteine varie
  "albumi":{p:10.7,c:0.7,f:0.2,kcal:43,unit:33,label:"Albumi (1pz=33g)"},"albume":{p:10.7,c:0.7,f:0.2,kcal:43,unit:33,label:"Albume (1pz=33g)"},"tofu":{p:8,c:1.9,f:4.8,kcal:76,label:"Tofu"},
  "seitan":{p:24,c:2,f:2,kcal:118,label:"Seitan"},
  "manzo magro":{p:22,c:0,f:4.5,kcal:129,label:"Manzo magro"},"vitello":{p:20.7,c:0,f:2.7,kcal:107,label:"Vitello"},
  "lonza di maiale":{p:21,c:0,f:7,kcal:146,label:"Lonza di maiale"},"salsiccia":{p:15,c:0,f:27,kcal:304,label:"Salsiccia"},
  "hamburger di manzo":{p:18,c:0,f:15,kcal:210,label:"Hamburger di manzo"},
  // Pesce
  "orata":{p:20.7,c:1,f:3.8,kcal:121,label:"Orata"},"branzino":{p:16.5,c:0.6,f:2.5,kcal:97,label:"Branzino/Spigola"},
  "spigola":{p:16.5,c:0.6,f:2.5,kcal:97,label:"Branzino/Spigola"},"sgombro":{p:18.7,c:0,f:14,kcal:205,label:"Sgombro"},
  "gamberi":{p:18,c:0.5,f:1,kcal:85,label:"Gamberi"},"polpo":{p:17.9,c:1.4,f:1,kcal:82,label:"Polpo"},
  "calamari":{p:15.6,c:2.4,f:1.7,kcal:92,label:"Calamari"},"sogliola":{p:16.9,c:0.8,f:1.7,kcal:86,label:"Sogliola"},
  "nasello":{p:17,c:0,f:0.3,kcal:71,label:"Nasello"},"pesce spada":{p:19.7,c:0,f:6.7,kcal:144,label:"Pesce spada"},
  "alici":{p:20,c:0,f:5,kcal:131,label:"Alici/Acciughe fresche"},"sardine":{p:20.8,c:0,f:4.5,kcal:129,label:"Sardine fresche"},
  // Frutta
  "ananas":{p:0.5,c:13,f:0.1,kcal:50,label:"Ananas"},"anguria":{p:0.6,c:7.5,f:0.2,kcal:30,label:"Anguria"},
  "melone":{p:0.8,c:8,f:0.2,kcal:33,label:"Melone"},"pesca":{p:0.9,c:9.5,f:0.3,kcal:39,unit:150,label:"Pesca (1pz=150g)"},
  "albicocca":{p:1.4,c:11,f:0.4,kcal:48,unit:45,label:"Albicocca (1pz=45g)"},"uva":{p:0.6,c:16,f:0.2,kcal:61,label:"Uva"},
  "ciliegie":{p:1,c:16,f:0.2,kcal:63,label:"Ciliegie"},"mango":{p:0.8,c:15,f:0.4,kcal:60,label:"Mango"},
  "avocado":{p:2,c:9,f:15,kcal:160,unit:200,label:"Avocado (1pz=200g)"},"mandarino":{p:0.8,c:13,f:0.3,kcal:53,unit:80,label:"Mandarino (1pz=80g)"},
  "prugna":{p:0.7,c:11,f:0.3,kcal:46,unit:60,label:"Prugna (1pz=60g)"},"fichi":{p:0.8,c:19,f:0.3,kcal:74,unit:50,label:"Fico (1pz=50g)"},
  "cachi":{p:0.6,c:18,f:0.2,kcal:70,unit:200,label:"Caco (1pz=200g)"},"melograno":{p:1.7,c:19,f:1.2,kcal:83,label:"Melograno"},
  "lamponi":{p:1.2,c:12,f:0.7,kcal:52,label:"Lamponi"},"mirtilli":{p:0.7,c:14,f:0.3,kcal:57,label:"Mirtilli"},
  // Frutta secca e semi
  "noci":{p:15,c:14,f:65,kcal:654,unit:5,label:"Noci (1 gheriglio=5g)"},"nocciole":{p:15,c:17,f:61,kcal:628,label:"Nocciole"},
  "pistacchi":{p:20,c:28,f:45,kcal:560,label:"Pistacchi"},"arachidi":{p:26,c:16,f:49,kcal:567,label:"Arachidi"},
  "anacardi":{p:18,c:30,f:44,kcal:553,label:"Anacardi"},"semi di chia":{p:17,c:42,f:31,kcal:486,label:"Semi di chia"},
  "semi di zucca":{p:30,c:11,f:49,kcal:559,label:"Semi di zucca"},"burro di arachidi":{p:25,c:20,f:50,kcal:588,label:"Burro di arachidi"},
  // Condimenti, latticini, varie
  "burro":{p:0.9,c:0.1,f:81,kcal:717,label:"Burro"},"zucchero":{p:0,c:100,f:0,kcal:387,label:"Zucchero"},
  "marmellata":{p:0.4,c:59,f:0.1,kcal:240,label:"Marmellata"},"cacao amaro":{p:20,c:58,f:14,kcal:228,label:"Cacao amaro"},
  "maionese":{p:1,c:2,f:75,kcal:680,label:"Maionese"},"ketchup":{p:1.2,c:26,f:0.2,kcal:112,label:"Ketchup"},
  "pesto":{p:5,c:8,f:46,kcal:470,label:"Pesto"},"passata di pomodoro":{p:1.4,c:5,f:0.2,kcal:30,label:"Passata di pomodoro"},
  "latte":{p:3.3,c:4.9,f:3.6,kcal:64,label:"Latte intero"},"latte di mandorla":{p:0.5,c:3,f:1.1,kcal:24,label:"Latte di mandorla"},
  "bevanda di avena":{p:0.3,c:8,f:1.5,kcal:45,label:"Bevanda di avena"},
  "succo di arancia":{p:0.7,c:10,f:0.2,kcal:45,label:"Succo di arancia"},
  "sushi":{p:7,c:25,f:2.5,kcal:150,label:"Sushi misto"},
};
const ALL_DB={...FOOD_DB,...GENERIC_DB};
const MEAL_SLOTS=[{id:"colazione",label:"Colazione",icon:"☀️"},{id:"spuntino1",label:"Spuntino mattino",icon:"🍎"},{id:"pranzo",label:"Pranzo",icon:"🥗"},{id:"spuntino2",label:"Spuntino pomeriggio",icon:"🍵"},{id:"cena",label:"Cena",icon:"🌙"}];
const WORKOUT_TYPES=[{id:"padel",label:"Padel",icon:"🎾",est:600},{id:"corpolibero",label:"Corpo libero",icon:"🤸",est:250},{id:"corsa",label:"Corsa",icon:"🏃",est:400},{id:"camminata",label:"Camminata",icon:"🚶",est:200},{id:"bici",label:"Bici",icon:"🚴",est:350},{id:"pesi",label:"Pesi / palestra",icon:"🏋️",est:300},{id:"nuoto",label:"Nuoto",icon:"🏊",est:450},{id:"altro",label:"Altro",icon:"💪",est:250}];
const DOW=["Domenica","Lunedì","Martedì","Mercoledì","Giovedì","Venerdì","Sabato"];

/* ============ HELPERS ============ */
const norm=s=>s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
function parseEntry(text,customFoods={}){
  const DB={...ALL_DB,...customFoods};
  const results=[],unknown=[];
  const parts=text.split(/[,\n]|\se\s|\+/).map(s=>s.trim()).filter(Boolean);
  for(const part of parts){
    const lower=norm(part); let grams=null,count=null;
    const kgM=lower.match(/(\d+(?:[.,]\d+)?)\s*(?:kg|chilo|chili)\b/);
    const ettoM=lower.match(/(\d+(?:[.,]\d+)?)\s*(?:etto|etti)\b/);
    const gM=lower.match(/(\d+(?:[.,]\d+)?)\s*(?:g|gr|grammi|ml)\b/), nM=lower.match(/^(\d+(?:[.,]\d+)?)\s+/);
    if(kgM)grams=parseFloat(kgM[1].replace(",","."))*1000;
    else if(ettoM)grams=parseFloat(ettoM[1].replace(",","."))*100;
    else if(gM)grams=parseFloat(gM[1].replace(",","."));else if(nM)count=parseFloat(nM[1].replace(",","."));
    let fk=null,bl=0; for(const k of Object.keys(DB)){if(lower.includes(norm(k))&&k.length>bl){fk=k;bl=k.length;}}
    if(!fk){unknown.push(part);continue;}
    const food=DB[fk]; let g;
    if(grams!=null)g=grams;else if(count!=null&&food.unit)g=count*food.unit;else if(count!=null)g=count*100;else if(food.unit)g=food.unit;else g=100;
    const fct=g/100;
    results.push({label:food.label,grams:Math.round(g),kcal:Math.round(food.kcal*fct),p:+(food.p*fct).toFixed(1),c:+(food.c*fct).toFixed(1),f:+(food.f*fct).toFixed(1)});
  }
  return {results,unknown};
}
const sum=items=>items.reduce((a,i)=>({kcal:a.kcal+i.kcal,p:a.p+i.p,c:a.c+i.c,f:a.f+i.f}),{kcal:0,c:0,p:0,f:0});
const todayKey=(d=new Date())=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const fmtDate=k=>{const d=new Date(k+"T12:00:00");return `${DOW[d.getDay()]} ${d.getDate()}/${d.getMonth()+1}`;};
const fmtShort=k=>{const d=new Date(k+"T12:00:00");return `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`;};

// ---- Open Food Facts: ricerca prodotti commerciali (gira nel browser dell'utente) ----
async function searchOFF(query){
  const url=`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=12&fields=product_name,brands,nutriments,serving_size,serving_quantity,image_small_url`;
  const res=await fetch(url,{headers:{"User-Agent":"NutriCoach - personal"}});
  const data=await res.json();
  return (data.products||[]).map(p=>{
    const n=p.nutriments||{};
    const kcal100=n["energy-kcal_100g"]??(n["energy_100g"]?n["energy_100g"]/4.184:null);
    if(kcal100==null)return null;
    return {name:[p.product_name,p.brands].filter(Boolean).join(" · ").slice(0,60)||"Prodotto senza nome",
      img:p.image_small_url||null,kcal100:Math.round(kcal100),
      p100:+(n["proteins_100g"]??0).toFixed(1),c100:+(n["carbohydrates_100g"]??0).toFixed(1),f100:+(n["fat_100g"]??0).toFixed(1),
      serving:p.serving_quantity?Math.round(p.serving_quantity):null,servingTxt:p.serving_size||null};
  }).filter(Boolean);
}

/* ============ MOTORE PIANO ============ */
function computePlan(p){
  // Mifflin-St Jeor
  const s = p.sex==="m" ? 5 : -161;
  const bmr = Math.round(10*p.weight + 6.25*p.height - 5*p.age + s);
  const actMult = {sedentario:1.2, leggero:1.375, moderato:1.55, attivo:1.725}[p.activity] || 1.375;
  // kcal extra dagli allenamenti settimanali spalmate sul giorno medio
  const weeklyBurn = (p.workouts||[]).reduce((a,w)=>a + w.kcalEst*w.perWeek, 0);
  const tdee = Math.round(bmr*actMult + weeklyBurn/7);
  // obiettivo -> deficit/surplus
  const adj = {dimagrire:-0.18, ricomposizione:-0.10, mantenimento:0, massa:0.10}[p.goal];
  let targetKcal = Math.round(tdee*(1+adj));
  // applica aggiustamento appreso dai dati
  if(p.learnedAdjustment) targetKcal += p.learnedAdjustment;
  // proteine in base a peso e obiettivo
  const pPerKg = {dimagrire:2.0, ricomposizione:2.0, mantenimento:1.8, massa:2.0}[p.goal];
  const protein = Math.round(p.weight*pPerKg);
  const fat = Math.round(p.weight*0.9); // ~0.9 g/kg
  const carbsKcal = targetKcal - (protein*4 + fat*9);
  const carbs = Math.max(80, Math.round(carbsKcal/4));
  // giorni sport: +carbo +kcal
  const sportKcal = targetKcal + 200;
  const sportCarbs = carbs + Math.round(200/4);
  return { bmr, tdee, weeklyBurn:Math.round(weeklyBurn), targetKcal, protein, carbs, fat,
    sport:{kcal:sportKcal, p:protein, c:sportCarbs, f:fat} };
}

/* analisi storica per proporre aggiustamenti */
function analyzeHistory(days, prevPlan){
  const keys = Object.keys(days).filter(k=>Object.values(days[k].logs||{}).flat().length);
  if(keys.length<3) return null;
  let totKcal=0,totP=0,n=0,burnDays=0,totBurn=0;
  keys.forEach(k=>{
    const t=sum(Object.values(days[k].logs).flat());
    totKcal+=t.kcal; totP+=t.p; n++;
    const b=(days[k].workouts||[]).reduce((a,w)=>a+w.kcal,0);
    if(b>0){burnDays++; totBurn+=b;}
  });
  const avgKcal=Math.round(totKcal/n), avgP=Math.round(totP/n);
  const tgt = prevPlan ? prevPlan.targetKcal : avgKcal;
  const gap = avgKcal - tgt;
  let suggestion=0, note="";
  if(gap > 200){ suggestion = Math.round(gap*0.5); note=`Negli ultimi ${n} giorni hai mediamente superato il target di ${gap} kcal. Suggerisco di alzare leggermente il target (più realistico e sostenibile) di +${suggestion} kcal, oppure di lavorare sulle porzioni.`; }
  else if(gap < -250){ suggestion = Math.round(gap*0.4); note=`Mediamente sei sotto il target di ${Math.abs(gap)} kcal: rischi un deficit troppo aggressivo. Suggerisco di ridurre il target di ${Math.abs(suggestion)} kcal per proteggere la massa muscolare.`; }
  else { note=`Buona aderenza: media ${avgKcal} kcal vs target ${tgt}. Nessun grande aggiustamento necessario.`; }
  return { n, avgKcal, avgP, burnDays, avgBurn: burnDays?Math.round(totBurn/burnDays):0, gap, suggestion, note, proteinLow: avgP < (prevPlan?prevPlan.protein*0.85:100) };
}

/* trova piano valido per una data */
function planForDate(plans, dateKey){
  if(!plans.length) return null;
  const valid = plans.filter(p=>p.validFrom<=dateKey).sort((a,b)=>b.validFrom.localeCompare(a.validFrom));
  return valid[0] || null;
}

/* ============ APP ============ */
class ErrorBoundary extends Component{
  constructor(p){super(p);this.state={err:null};}
  static getDerivedStateFromError(e){return{err:e};}
  render(){
    if(this.state.err)return(
      <div style={{fontFamily:"sans-serif",background:"var(--bg)",minHeight:"100vh",color:"var(--text)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
        <div style={{textAlign:"center",maxWidth:420}}>
          <div style={{fontSize:40,marginBottom:12}}>🛟</div>
          <h2 style={{margin:"0 0 8px",fontSize:18}}>Qualcosa è andato storto</h2>
          <p style={{fontSize:13,color:"var(--text-soft)",lineHeight:1.6}}>I tuoi dati sono al sicuro. Ricarica l'app per riprendere.</p>
          <button onClick={()=>location.reload()} style={{marginTop:12,padding:"10px 20px",borderRadius:8,border:"none",background:"var(--accent)",color:"#fff",fontWeight:700,cursor:"pointer"}}>Ricarica</button>
        </div>
      </div>);
    return this.props.children;
  }
}

export default function App(){return <ErrorBoundary><AppInner/></ErrorBoundary>;}

/* ============ TEMI ============ */
const THEMES={
  midnight:{
    name:"Midnight",
    "--bg":"#0F172A","--surface":"#1E293B","--border":"#334155","--muted":"#475569",
    "--text-dim":"#64748B","--text-soft":"#94A3B8","--text":"#E2E8F0","--text-strong":"#F1F5F9",
    "--accent":"#3B82F6","--accent-deep":"#1D4ED8","--accent-2":"#06B6D4","--accent-light":"#60A5FA",
    "--header-from":"#1E3A5F","--header-to":"#0F172A",
  },
  fresh:{
    name:"Fresh",
    "--bg":"#F6F7F4","--surface":"#FFFFFF","--border":"#E4E8E0","--muted":"#A8B0A4",
    "--text-dim":"#7C8579","--text-soft":"#5C6657","--text":"#26402D","--text-strong":"#16331F",
    "--accent":"#2F7D4F","--accent-deep":"#236340","--accent-2":"#7BAE7F","--accent-light":"#2F7D4F",
    "--header-from":"#E8EDE3","--header-to":"#F6F7F4",
  },
};
function applyTheme(key){
  const t=THEMES[key]||THEMES.midnight;
  const root=document.documentElement;
  Object.entries(t).forEach(([k,v])=>{ if(k.startsWith("--"))root.style.setProperty(k,v); });
  root.style.setProperty("color-scheme", key==="fresh"?"light":"dark");
}

function AppInner(){
  const [tab,setTab]=useState("oggi");
  const [selectedDate,setSelectedDate]=useState(todayKey());
  const [days,setDays]=useState({});
  const [plans,setPlans]=useState([]); // array di piani versionati
  const [loaded,setLoaded]=useState(false);
  const [inputs,setInputs]=useState({});
  const [openSlot,setOpenSlot]=useState("colazione");
  const [warnings,setWarnings]=useState({});
  const [searchSlot,setSearchSlot]=useState(null);
  const [searchQ,setSearchQ]=useState("");
  const [searchRes,setSearchRes]=useState([]);
  const [searching,setSearching]=useState(false);
  const [searchErr,setSearchErr]=useState(null);
  const [newFood,setNewFood]=useState(null); // {slot,name,kcal,p,c,f,grams}
  const [estimate,setEstimate]=useState(null); // {slot, mode, loading, error, rows, fromPhoto, scaleObjectFound, scaleNote, contextText}
  const [menu,setMenu]=useState(null); // {plan, loading, error, data, dayLabel}
  const [woType,setWoType]=useState("padel");const [woKcal,setWoKcal]=useState("");const [woDur,setWoDur]=useState("");const [woNote,setWoNote]=useState("");
  const [wizard,setWizard]=useState(null); // stato wizard creazione piano
  const [weights,setWeights]=useState({}); // {dateKey: kg}
  const [customFoods,setCustomFoods]=useState({}); // {nome: {p,c,f,kcal,label,unit?}}
  const [theme,setTheme]=useState(()=>{ try{return localStorage.getItem("nc-theme")||"midnight";}catch(e){return "midnight";} });
  useEffect(()=>{ applyTheme(theme); try{localStorage.setItem("nc-theme",theme);}catch(e){} },[theme]);
  // ---- Autenticazione ----
  const [authUser,setAuthUser]=useState(null);     // utente loggato (o null)
  const [authReady,setAuthReady]=useState(!syncConfigured); // se sync off, l'app parte subito
  const [recoveryMode,setRecoveryMode]=useState(false); // true quando arriva da link reset password
  const [welcome,setWelcome]=useState(null); // alias da mostrare nel benvenuto
  const [wInput,setWInput]=useState("");
  const [syncState,setSyncState]=useState({status:"off",last:null}); // off|connecting|synced|error|saving
  const pushTimer=useRef(null);
  const latestPayload=useRef(null);

  // Flush immediato quando l'app va in background (iOS può congelare la PWA)
  useEffect(()=>{
    const flush=()=>{
      if(!syncConfigured||!latestPayload.current)return;
      if(pushTimer.current){clearTimeout(pushTimer.current);pushTimer.current=null;}
      pushRemote(latestPayload.current);
    };
    const onVis=()=>{if(document.visibilityState==="hidden")flush();};
    document.addEventListener("visibilitychange",onVis);
    window.addEventListener("pagehide",flush);
    return ()=>{document.removeEventListener("visibilitychange",onVis);window.removeEventListener("pagehide",flush);};
  },[]);

  // helper: applica un payload a tutti gli stati
  const applyPayload=(d)=>{ if(!d)return; setDays(d.days||{}); setPlans(d.plans||[]); setWeights(d.weights||{}); setCustomFoods(d.customFoods||{}); };
  const blankPayload=()=>{ setDays({}); setPlans([]); setWeights({}); setCustomFoods({}); };

  // Carica i dati per l'utente loggato (cloud, con fallback al locale dello stesso account)
  const loadForUser=async(uid)=>{
    setSyncState({status:"connecting",last:null});
    const remote=await pullRemote();
    const lsKey="tracker-v4-"+uid;
    let localPayload=null;
    try{const raw=localStorage.getItem(lsKey);if(raw)localPayload=JSON.parse(raw);}catch(e){}
    const localTs=parseInt(localStorage.getItem(lsKey+"-ts")||"0");
    const remoteTs=remote?.updatedAt?new Date(remote.updatedAt).getTime():0;
    if(remote&&remote.payload&&remoteTs>=localTs){
      applyPayload(remote.payload);
      try{localStorage.setItem(lsKey,JSON.stringify(remote.payload));localStorage.setItem(lsKey+"-ts",String(remoteTs));}catch(e){}
    }else if(localPayload){
      applyPayload(localPayload);
      pushRemote(localPayload);
    }else{
      blankPayload();
    }
    setSyncState({status:"synced",last:Date.now()});
    setLoaded(true);
  };

  // 1) avvio: se sync OFF carica da localStorage; se ON aspetta il login
  useEffect(()=>{
    if(!syncConfigured){
      try{const raw=localStorage.getItem("tracker-v4");if(raw)applyPayload(JSON.parse(raw));}catch(e){}
      setLoaded(true);
      return;
    }
    (async()=>{
      // intercetta il ritorno dal link di recupero password
      if(typeof window!=="undefined" && window.location.hash.includes("type=recovery")) setRecoveryMode(true);
      const session=await getSession();
      const user=session?.user||null;
      setAuthUser(user);
      if(user){ await loadForUser(user.id); }
      setAuthReady(true);
    })();
    const off=onAuthChange((event,session)=>{
      if(event==="PASSWORD_RECOVERY"){ setRecoveryMode(true); return; }
      const u=session?.user||null;
      setAuthUser(u);
      if(u){ loadForUser(u.id); }
      if(event==="SIGNED_OUT"){ blankPayload(); setLoaded(false); }
    });
    return off;
  },[]);

  // 2) salva su localStorage sempre + push al cloud con debounce
  useEffect(()=>{
    if(!loaded)return;
    const payload={days,plans,weights,customFoods};
    latestPayload.current=payload;
    const lsKey = syncConfigured && authUser ? "tracker-v4-"+authUser.id : "tracker-v4";
    try{localStorage.setItem(lsKey,JSON.stringify(payload));localStorage.setItem(lsKey+"-ts",String(Date.now()));}catch(e){console.error(e);}
    if(syncConfigured && authUser){
      if(pushTimer.current)clearTimeout(pushTimer.current);
      setSyncState(s=>({...s,status:"saving"}));
      pushTimer.current=setTimeout(async()=>{
        const ok=await pushRemote(payload);
        setSyncState({status:ok?"synced":"error",last:ok?Date.now():null});
      },1200);
    }
  },[days,plans,weights,customFoods,loaded,authUser]);

  // logout
  const doLogout=async()=>{ await signOut(); setAuthUser(null); setLoaded(false); blankPayload(); setTab("oggi"); };

  const activePlan = planForDate(plans, selectedDate);
  const curDay=days[selectedDate]||{dayType:"normale",logs:{},workouts:[]};
  const dayType=curDay.dayType,logs=curDay.logs,workouts=curDay.workouts||[];
  const dow=new Date(selectedDate+"T12:00:00").getDay();
  const freeSlotsToday = activePlan ? (activePlan.freeMeals?.[dow]||[]) : [];

  // target dal piano attivo (fallback se nessun piano)
  const target = activePlan ? (dayType==="padel"?{kcal:activePlan.sport.kcal,p:activePlan.sport.p,c:activePlan.sport.c,f:activePlan.sport.f}:{kcal:activePlan.targetKcal,p:activePlan.protein,c:activePlan.carbs,f:activePlan.fat}) : {kcal:2000,p:120,c:200,f:60};

  const updateDay=patch=>setDays(prev=>{const ex=prev[selectedDate]||{dayType:"normale",logs:{},workouts:[]};return{...prev,[selectedDate]:{...ex,...patch}};});
  const setDayType=t=>updateDay({dayType:t});
  const allItems=useMemo(()=>Object.values(logs).flat(),[logs]);
  const totals=useMemo(()=>sum(allItems),[allItems]);
  const burned=workouts.reduce((a,w)=>a+(w.kcal||0),0);const netKcal=totals.kcal-burned;

  const addEntry=slotId=>{const text=(inputs[slotId]||"").trim();if(!text)return;const{results,unknown}=parseEntry(text,customFoods);if(results.length)updateDay({logs:{...logs,[slotId]:[...(logs[slotId]||[]),...results]}});setWarnings(p=>({...p,[slotId]:unknown}));setInputs(p=>({...p,[slotId]:""}));};
  const removeItem=(slotId,idx)=>updateDay({logs:{...logs,[slotId]:logs[slotId].filter((_,i)=>i!==idx)}});
  const addProduct=(slotId,prod,grams)=>{const fct=grams/100;const item={label:prod.name,grams:Math.round(grams),kcal:Math.round(prod.kcal100*fct),p:+(prod.p100*fct).toFixed(1),c:+(prod.c100*fct).toFixed(1),f:+(prod.f100*fct).toFixed(1)};updateDay({logs:{...logs,[slotId]:[...(logs[slotId]||[]),item]}});};
  const runSearch=async()=>{const q=searchQ.trim();if(!q)return;setSearching(true);setSearchErr(null);setSearchRes([]);try{const r=await searchOFF(q);if(!r.length)setSearchErr("Nessun prodotto trovato. Prova con marca + nome (es: 'muller caffè').");setSearchRes(r);}catch(e){setSearchErr("Ricerca non disponibile (connessione o troppe richieste). Riprova tra poco.");}setSearching(false);};

  // ---- Stima nutrizionale (testo o foto) ----
  const openEstimate=slot=>setEstimate({slot,mode:"choose",loading:false,error:null,rows:[],fromPhoto:false,scaleObjectFound:null,scaleNote:"",contextText:""});
  const doEstimateText=async()=>{
    const t=(estimate.contextText||"").trim(); if(!t)return;
    setEstimate(e=>({...e,loading:true,error:null}));
    try{
      const res=await estimateFromText(t);
      setEstimate(e=>({...e,loading:false,fromPhoto:false,scaleObjectFound:null,scaleNote:res.scaleNote||"",rows:(res.items||[]).map(toRow)}));
    }catch(err){setEstimate(e=>({...e,loading:false,error:err.message}));}
  };
  const doEstimatePhoto=async(file)=>{
    if(!file)return;
    setEstimate(e=>({...e,loading:true,error:null,fromPhoto:true}));
    try{
      const res=await estimateFromPhoto(file,estimate.contextText||"");
      setEstimate(e=>({...e,loading:false,fromPhoto:true,scaleObjectFound:res.scaleObjectFound,scaleNote:res.scaleNote||"",rows:(res.items||[]).map(r=>toRow(r,true))}));
    }catch(err){setEstimate(e=>({...e,loading:false,error:err.message}));}
  };
  const toRow=(it,fromPhoto=false)=>({...it,include:true,fromPhoto, confidence: fromPhoto && it.confidence==="alta" ? "media" : it.confidence});
  const updateRow=(i,patch)=>setEstimate(e=>{const rows=[...e.rows];rows[i]={...rows[i],...patch};return{...e,rows};});
  const insertEstimateRows=()=>{
    const sel=estimate.rows.filter(r=>r.include);
    if(!sel.length){setEstimate(null);return;}
    const newItems=sel.map(r=>{
      const fct=r.grams/100;
      const src=r.fromPhoto?` (foto${estimate.contextText?"":""})`:"";
      const dishCtx=estimate.contextText?` da ${estimate.contextText.slice(0,30)}`:"";
      return {label:`${r.name}${r.fromPhoto?` · recuperato da piatto${dishCtx} (foto)`:dishCtx?`·${dishCtx}`:""}`,
        grams:Math.round(r.grams),kcal:Math.round(r.kcal100*fct),p:+(r.p100*fct).toFixed(1),c:+(r.c100*fct).toFixed(1),f:+(r.f100*fct).toFixed(1),
        est:true, fromPhoto:r.fromPhoto, conf:r.confidence};
    });
    // salva eventuali come alimenti personalizzati ⭐
    const customAdds={};
    sel.forEach(r=>{if(r.saveCustom){customAdds[r.name.toLowerCase()]={p:r.p100,c:r.c100,f:r.f100,kcal:r.kcal100,label:r.name+" ⭐"};}});
    if(Object.keys(customAdds).length)setCustomFoods(prev=>({...prev,...customAdds}));
    updateDay({logs:{...logs,[estimate.slot]:[...(logs[estimate.slot]||[]),...newItems]}});
    setEstimate(null);
  };
  const clearDay=()=>updateDay({logs:{},workouts:[]});
  const addWorkout=()=>{const kcal=parseInt(woKcal);if(!kcal||kcal<=0)return;const t=WORKOUT_TYPES.find(w=>w.id===woType);updateDay({workouts:[...workouts,{id:Date.now(),type:woType,label:t.label,icon:t.icon,kcal,dur:woDur?parseInt(woDur):null,note:woNote.trim()||null}]});setWoKcal("");setWoDur("");setWoNote("");};
  const removeWorkout=id=>updateDay({workouts:workouts.filter(w=>w.id!==id)});
  const saveWeight=()=>{const v=parseFloat(wInput.replace(",","."));if(!v||v<=0)return;setWeights(prev=>({...prev,[selectedDate]:+v.toFixed(1)}));setWInput("");};
  const removeWeight=k=>setWeights(prev=>{const c={...prev};delete c[k];return c;});

  const pct=(v,t)=>Math.round((v/t)*100),diff=(v,t)=>Math.round(v-t);
  const macroBar=(label,val,tgt,color)=>{const p=Math.min(pct(val,tgt),130),over=val>tgt;return(
    <div style={{marginBottom:14}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:5,fontSize:13}}>
        <span style={{color:"var(--text)",fontWeight:600}}>{label}</span>
        <span style={{color:"var(--text-soft)"}}><strong style={{color}}>{Math.round(val)}</strong> / {tgt}g <span style={{color:over?"#F87171":diff(val,tgt)<-tgt*0.2?"#FBBF24":"#34D399",marginLeft:6,fontSize:11}}>({diff(val,tgt)>=0?"+":""}{diff(val,tgt)})</span></span>
      </div>
      <div style={{height:9,background:"var(--bg)",borderRadius:5,overflow:"hidden"}}><div style={{height:"100%",width:`${(p/130)*100}%`,background:over?"#F87171":color,borderRadius:5,transition:"width .5s"}}/></div>
    </div>);};

  const kcalPct=pct(totals.kcal,target.kcal),pPct=pct(totals.p,target.p);
  let verdict={txt:activePlan?"Inizia a registrare i pasti":"Crea il tuo piano nella scheda 🎯 Piano",color:"var(--text-dim)",emoji:activePlan?"📝":"🎯"};
  if(allItems.length){
    if(freeSlotsToday.length)verdict={txt:"Giorno con pasto libero — goditelo senza sensi di colpa",color:"#FCD34D",emoji:"🎉"};
    else if(kcalPct>=85&&kcalPct<=110&&pPct>=85)verdict={txt:"Allineato al piano! Ottimo equilibrio",color:"#34D399",emoji:"✅"};
    else if(kcalPct>110)verdict={txt:"Sopra il target calorico — modera le porzioni",color:"#F87171",emoji:"⚠️"};
    else if(kcalPct<70)verdict={txt:"Sotto al target — mangia a sufficienza",color:"#FBBF24",emoji:"⬇️"};
    else if(pPct<75)verdict={txt:"Proteine basse — aggiungi una fonte proteica",color:"#FBBF24",emoji:"🥩"};
    else verdict={txt:"Sulla buona strada, continua così",color:"var(--accent-light)",emoji:"👍"};
  }

  const historyKeys=useMemo(()=>Object.keys(days).filter(k=>{const d=days[k];return Object.values(d.logs||{}).flat().length||(d.workouts||[]).length;}).sort().reverse(),[days]);

  const savePlan=(plan)=>{ setPlans(prev=>[...prev.filter(p=>p.validFrom!==plan.validFrom), plan]); setWizard(null); setTab("piano"); };

  // ---- Menù del giorno dal piano attivo ----
  const DOW_FULL=["Domenica","Lunedì","Martedì","Mercoledì","Giovedì","Venerdì","Sabato"];
  const SLOT_MAP={colazione:"colazione",spuntino_mattina:"spuntino1",pranzo:"pranzo",spuntino_pomeriggio:"spuntino2",cena:"cena"};
  const openMenu=(plan)=>{ setMenu({plan,loading:false,error:null,data:null,dayIdx:new Date(selectedDate+"T12:00:00").getDay()}); };
  const fetchMenu=async(plan,dayIdx)=>{
    setMenu(m=>({...m,loading:true,error:null}));
    const isSport=(dayType==="padel");
    const freeSlots=(plan.freeMeals?.[dayIdx]||[]).map(s=>({colazione:"colazione",spuntino1:"spuntino_mattina",pranzo:"pranzo",spuntino2:"spuntino_pomeriggio",cena:"cena"}[s])).filter(Boolean);
    const payload={
      kcal:isSport?plan.sport.kcal:plan.targetKcal, protein:plan.protein,
      carbs:isSport?plan.sport.c:plan.carbs, fat:plan.fat,
      likes:plan.likes||[], dislikes:plan.dislikes||[], isSport, freeMeals:freeSlots,
      dayLabel:DOW_FULL[dayIdx], seed:Math.floor(Math.random()*1e6),
    };
    try{ const res=await generateMenu(payload); setMenu(m=>({...m,loading:false,data:res})); }
    catch(err){ setMenu(m=>({...m,loading:false,error:err.message})); }
  };
  // Inserisce gli ingredienti di un pasto suggerito nel diario del giorno selezionato
  const addMenuMeal=(slotKey,meal)=>{
    const targetSlot=SLOT_MAP[slotKey]; if(!targetSlot||!meal)return;
    const DB={...ALL_DB,...customFoods};
    const items=(meal.ingredienti||[]).map(ing=>{
      // prova a usare valori reali dal DB se l'ingrediente è noto, altrimenti ripartisci i macro del pasto
      let fk=null,bl=0; const n=norm(ing.nome); for(const k of Object.keys(DB)){if(n.includes(norm(k))&&k.length>bl){fk=k;bl=k.length;}}
      if(fk){const food=DB[fk];const fct=ing.grammi/100;return{label:food.label+" · da menù",grams:ing.grammi,kcal:Math.round(food.kcal*fct),p:+(food.p*fct).toFixed(1),c:+(food.c*fct).toFixed(1),f:+(food.f*fct).toFixed(1),fromMenu:true};}
      return null;
    }).filter(Boolean);
    // ingredienti non noti: aggiungili come singola voce stimata col residuo dei macro del pasto
    const known=items.reduce((a,i)=>({k:a.k+i.kcal,p:a.p+i.p,c:a.c+i.c,f:a.f+i.f}),{k:0,p:0,c:0,f:0});
    const resK=Math.max(0,(meal.kcal||0)-known.k);
    if(resK>30){ items.push({label:meal.titolo+" (resto piatto) · da menù",grams:0,kcal:resK,p:Math.max(0,+( (meal.p||0)-known.p).toFixed(1)),c:Math.max(0,+((meal.c||0)-known.c).toFixed(1)),f:Math.max(0,+((meal.f||0)-known.f).toFixed(1)),fromMenu:true,est:true}); }
    if(!items.length)return;
    setDays(prev=>{const ex=prev[selectedDate]||{dayType:"normale",logs:{},workouts:[]};const cur=ex.logs[targetSlot]||[];return{...prev,[selectedDate]:{...ex,logs:{...ex.logs,[targetSlot]:[...cur,...items]}}};});
  };
  const addAllMenu=(data)=>{ Object.entries(data.meals||{}).forEach(([k,m])=>addMenuMeal(k,m)); setMenu(null); setTab("oggi"); };

  // ---- Gate autenticazione ----
  if(syncConfigured && !authReady) return <div style={{background:"var(--bg)",minHeight:"100vh",color:"var(--text-dim)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"sans-serif"}}>Caricamento…</div>;
  if(syncConfigured && recoveryMode) return <ResetPasswordScreen theme={theme} onDone={()=>{setRecoveryMode(false); if(typeof window!=="undefined"){window.location.hash="";}}}/>;
  if(syncConfigured && !authUser) return <AuthScreen theme={theme} setTheme={setTheme} onWelcome={a=>setWelcome(a)}/>;

  if(!loaded)return <div style={{background:"var(--bg)",minHeight:"100vh",color:"var(--text-dim)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"sans-serif"}}>Caricamento…</div>;

  return(
    <div style={{fontFamily:"'Inter','Segoe UI',sans-serif",background:"var(--bg)",minHeight:"100vh",color:"var(--text)"}}>
      <div style={{background:"linear-gradient(135deg,var(--header-from),var(--header-to))",borderBottom:"1px solid var(--surface)",padding:"22px 16px 0"}}>
        <div style={{maxWidth:720,margin:"0 auto"}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:6}}>
            <img src="/icon-192.png" alt="" style={{width:36,height:36,borderRadius:10}}/>
            <div><h1 style={{margin:0,fontSize:19,fontWeight:700,color:"var(--text-strong)"}}>NutriCoach</h1><p style={{margin:0,fontSize:12,color:"var(--text-dim)"}}>{authUser?`Ciao, ${aliasOf(authUser)} 👋`:"Piano su misura · diario · allenamenti · storico versioni"}</p></div>
            {syncConfigured&&<div onClick={()=>setTab("sync")} style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:6,cursor:"pointer",fontSize:11,color:"var(--text-dim)"}}><span style={{width:8,height:8,borderRadius:"50%",background:{synced:"#34D399",saving:"#FBBF24",connecting:"var(--accent-light)",error:"#F87171",off:"var(--muted)"}[syncState.status]}}/>{({synced:"Sincronizzato",saving:"Salvataggio…",connecting:"Connessione…",error:"Offline",off:""})[syncState.status]}</div>}
          </div>
          <div style={{display:"flex",gap:0,marginTop:14,overflowX:"auto"}}>
            {[["oggi","📝 Diario"],["piano","🎯 Piano"],["allenamenti","🔥 Workout"],["peso","⚖️ Peso"],["coach","🧭 Coach"],["storico","📅 Storico"],["sync","☁️ Sync"]].map(([id,l])=>(
              <button key={id} onClick={()=>setTab(id)} style={{padding:"10px 14px",fontSize:13,fontWeight:600,border:"none",cursor:"pointer",background:"transparent",whiteSpace:"nowrap",color:tab===id?"var(--accent-light)":"var(--text-dim)",borderBottom:tab===id?"2px solid var(--accent)":"2px solid transparent"}}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{maxWidth:720,margin:"0 auto",padding:"18px 14px 60px"}}>
        {welcome&&(
          <div onClick={()=>setWelcome(null)} style={{background:"linear-gradient(135deg,var(--accent),var(--accent-deep))",borderRadius:12,padding:"14px 16px",marginBottom:14,color:"#fff",display:"flex",alignItems:"center",gap:10,cursor:"pointer"}}>
            <span style={{fontSize:22}}>🎉</span>
            <div style={{flex:1}}><div style={{fontSize:14,fontWeight:700}}>Bentornato, {welcome}!</div><div style={{fontSize:11,opacity:0.9}}>I tuoi dati sono sincronizzati. Tocca per chiudere.</div></div>
          </div>
        )}

        {(tab==="oggi"||tab==="allenamenti")&&(
          <div style={{display:"flex",gap:8,marginBottom:14,alignItems:"center",flexWrap:"wrap"}}>
            <input type="date" value={selectedDate} max={todayKey()} onChange={e=>{setSelectedDate(e.target.value);setOpenSlot("colazione");}} style={{padding:"7px 10px",borderRadius:8,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text)",fontSize:13,colorScheme:"dark"}}/>
            {selectedDate!==todayKey()&&<button onClick={()=>setSelectedDate(todayKey())} style={{padding:"7px 10px",borderRadius:8,border:"1px solid var(--border)",background:"transparent",color:"var(--accent-light)",fontSize:12,cursor:"pointer"}}>→ Oggi</button>}
            {activePlan && <span style={{fontSize:11,color:"var(--text-dim)",marginLeft:4}}>Piano attivo dal {fmtShort(activePlan.validFrom)}</span>}
            <div style={{display:"flex",gap:6,marginLeft:"auto"}}>
              {[["normale","Normale"],["padel","🎾 Sport"]].map(([id,lbl])=>(<button key={id} onClick={()=>setDayType(id)} style={{padding:"6px 12px",borderRadius:8,border:"none",cursor:"pointer",fontSize:12,fontWeight:600,background:dayType===id?"linear-gradient(135deg,var(--accent),var(--accent-deep))":"var(--surface)",color:dayType===id?"#fff":"var(--text-soft)",outline:dayType===id?"none":"1px solid var(--border)"}}>{lbl}</button>))}
            </div>
          </div>
        )}

        {/* ===== DIARIO ===== */}
        {tab==="oggi"&&(<>
          {!activePlan && (
            <div onClick={()=>setTab("piano")} style={{background:"linear-gradient(135deg,var(--header-from),var(--surface))",border:"1px solid var(--accent)",borderRadius:12,padding:16,marginBottom:14,cursor:"pointer"}}>
              <div style={{fontSize:14,fontWeight:700,color:"#93C5FD",marginBottom:4}}>🎯 Crea il tuo piano personalizzato</div>
              <div style={{fontSize:12,color:"var(--text-soft)"}}>Rispondi a poche domande e genero target calorico e macro su misura. Tocca qui per iniziare.</div>
            </div>
          )}
          {freeSlotsToday.length>0&&<div style={{background:"linear-gradient(135deg,#D9770622,#B4530922)",border:"1px solid #D9770644",borderRadius:10,padding:"10px 14px",marginBottom:14,fontSize:12,color:"#FCD34D"}}>🎉 Pasto libero previsto oggi: <strong>{freeSlotsToday.map(s=>MEAL_SLOTS.find(m=>m.id===s)?.label).join(", ")}</strong></div>}

          <div style={{background:"var(--surface)",borderRadius:14,padding:18,marginBottom:16,border:"1px solid var(--border)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:16,flexWrap:"wrap",gap:8}}>
              <div><div style={{fontSize:11,color:"var(--text-dim)",marginBottom:2}}>CALORIE · {fmtDate(selectedDate).toUpperCase()}</div><div style={{fontSize:32,fontWeight:800,color:kcalPct>110?"#F87171":"var(--accent-light)",lineHeight:1}}>{Math.round(totals.kcal)}<span style={{fontSize:16,color:"var(--muted)",fontWeight:600}}> / {target.kcal}</span></div></div>
              <div style={{textAlign:"right"}}><div style={{fontSize:11,color:"var(--text-dim)"}}>Differenza</div><div style={{fontSize:20,fontWeight:800,color:diff(totals.kcal,target.kcal)>0?"#F87171":"#34D399"}}>{diff(totals.kcal,target.kcal)>=0?"+":""}{diff(totals.kcal,target.kcal)} kcal</div></div>
            </div>
            <div style={{height:11,background:"var(--bg)",borderRadius:6,overflow:"hidden",marginBottom:18}}><div style={{height:"100%",width:`${Math.min(kcalPct,100)}%`,background:kcalPct>110?"#F87171":"linear-gradient(90deg,var(--accent),var(--accent-2))",borderRadius:6,transition:"width .5s"}}/></div>
            {macroBar("Proteine",totals.p,target.p,"var(--accent)")}{macroBar("Carboidrati",totals.c,target.c,"#F59E0B")}{macroBar("Grassi",totals.f,target.f,"#10B981")}
            {burned>0&&<div style={{display:"flex",gap:10,marginTop:6,marginBottom:6}}><div style={{flex:1,background:"var(--bg)",borderRadius:10,padding:"10px 12px"}}><div style={{fontSize:10,color:"var(--text-dim)"}}>🔥 BRUCIATE</div><div style={{fontSize:18,fontWeight:800,color:"#FB923C"}}>{burned} kcal</div></div><div style={{flex:1,background:"var(--bg)",borderRadius:10,padding:"10px 12px"}}><div style={{fontSize:10,color:"var(--text-dim)"}}>⚖️ NETTO</div><div style={{fontSize:18,fontWeight:800,color:"#A78BFA"}}>{Math.round(netKcal)} kcal</div></div></div>}
            <div style={{marginTop:8,background:"var(--bg)",borderRadius:10,padding:"12px 14px",display:"flex",alignItems:"center",gap:10,borderLeft:`3px solid ${verdict.color}`}}><span style={{fontSize:20}}>{verdict.emoji}</span><span style={{fontSize:13,color:verdict.color,fontWeight:600}}>{verdict.txt}</span></div>
            <div style={{marginTop:10,display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:12,color:"var(--text-dim)",flex:1}}>⚖️ Peso del giorno {weights[selectedDate]?`: ${weights[selectedDate]} kg`:""}</span>
              <input value={wInput} onChange={e=>setWInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")saveWeight();}} placeholder={weights[selectedDate]?"aggiorna":"es. 64.5"} inputMode="decimal" style={{width:90,padding:"7px 10px",borderRadius:8,border:"1px solid var(--border)",background:"var(--bg)",color:"var(--text)",fontSize:13,outline:"none"}}/>
              <button onClick={saveWeight} style={{padding:"7px 12px",borderRadius:8,border:"none",background:"var(--accent-deep)",color:"#fff",fontWeight:700,cursor:"pointer",fontSize:12}}>Salva</button>
            </div>
          </div>

          {MEAL_SLOTS.map(slot=>{const items=logs[slot.id]||[],st=sum(items),open=openSlot===slot.id,isFree=freeSlotsToday.includes(slot.id);return(
            <div key={slot.id} style={{background:"var(--surface)",borderRadius:12,marginBottom:10,border:isFree?"1px solid #D9770655":"1px solid var(--border)",overflow:"hidden"}}>
              <button onClick={()=>setOpenSlot(open?null:slot.id)} style={{width:"100%",background:"none",border:"none",cursor:"pointer",padding:"13px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:18}}>{slot.icon}</span><span style={{fontSize:14,fontWeight:700,color:"var(--text-strong)"}}>{slot.label}</span>{isFree&&<span style={{fontSize:10,background:"#D9770633",color:"#FCD34D",borderRadius:8,padding:"2px 7px"}}>LIBERO</span>}{items.length>0&&<span style={{fontSize:11,background:"var(--bg)",color:"var(--accent-light)",borderRadius:10,padding:"2px 8px"}}>{items.length}</span>}</div>
                <div style={{display:"flex",alignItems:"center",gap:10}}>{items.length>0&&<span style={{fontSize:13,fontWeight:700,color:"var(--accent-light)"}}>{Math.round(st.kcal)} kcal</span>}<span style={{color:"var(--text-dim)"}}>{open?"▲":"▼"}</span></div>
              </button>
              {open&&(<div style={{padding:"0 16px 16px"}}>
                <div style={{display:"flex",gap:8,marginBottom:items.length?12:0}}>
                  <input value={inputs[slot.id]||""} onChange={e=>setInputs(p=>({...p,[slot.id]:e.target.value}))} onKeyDown={e=>{if(e.key==="Enter")addEntry(slot.id);}} placeholder="es: 150g pollo, 80g riso, 2 uova" style={{flex:1,padding:"10px 12px",borderRadius:8,border:"1px solid var(--border)",background:"var(--bg)",color:"var(--text)",fontSize:13,outline:"none"}}/>
                  <button onClick={()=>addEntry(slot.id)} style={{padding:"10px 14px",borderRadius:8,border:"none",background:"linear-gradient(135deg,var(--accent),var(--accent-deep))",color:"#fff",fontWeight:700,cursor:"pointer",fontSize:13}}>+</button>
                </div>
                <button onClick={()=>{setSearchSlot(slot.id);setSearchQ("");setSearchRes([]);setSearchErr(null);}} style={{width:"100%",padding:"9px",borderRadius:8,border:"1px dashed var(--muted)",background:"transparent",color:"var(--text-soft)",cursor:"pointer",fontSize:12,marginBottom:8}}>🔍 Cerca un prodotto confezionato (es. "muller caffè")</button>
                <button onClick={()=>openEstimate(slot.id)} style={{width:"100%",padding:"9px",borderRadius:8,border:"1px dashed #6D28D9",background:"#2E1065",color:"#C4B5FD",cursor:"pointer",fontSize:12,marginBottom:items.length?12:0}}>✨ Stima un piatto (testo o foto)</button>
                {warnings[slot.id]?.length>0&&<div style={{background:"#422006",borderRadius:8,padding:"8px 12px",margin:"10px 0",fontSize:11,color:"#FBBF24"}}>⚠️ Non riconosciuto: {warnings[slot.id].join(", ")}.
                  <button onClick={()=>setNewFood({slot:slot.id,name:warnings[slot.id][0].replace(/^\d+(?:[.,]\d+)?\s*(?:kg|etti?|g|gr|grammi|ml)?\s*/i,""),kcal:"",p:"",c:"",f:"",grams:"100"})} style={{display:"block",marginTop:8,padding:"7px 12px",borderRadius:6,border:"none",background:"#D97706",color:"#fff",fontWeight:700,cursor:"pointer",fontSize:11}}>➕ Crealo come alimento personalizzato</button>
                </div>}
                {items.map((it,i)=>(<div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 0",borderBottom:"1px solid var(--bg)"}}><div style={{flex:1}}><div style={{fontSize:13,color:"var(--text)",fontWeight:600}}>{it.fromPhoto&&<span title="Stima da foto" style={{marginRight:4}}>📷</span>}{it.est&&!it.fromPhoto&&<span title="Stima" style={{marginRight:4}}>✨</span>}{it.label} <span style={{color:"var(--text-dim)",fontWeight:400}}>· {it.grams}g</span></div><div style={{fontSize:11,color:"var(--text-dim)"}}>P:{it.p} C:{it.c} F:{it.f}</div></div><span style={{fontSize:13,color:"var(--accent-light)",fontWeight:700}}>{it.kcal}</span><button onClick={()=>removeItem(slot.id,i)} style={{background:"none",border:"none",color:"var(--text-dim)",cursor:"pointer",fontSize:16,padding:4}}>×</button></div>))}
              </div>)}
            </div>);})}
          {(allItems.length>0||workouts.length>0)&&<button onClick={clearDay} style={{marginTop:6,padding:"8px 14px",borderRadius:8,border:"1px solid var(--border)",background:"transparent",color:"var(--text-dim)",cursor:"pointer",fontSize:12}}>↺ Azzera questo giorno</button>}
        </>)}

        {/* ===== PIANO + WIZARD ===== */}
        {tab==="piano"&&(
          wizard ? <Wizard wizard={wizard} setWizard={setWizard} onSave={savePlan} analysis={analyzeHistory(days, plans.length?planForDate(plans,todayKey()):null)}/>
          : <PlanView plans={plans} onNew={()=>setWizard({step:0, data:initWizardData(plans)})} onEdit={(pl)=>setWizard({step:0,data:{...pl,_editing:true}})} onOpenMenu={openMenu}/>
        )}

        {/* ===== ALLENAMENTI ===== */}
        {tab==="allenamenti"&&(<>
          <div style={{background:"linear-gradient(135deg,#7C2D12,var(--surface))",borderRadius:14,padding:18,marginBottom:16,border:"1px solid #EA580C55"}}>
            <div style={{fontSize:11,color:"#FDBA74",marginBottom:2}}>🔥 BRUCIATE · {fmtDate(selectedDate).toUpperCase()}</div>
            <div style={{fontSize:32,fontWeight:800,color:"#FB923C",lineHeight:1}}>{burned} <span style={{fontSize:16,color:"#9A3412",fontWeight:600}}>kcal</span></div>
            {totals.kcal>0&&<div style={{fontSize:12,color:"var(--text-soft)",marginTop:6}}>Introdotte {Math.round(totals.kcal)} − bruciate {burned} = <strong style={{color:"#A78BFA"}}>{Math.round(netKcal)} kcal nette</strong></div>}
          </div>
          <div style={{background:"var(--surface)",borderRadius:12,padding:16,marginBottom:16,border:"1px solid var(--border)"}}>
            <h3 style={{margin:"0 0 12px",fontSize:14,fontWeight:700,color:"var(--text-strong)"}}>Aggiungi allenamento</h3>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>{WORKOUT_TYPES.map(w=>(<button key={w.id} onClick={()=>{setWoType(w.id);if(!woKcal)setWoKcal(String(w.est));}} style={{padding:"7px 12px",borderRadius:20,border:"none",cursor:"pointer",fontSize:12,fontWeight:600,background:woType===w.id?"linear-gradient(135deg,#EA580C,#C2410C)":"var(--bg)",color:woType===w.id?"#fff":"var(--text-soft)",outline:woType===w.id?"none":"1px solid var(--border)"}}>{w.icon} {w.label}</button>))}</div>
            <div style={{display:"flex",gap:8,marginBottom:8,flexWrap:"wrap"}}>
              <div style={{flex:"1 1 120px"}}><label style={{fontSize:11,color:"var(--text-dim)",display:"block",marginBottom:4}}>Kcal bruciate (Apple Watch)</label><input type="number" value={woKcal} onChange={e=>setWoKcal(e.target.value)} placeholder="es. 580" style={{width:"100%",padding:"10px 12px",borderRadius:8,border:"1px solid var(--border)",background:"var(--bg)",color:"var(--text)",fontSize:14,outline:"none",boxSizing:"border-box"}}/></div>
              <div style={{flex:"1 1 100px"}}><label style={{fontSize:11,color:"var(--text-dim)",display:"block",marginBottom:4}}>Durata (min)</label><input type="number" value={woDur} onChange={e=>setWoDur(e.target.value)} placeholder="es. 90" style={{width:"100%",padding:"10px 12px",borderRadius:8,border:"1px solid var(--border)",background:"var(--bg)",color:"var(--text)",fontSize:14,outline:"none",boxSizing:"border-box"}}/></div>
            </div>
            <input value={woNote} onChange={e=>setWoNote(e.target.value)} placeholder="Nota (facoltativa)" style={{width:"100%",padding:"10px 12px",borderRadius:8,border:"1px solid var(--border)",background:"var(--bg)",color:"var(--text)",fontSize:13,outline:"none",boxSizing:"border-box",marginBottom:10}}/>
            <button onClick={addWorkout} style={{width:"100%",padding:"11px",borderRadius:8,border:"none",background:"linear-gradient(135deg,#EA580C,#C2410C)",color:"#fff",fontWeight:700,cursor:"pointer",fontSize:14}}>🔥 Registra</button>
          </div>
          {workouts.length===0?<div style={{background:"var(--surface)",borderRadius:12,padding:24,textAlign:"center",border:"1px solid var(--border)",color:"var(--text-dim)"}}><div style={{fontSize:28,marginBottom:6}}>🏋️</div>Nessun allenamento per questo giorno.</div>:workouts.map(w=>(<div key={w.id} style={{background:"var(--surface)",borderRadius:12,marginBottom:8,padding:"13px 16px",border:"1px solid var(--border)",display:"flex",alignItems:"center",gap:12}}><span style={{fontSize:24}}>{w.icon}</span><div style={{flex:1}}><div style={{fontSize:14,fontWeight:700,color:"var(--text-strong)"}}>{w.label}{w.dur?` · ${w.dur} min`:""}</div>{w.note&&<div style={{fontSize:11,color:"var(--text-dim)"}}>{w.note}</div>}</div><span style={{fontSize:15,fontWeight:800,color:"#FB923C"}}>−{w.kcal}</span><button onClick={()=>removeWorkout(w.id)} style={{background:"none",border:"none",color:"var(--text-dim)",cursor:"pointer",fontSize:16,padding:4}}>×</button></div>))}
        </>)}

        {/* ===== SYNC ===== */}
        {tab==="sync"&&<SyncView syncState={syncState} theme={theme} setTheme={setTheme} authUser={authUser} onLogout={doLogout}/>}

        {/* ===== COACH ===== */}
        {tab==="coach"&&<CoachView days={days} plans={plans} weights={weights} setTab={setTab}/>}

        {/* ===== PESO ===== */}
        {tab==="peso"&&<WeightView weights={weights} wInput={wInput} setWInput={setWInput} saveWeight={saveWeight} removeWeight={removeWeight} selectedDate={selectedDate} setSelectedDate={setSelectedDate} plans={plans}/>}

        {/* ===== STORICO ===== */}
        {tab==="storico"&&(<>
          {(()=>{const last7=historyKeys.slice(0,7);if(!last7.length)return null;const tot=last7.reduce((a,k)=>{const s=sum(Object.values(days[k].logs||{}).flat());const b=(days[k].workouts||[]).reduce((x,w)=>x+w.kcal,0);return{kcal:a.kcal+s.kcal,p:a.p+s.p,c:a.c+s.c,f:a.f+s.f,b:a.b+b};},{kcal:0,p:0,c:0,f:0,b:0});const n=last7.length;return(
            <div style={{background:"linear-gradient(135deg,var(--header-from),var(--surface))",borderRadius:14,padding:18,marginBottom:16,border:"1px solid var(--accent-deep)"}}>
              <h3 style={{margin:"0 0 12px",fontSize:14,fontWeight:700,color:"#93C5FD"}}>📈 Media ultimi {n} giorni</h3>
              <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8}}>{[["Kcal",Math.round(tot.kcal/n),"var(--accent-light)"],["Prot",Math.round(tot.p/n),"var(--accent)"],["Carb",Math.round(tot.c/n),"#F59E0B"],["Grassi",Math.round(tot.f/n),"#10B981"],["🔥Bruc",Math.round(tot.b/n),"#FB923C"]].map(([k,v,c])=>(<div key={k} style={{background:"var(--bg)55",borderRadius:8,padding:"10px 6px",textAlign:"center"}}><div style={{fontSize:18,fontWeight:800,color:c}}>{v}</div><div style={{fontSize:9,color:"var(--text-dim)"}}>{k}</div></div>))}</div>
            </div>);})()}
          {historyKeys.length===0?<div style={{background:"var(--surface)",borderRadius:12,padding:30,textAlign:"center",border:"1px solid var(--border)"}}><div style={{fontSize:32,marginBottom:8}}>📅</div><p style={{margin:0,fontSize:14,color:"var(--text-soft)"}}>Nessun giorno registrato ancora.</p></div>:historyKeys.map(key=>{const d=days[key],t=sum(Object.values(d.logs||{}).flat());const pl=planForDate(plans,key);const tgt=pl?(d.dayType==="padel"?pl.sport.kcal:pl.targetKcal):2000;const kp=pct(t.kcal,tgt);const b=(d.workouts||[]).reduce((a,w)=>a+w.kcal,0),dowH=new Date(key+"T12:00:00").getDay(),wasFree=pl&&(pl.freeMeals?.[dowH]||[]).length>0;return(
            <div key={key} onClick={()=>{setSelectedDate(key);setTab("oggi");setOpenSlot("colazione");}} style={{background:"var(--surface)",borderRadius:12,marginBottom:10,padding:"14px 16px",border:"1px solid var(--border)",cursor:"pointer"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div><div style={{fontSize:14,fontWeight:700,color:"var(--text-strong)"}}>{fmtDate(key)}{d.dayType==="padel"&&<span style={{marginLeft:6}}>🎾</span>}{wasFree&&<span style={{marginLeft:6}}>🎉</span>}{b>0&&<span style={{marginLeft:6,fontSize:11,color:"#FB923C"}}>🔥{b}</span>}</div><div style={{fontSize:11,color:"var(--text-dim)",marginTop:2}}>P:{Math.round(t.p)}g · C:{Math.round(t.c)}g · F:{Math.round(t.f)}g</div></div>
                <div style={{textAlign:"right"}}><div style={{fontSize:17,fontWeight:800,color:kp>110?"#F87171":kp<70?"#FBBF24":"#34D399"}}>{Math.round(t.kcal)}</div><div style={{fontSize:10,color:"var(--text-dim)"}}>/ {tgt} kcal</div></div>
              </div>
              <div style={{height:6,background:"var(--bg)",borderRadius:3,overflow:"hidden",marginTop:10}}><div style={{height:"100%",width:`${Math.min(kp,100)}%`,background:kp>110?"#F87171":kp<70?"#FBBF24":"linear-gradient(90deg,var(--accent),var(--accent-2))",borderRadius:3}}/></div>
            </div>);})}
        </>)}
      </div>

      {/* ===== MODALE MENÙ DEL GIORNO ===== */}
      {menu&&(
        <div onClick={()=>setMenu(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:100}}>
          <div onClick={e=>e.stopPropagation()} style={{background:"var(--surface)",borderRadius:"16px 16px 0 0",width:"100%",maxWidth:720,maxHeight:"90vh",display:"flex",flexDirection:"column",border:"1px solid var(--border)"}}>
            <div style={{padding:"16px 16px 12px",borderBottom:"1px solid var(--border)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <h3 style={{margin:0,fontSize:15,fontWeight:700,color:"var(--text-strong)"}}>🍽️ Menù suggerito · {DOW_FULL[menu.dayIdx]}</h3>
                <div style={{fontSize:11,color:"var(--text-dim)",marginTop:2}}>Target {dayType==="padel"?menu.plan.sport.kcal:menu.plan.targetKcal} kcal {dayType==="padel"?"🎾":""} · pranzo da ufficio</div>
              </div>
              <button onClick={()=>setMenu(null)} style={{background:"none",border:"none",color:"var(--text-dim)",fontSize:22,cursor:"pointer"}}>×</button>
            </div>
            <div style={{overflowY:"auto",padding:"14px 16px 24px"}}>
              {!menu.data&&!menu.loading&&!menu.error&&(<>
                <p style={{margin:"0 0 14px",fontSize:13,color:"var(--text-soft)",lineHeight:1.5}}>Genero una proposta di 5 pasti su misura dei tuoi target e preferenze (yogurt greco, niente latte, pranzo trasportabile in ufficio). Cambia ogni volta.</p>
                <button onClick={()=>fetchMenu(menu.plan,menu.dayIdx)} style={{width:"100%",padding:"12px",borderRadius:8,border:"none",background:"linear-gradient(135deg,#7C3AED,#5B21B6)",color:"#fff",fontWeight:700,cursor:"pointer",fontSize:14}}>✨ Genera menù</button>
              </>)}

              {menu.loading&&<div style={{textAlign:"center",padding:30,color:"#C4B5FD",fontSize:13}}>🍳 Sto componendo il menù del giorno…</div>}

              {menu.error&&!menu.loading&&(
                <div style={{background:"#3B1212",border:"1px solid #7F1D1D",borderRadius:8,padding:"12px 14px",fontSize:12,color:"#FCA5A5"}}>
                  {menu.error}
                  <button onClick={()=>fetchMenu(menu.plan,menu.dayIdx)} style={{display:"block",marginTop:10,padding:"7px 12px",borderRadius:6,border:"1px solid var(--muted)",background:"transparent",color:"#C4B5FD",cursor:"pointer",fontSize:12}}>Riprova</button>
                </div>
              )}

              {menu.data&&!menu.loading&&(<>
                {[["colazione","☀️ Colazione"],["spuntino_mattina","🍎 Spuntino mattino"],["pranzo","🥗 Pranzo (ufficio)"],["spuntino_pomeriggio","🍵 Spuntino pomeriggio"],["cena","🌙 Cena"]].map(([key,label])=>{
                  const m=menu.data.meals?.[key]; if(!m)return null;
                  return (
                    <div key={key} style={{background:"var(--bg)",borderRadius:10,padding:14,marginBottom:10,border:"1px solid var(--border)"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8,gap:8}}>
                        <div style={{flex:1}}>
                          <div style={{fontSize:11,color:"var(--text-dim)",marginBottom:2}}>{label}</div>
                          <div style={{fontSize:14,fontWeight:700,color:"var(--text-strong)"}}>{m.titolo}</div>
                        </div>
                        <div style={{textAlign:"right",whiteSpace:"nowrap"}}>
                          <div style={{fontSize:15,fontWeight:800,color:"var(--accent-light)"}}>{m.kcal}</div>
                          <div style={{fontSize:9,color:"var(--text-dim)"}}>kcal</div>
                        </div>
                      </div>
                      {m.ingredienti?.length>0&&<div style={{fontSize:12,color:"var(--text)",marginBottom:6}}>{m.ingredienti.map(i=>`${i.nome} ${i.grammi}g`).join(" · ")}</div>}
                      {m.prep&&<div style={{fontSize:11,color:"var(--text-soft)",fontStyle:"italic",marginBottom:8}}>👨‍🍳 {m.prep}</div>}
                      <div style={{display:"flex",alignItems:"center",gap:10}}>
                        <span style={{fontSize:10,color:"var(--accent)"}}>P {m.p}g</span><span style={{fontSize:10,color:"#F59E0B"}}>C {m.c}g</span><span style={{fontSize:10,color:"#10B981"}}>F {m.f}g</span>
                        <button onClick={()=>addMenuMeal(key,m)} style={{marginLeft:"auto",padding:"6px 12px",borderRadius:6,border:"1px solid var(--border)",background:"transparent",color:"var(--accent-light)",cursor:"pointer",fontSize:11,fontWeight:700}}>+ Aggiungi al diario</button>
                      </div>
                    </div>
                  );
                })}
                {(()=>{const t=Object.values(menu.data.meals||{}).reduce((a,m)=>({k:a.k+(m.kcal||0),p:a.p+(m.p||0),c:a.c+(m.c||0),f:a.f+(m.f||0)}),{k:0,p:0,c:0,f:0});return(
                  <div style={{background:"var(--surface)",borderRadius:10,padding:"10px 14px",marginBottom:12,border:"1px solid var(--border)",display:"flex",justifyContent:"space-around",textAlign:"center"}}>
                    {[["Totale",t.k,"var(--accent-light)","kcal"],["Prot",t.p,"var(--accent)","g"],["Carb",t.c,"#F59E0B","g"],["Grassi",t.f,"#10B981","g"]].map(([l,v,c,u])=>(<div key={l}><div style={{fontSize:15,fontWeight:800,color:c}}>{Math.round(v)}</div><div style={{fontSize:9,color:"var(--text-dim)"}}>{l} ({u})</div></div>))}
                  </div>
                );})()}
                {menu.data.nota&&<div style={{fontSize:11,color:"var(--text-soft)",lineHeight:1.5,marginBottom:12,padding:"0 4px"}}>💡 {menu.data.nota}</div>}
                <button onClick={()=>addAllMenu(menu.data)} style={{width:"100%",padding:"12px",borderRadius:8,border:"none",background:"linear-gradient(135deg,#059669,#047857)",color:"#fff",fontWeight:700,cursor:"pointer",fontSize:14}}>✓ Aggiungi tutto il menù al diario</button>
                <button onClick={()=>fetchMenu(menu.plan,menu.dayIdx)} style={{width:"100%",padding:"9px",borderRadius:8,border:"1px solid var(--border)",background:"transparent",color:"var(--text-soft)",cursor:"pointer",fontSize:12,marginTop:8}}>🔄 Genera un'altra proposta</button>
                <div style={{fontSize:10,color:"var(--muted)",marginTop:10,textAlign:"center",lineHeight:1.4}}>Le ricette sono suggerimenti generati: verifica porzioni e adatta ai tuoi gusti. I valori sono indicativi.</div>
              </>)}
            </div>
          </div>
        </div>
      )}

      {/* ===== MODALE STIMA PIATTO ===== */}
      {estimate&&(
        <div onClick={()=>setEstimate(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:100}}>
          <div onClick={e=>e.stopPropagation()} style={{background:"var(--surface)",borderRadius:"16px 16px 0 0",width:"100%",maxWidth:720,maxHeight:"88vh",display:"flex",flexDirection:"column",border:"1px solid var(--border)"}}>
            <div style={{padding:"16px 16px 12px",borderBottom:"1px solid var(--border)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <h3 style={{margin:0,fontSize:15,fontWeight:700,color:"var(--text-strong)"}}>✨ Stima piatto · {MEAL_SLOTS.find(m=>m.id===estimate.slot)?.label}</h3>
              <button onClick={()=>setEstimate(null)} style={{background:"none",border:"none",color:"var(--text-dim)",fontSize:22,cursor:"pointer"}}>×</button>
            </div>
            <div style={{overflowY:"auto",padding:"14px 16px 24px"}}>
              {/* fase scelta / input */}
              {estimate.rows.length===0&&!estimate.loading&&(<>
                <p style={{margin:"0 0 10px",fontSize:12,color:"var(--text-soft)",lineHeight:1.5}}>Descrivi il piatto con i grammi indicativi, oppure scatta/carica una foto. Otterrai una lista di ingredienti modificabile.</p>
                <textarea value={estimate.contextText} onChange={e=>setEstimate(es=>({...es,contextText:e.target.value}))} rows={3} placeholder="es: stracotto di vitello al vino ~200g, patate al forno 100g" style={{width:"100%",padding:"11px 12px",borderRadius:8,border:"1px solid var(--border)",background:"var(--bg)",color:"var(--text)",fontSize:14,outline:"none",boxSizing:"border-box",resize:"vertical",marginBottom:10}}/>
                <button onClick={doEstimateText} disabled={!estimate.contextText.trim()} style={{width:"100%",padding:"11px",borderRadius:8,border:"none",background:estimate.contextText.trim()?"linear-gradient(135deg,#7C3AED,#5B21B6)":"var(--border)",color:"#fff",fontWeight:700,cursor:"pointer",fontSize:14,marginBottom:12}}>Stima dal testo</button>
                <div style={{display:"flex",alignItems:"center",gap:10,margin:"4px 0 12px"}}><div style={{flex:1,height:1,background:"var(--border)"}}/><span style={{fontSize:11,color:"var(--text-dim)"}}>oppure</span><div style={{flex:1,height:1,background:"var(--border)"}}/></div>
                <label style={{display:"block",width:"100%",padding:"11px",borderRadius:8,border:"1px dashed #6D28D9",background:"#2E1065",color:"#C4B5FD",fontWeight:700,fontSize:14,textAlign:"center",cursor:"pointer",boxSizing:"border-box"}}>
                  📷 Scatta o carica una foto
                  <input type="file" accept="image/*" capture="environment" onChange={e=>doEstimatePhoto(e.target.files?.[0])} style={{display:"none"}}/>
                </label>
                <div style={{background:"#3B1212",border:"1px solid #7F1D1D",borderRadius:8,padding:"10px 12px",marginTop:12,fontSize:11,color:"#FCA5A5",lineHeight:1.5}}>
                  ⚠️ <strong>La stima è approssimativa</strong>, soprattutto da foto. Verifica sempre grammi e condimenti prima di salvare. Includi un oggetto di riferimento nella foto (forchetta, telefono) per una stima dei pesi più sensata.
                </div>
              </>)}

              {/* loading */}
              {estimate.loading&&<div style={{textAlign:"center",padding:30,color:"#C4B5FD",fontSize:13}}>🔮 Sto analizzando{estimate.fromPhoto?" la foto":""}…</div>}

              {/* errore con fallback */}
              {estimate.error&&!estimate.loading&&(
                <div style={{background:"#3B1212",border:"1px solid #7F1D1D",borderRadius:8,padding:"12px 14px",fontSize:12,color:"#FCA5A5"}}>
                  {estimate.error}
                  <div style={{marginTop:10,color:"var(--text-soft)"}}>Puoi sempre inserire i valori a mano: chiudi e usa il campo di testo del pasto o "➕ alimento personalizzato".</div>
                  <button onClick={()=>setEstimate(es=>({...es,error:null,rows:[]}))} style={{marginTop:10,padding:"7px 12px",borderRadius:6,border:"1px solid var(--muted)",background:"transparent",color:"#C4B5FD",cursor:"pointer",fontSize:12}}>Riprova</button>
                </div>
              )}

              {/* risultati editabili */}
              {estimate.rows.length>0&&!estimate.loading&&(<>
                {estimate.fromPhoto&&(
                  <div style={{background:"#3B1212",border:"1px solid #7F1D1D",borderRadius:8,padding:"10px 12px",marginBottom:10,fontSize:11,color:"#FCA5A5",lineHeight:1.5}}>
                    📷 <strong>Stima da immagine:</strong> il valore può essere impreciso, verifica e correggi grammi e condimenti prima di salvare.
                  </div>
                )}
                {estimate.fromPhoto&&estimate.scaleObjectFound===false&&(
                  <div style={{background:"#422006",border:"1px solid #B45309",borderRadius:8,padding:"10px 12px",marginBottom:10,fontSize:11,color:"#FBBF24",lineHeight:1.5}}>
                    📏 <strong>Nessun oggetto di scala riconosciuto</strong> nella foto. La stima dei pesi è meno affidabile. Per migliorarla, rifai la foto con un riferimento accanto al piatto (forchetta, coltello, telefono), oppure prosegui correggendo a mano i grammi.
                  </div>
                )}
                {estimate.fromPhoto&&estimate.scaleObjectFound===true&&(
                  <div style={{background:"#0F2A1E",border:"1px solid #059669",borderRadius:8,padding:"8px 12px",marginBottom:10,fontSize:11,color:"#6EE7B7"}}>📏 Oggetto di scala riconosciuto: stima dei pesi più attendibile (ma sempre da verificare).</div>
                )}
                <div style={{fontSize:11,color:"var(--text-dim)",marginBottom:8}}>Rivedi e correggi ogni riga, poi inseriscile nel diario.</div>
                {estimate.rows.map((r,i)=>{
                  const confColor={alta:"#34D399",media:"#FBBF24",bassa:"#F87171"}[r.confidence];
                  const fct=r.grams/100;
                  return (
                    <div key={i} style={{background:"var(--bg)",borderRadius:10,padding:12,marginBottom:8,border:"1px solid var(--border)",opacity:r.include?1:0.45}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                        <input type="checkbox" checked={r.include} onChange={e=>updateRow(i,{include:e.target.checked})} style={{width:18,height:18,accentColor:"#7C3AED"}}/>
                        <input value={r.name} onChange={e=>updateRow(i,{name:e.target.value})} style={{flex:1,padding:"7px 9px",borderRadius:6,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text)",fontSize:13,outline:"none"}}/>
                        <span style={{fontSize:10,fontWeight:700,color:confColor,background:"var(--surface)",borderRadius:6,padding:"3px 7px",whiteSpace:"nowrap"}}>{r.confidence}</span>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",marginBottom:6}}>
                        <input type="number" value={r.grams} onChange={e=>updateRow(i,{grams:Math.max(0,parseInt(e.target.value)||0)})} style={{width:64,padding:"6px 8px",borderRadius:6,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text)",fontSize:13,outline:"none"}}/>
                        <span style={{fontSize:11,color:"var(--text-dim)"}}>g →</span>
                        <span style={{fontSize:13,color:"var(--accent-light)",fontWeight:700}}>{Math.round(r.kcal100*fct)} kcal</span>
                        <span style={{fontSize:11,color:"var(--text-dim)"}}>P{(r.p100*fct).toFixed(1)} C{(r.c100*fct).toFixed(1)} F{(r.f100*fct).toFixed(1)}</span>
                      </div>
                      <div style={{fontSize:10,color:"var(--muted)",marginBottom:6}}>per 100g: {r.kcal100}kcal · P{r.p100} C{r.c100} F{r.f100}{r.note?` · ${r.note}`:""}</div>
                      <label style={{display:"flex",alignItems:"center",gap:6,fontSize:11,color:"var(--text-soft)",cursor:"pointer"}}>
                        <input type="checkbox" checked={!!r.saveCustom} onChange={e=>updateRow(i,{saveCustom:e.target.checked})} style={{accentColor:"#D97706"}}/>
                        Salva come alimento personalizzato ⭐ (riutilizzabile)
                      </label>
                    </div>
                  );
                })}
                <button onClick={insertEstimateRows} style={{width:"100%",padding:"12px",borderRadius:8,border:"none",background:"linear-gradient(135deg,#059669,#047857)",color:"#fff",fontWeight:700,cursor:"pointer",fontSize:14,marginTop:6}}>✓ Inserisci {estimate.rows.filter(r=>r.include).length} voci nel diario</button>
                <button onClick={()=>setEstimate(es=>({...es,rows:[],error:null}))} style={{width:"100%",padding:"9px",borderRadius:8,border:"1px solid var(--border)",background:"transparent",color:"var(--text-dim)",cursor:"pointer",fontSize:12,marginTop:8}}>↺ Rifai la stima</button>
              </>)}
            </div>
          </div>
        </div>
      )}

      {/* ===== MODALE NUOVO ALIMENTO ===== */}
      {newFood&&(
        <div onClick={()=>setNewFood(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:100}}>
          <div onClick={e=>e.stopPropagation()} style={{background:"var(--surface)",borderRadius:"16px 16px 0 0",width:"100%",maxWidth:720,padding:"16px 16px 28px",border:"1px solid var(--border)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
              <h3 style={{margin:0,fontSize:15,fontWeight:700,color:"var(--text-strong)"}}>➕ Nuovo alimento personalizzato</h3>
              <button onClick={()=>setNewFood(null)} style={{background:"none",border:"none",color:"var(--text-dim)",fontSize:22,cursor:"pointer"}}>×</button>
            </div>
            <p style={{margin:"0 0 14px",fontSize:11,color:"var(--text-dim)",lineHeight:1.5}}>Copia i valori <strong>per 100g</strong> dall'etichetta o da una tabella nutrizionale. Lo salverai una volta sola: poi basterà scriverne il nome.</p>
            <label style={{fontSize:11,color:"var(--text-soft)",display:"block",marginBottom:4}}>Nome (come lo scriverai nei pasti)</label>
            <input value={newFood.name} onChange={e=>setNewFood(f=>({...f,name:e.target.value}))} style={{width:"100%",padding:"10px 12px",borderRadius:8,border:"1px solid var(--border)",background:"var(--bg)",color:"var(--text)",fontSize:14,outline:"none",boxSizing:"border-box",marginBottom:10}}/>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:10}}>
              {[["kcal","Kcal/100g"],["p","Prot/100g"],["c","Carb/100g"],["f","Grassi/100g"]].map(([k,l])=>(
                <div key={k}><label style={{fontSize:10,color:"var(--text-soft)",display:"block",marginBottom:4}}>{l}</label>
                <input inputMode="decimal" value={newFood[k]} onChange={e=>setNewFood(f=>({...f,[k]:e.target.value}))} style={{width:"100%",padding:"9px 8px",borderRadius:8,border:"1px solid var(--border)",background:"var(--bg)",color:"var(--text)",fontSize:13,outline:"none",boxSizing:"border-box"}}/></div>
              ))}
            </div>
            <label style={{fontSize:11,color:"var(--text-soft)",display:"block",marginBottom:4}}>Quanti grammi aggiungere ora al pasto</label>
            <input inputMode="decimal" value={newFood.grams} onChange={e=>setNewFood(f=>({...f,grams:e.target.value}))} style={{width:120,padding:"9px 10px",borderRadius:8,border:"1px solid var(--border)",background:"var(--bg)",color:"var(--text)",fontSize:13,outline:"none",marginBottom:14}}/>
            <button onClick={()=>{
              const name=newFood.name.trim().toLowerCase();
              const kcal=parseFloat(String(newFood.kcal).replace(",","."));
              const p=parseFloat(String(newFood.p).replace(",","."))||0;
              const c=parseFloat(String(newFood.c).replace(",","."))||0;
              const f=parseFloat(String(newFood.f).replace(",","."))||0;
              const grams=parseFloat(String(newFood.grams).replace(",","."))||100;
              if(!name||!kcal)return;
              const entry={p,c,f,kcal,label:newFood.name.trim()+" ⭐"};
              setCustomFoods(prev=>({...prev,[name]:entry}));
              const fct=grams/100;
              updateDay({logs:{...logs,[newFood.slot]:[...(logs[newFood.slot]||[]),{label:entry.label,grams:Math.round(grams),kcal:Math.round(kcal*fct),p:+(p*fct).toFixed(1),c:+(c*fct).toFixed(1),f:+(f*fct).toFixed(1)}]}});
              setWarnings(w=>({...w,[newFood.slot]:[]}));
              setNewFood(null);
            }} disabled={!newFood.name.trim()||!parseFloat(String(newFood.kcal).replace(",","."))} style={{width:"100%",padding:"12px",borderRadius:8,border:"none",background:(newFood.name.trim()&&parseFloat(String(newFood.kcal).replace(",",".")))?"linear-gradient(135deg,#059669,#047857)":"var(--border)",color:"#fff",fontWeight:700,cursor:"pointer",fontSize:14}}>✓ Salva e aggiungi al pasto</button>
          </div>
        </div>
      )}

      {/* ===== MODALE RICERCA PRODOTTO ===== */}
      {searchSlot&&(
        <div onClick={()=>setSearchSlot(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:100}}>
          <div onClick={e=>e.stopPropagation()} style={{background:"var(--surface)",borderRadius:"16px 16px 0 0",width:"100%",maxWidth:720,maxHeight:"85vh",display:"flex",flexDirection:"column",border:"1px solid var(--border)"}}>
            <div style={{padding:"16px 16px 12px",borderBottom:"1px solid var(--border)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                <h3 style={{margin:0,fontSize:15,fontWeight:700,color:"var(--text-strong)"}}>🔍 Cerca prodotto · {MEAL_SLOTS.find(m=>m.id===searchSlot)?.label}</h3>
                <button onClick={()=>setSearchSlot(null)} style={{background:"none",border:"none",color:"var(--text-dim)",fontSize:22,cursor:"pointer"}}>×</button>
              </div>
              <div style={{display:"flex",gap:8}}>
                <input autoFocus value={searchQ} onChange={e=>setSearchQ(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")runSearch();}} placeholder="es: muller caffè, fage yogurt, kinder" style={{flex:1,padding:"11px 12px",borderRadius:8,border:"1px solid var(--border)",background:"var(--bg)",color:"var(--text)",fontSize:14,outline:"none"}}/>
                <button onClick={runSearch} disabled={searching} style={{padding:"11px 16px",borderRadius:8,border:"none",background:"linear-gradient(135deg,var(--accent),var(--accent-deep))",color:"#fff",fontWeight:700,cursor:"pointer",fontSize:13}}>{searching?"…":"Cerca"}</button>
              </div>
            </div>
            <div style={{overflowY:"auto",padding:"12px 16px 24px"}}>
              {searching&&<div style={{textAlign:"center",color:"var(--text-dim)",padding:20,fontSize:13}}>Ricerca nel database Open Food Facts…</div>}
              {searchErr&&<div style={{background:"#422006",borderRadius:8,padding:"10px 12px",fontSize:12,color:"#FBBF24"}}>{searchErr}</div>}
              {searchRes.map((prod,i)=>(<ProductRow key={i} prod={prod} onAdd={(g)=>{addProduct(searchSlot,prod,g);setSearchSlot(null);}}/>))}
              {!searching&&!searchErr&&searchRes.length===0&&<div style={{textAlign:"center",color:"var(--muted)",padding:30,fontSize:13}}>Scrivi marca + nome del prodotto e premi Cerca.<br/>Es: "muller caffè", "kinder", "barilla pesto"</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============ SYNC VIEW ============ */
function SyncView({syncState,theme,setTheme,authUser,onLogout}){
  const themeSelector=(
    <div style={{background:"var(--surface)",borderRadius:12,padding:16,marginBottom:14,border:"1px solid var(--border)"}}>
      <h3 style={{margin:"0 0 4px",fontSize:14,fontWeight:700,color:"var(--text-strong)"}}>🎨 Tema dell'app</h3>
      <p style={{margin:"0 0 12px",fontSize:12,color:"var(--text-dim)"}}>Scegli l'aspetto. La preferenza viene salvata.</p>
      <div style={{display:"flex",gap:10}}>
        {[["midnight","Midnight","Scuro, blu notte","#0F172A","#3B82F6"],["fresh","Fresh","Chiaro, verde","#F6F7F4","#2F7D4F"]].map(([id,name,desc,bg,ac])=>{
          const on=theme===id;
          return (
            <button key={id} onClick={()=>setTheme(id)} style={{flex:1,padding:0,borderRadius:12,border:on?"2px solid var(--accent)":"2px solid var(--border)",background:"transparent",cursor:"pointer",overflow:"hidden",textAlign:"left"}}>
              <div style={{height:54,background:bg,position:"relative",display:"flex",alignItems:"center",padding:"0 12px",gap:6}}>
                <div style={{width:22,height:22,borderRadius:6,background:ac}}/>
                <div style={{flex:1}}><div style={{height:5,width:"60%",background:ac,borderRadius:3,marginBottom:4,opacity:0.9}}/><div style={{height:5,width:"40%",background:id==="fresh"?"#C9D2C4":"#475569",borderRadius:3}}/></div>
                {on&&<div style={{position:"absolute",top:6,right:6,width:18,height:18,borderRadius:"50%",background:"var(--accent)",color:"#fff",fontSize:11,display:"flex",alignItems:"center",justifyContent:"center"}}>✓</div>}
              </div>
              <div style={{padding:"8px 12px",background:"var(--surface)"}}>
                <div style={{fontSize:13,fontWeight:700,color:on?"var(--accent)":"var(--text)"}}>{name}</div>
                <div style={{fontSize:10,color:"var(--text-dim)"}}>{desc}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  const statusInfo={synced:["#34D399","✅ Sincronizzato"],saving:["#FBBF24","💾 Salvataggio…"],connecting:["var(--accent-light)","🔄 Connessione…"],error:["#F87171","⚠️ Offline — i dati restano salvati qui e si sincronizzano al ritorno della rete"],off:["var(--muted)","—"]}[syncState.status]||["var(--muted)","—"];

  if(!syncConfigured){
    return(<div>{themeSelector}
      <div style={{background:"var(--surface)",borderRadius:12,padding:20,border:"1px solid var(--border)"}}>
        <div style={{fontSize:30,marginBottom:10,textAlign:"center"}}>☁️</div>
        <h3 style={{margin:"0 0 8px",fontSize:15,color:"var(--text-strong)",textAlign:"center"}}>Account non configurato</h3>
        <p style={{margin:0,fontSize:13,color:"var(--text-soft)",lineHeight:1.6}}>L'app salva solo su questo dispositivo. Per avere un account email con sincronizzazione ovunque, configura Supabase (vedi <strong style={{color:"var(--accent-light)"}}>GUIDA-ACCOUNT.md</strong>).</p>
      </div>
    </div>);
  }

  return(<div>
    {themeSelector}

    {/* Profilo */}
    <div style={{background:"var(--surface)",borderRadius:12,padding:16,marginBottom:14,border:"1px solid var(--border)"}}>
      <h3 style={{margin:"0 0 12px",fontSize:14,fontWeight:700,color:"var(--text-strong)"}}>👤 Il tuo profilo</h3>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
        <div style={{width:46,height:46,borderRadius:"50%",background:"linear-gradient(135deg,var(--accent),var(--accent-2))",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,fontWeight:800,color:"#fff"}}>{(aliasOf(authUser)||"?").slice(0,1).toUpperCase()}</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:15,fontWeight:700,color:"var(--text-strong)"}}>{aliasOf(authUser)}</div>
          <div style={{fontSize:11,color:"var(--text-dim)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{authUser?.email}</div>
        </div>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14,fontSize:12,color:"var(--text-soft)"}}>
        <span style={{width:9,height:9,borderRadius:"50%",background:statusInfo[0]}}/>{statusInfo[1]}
      </div>
      <button onClick={onLogout} style={{width:"100%",padding:"11px",borderRadius:8,border:"1px solid var(--border)",background:"transparent",color:"#F87171",fontWeight:700,cursor:"pointer",fontSize:13}}>Esci / Cambia profilo</button>
    </div>

    <div style={{background:"#0F2A1E",borderRadius:12,padding:16,border:"1px solid #059669"}}>
      <div style={{fontSize:13,fontWeight:700,color:"#6EE7B7",marginBottom:6}}>🔒 Dati al sicuro</div>
      <p style={{margin:0,fontSize:12,color:"#A7F3D0",lineHeight:1.6}}>I tuoi dati sono protetti dal tuo account e accessibili da qualsiasi dispositivo facendo login con la stessa email. Più persone possono usare l'app sullo stesso telefono: basta uscire e accedere con un altro account.</p>
    </div>
  </div>);
}


function CoachView({days,plans,weights,setTab}){
  const sum2=items=>items.reduce((a,i)=>({kcal:a.kcal+i.kcal,p:a.p+i.p,c:a.c+i.c,f:a.f+i.f}),{kcal:0,c:0,p:0,f:0});
  const activePlan=plans.length?[...plans].sort((a,b)=>b.validFrom.localeCompare(a.validFrom)).find(p=>p.validFrom<=todayKey()):null;

  // raccogli giorni con cibo registrato, ultimi 14
  const loggedKeys=Object.keys(days).filter(k=>Object.values(days[k].logs||{}).flat().length).sort();
  const recent=loggedKeys.slice(-14);

  // metriche alimentari
  let totK=0,totP=0,totC=0,totF=0,n=0,daysOnTarget=0,proteinHitDays=0;
  const adherenceByDay=[];
  recent.forEach(k=>{
    const t=sum2(Object.values(days[k].logs).flat());
    const pl=plans.length?[...plans].sort((a,b)=>b.validFrom.localeCompare(a.validFrom)).find(p=>p.validFrom<=k):null;
    const tgtK=pl?(days[k].dayType==="padel"?pl.sport.kcal:pl.targetKcal):2000;
    const tgtP=pl?pl.protein:120;
    totK+=t.kcal;totP+=t.p;totC+=t.c;totF+=t.f;n++;
    const ratio=t.kcal/tgtK;
    if(ratio>=0.85&&ratio<=1.1)daysOnTarget++;
    if(t.p>=tgtP*0.9)proteinHitDays++;
    adherenceByDay.push({k,ratio,kcal:t.kcal,p:t.p,tgtK,tgtP});
  });
  const avgK=n?Math.round(totK/n):0,avgP=n?Math.round(totP/n):0,avgC=n?Math.round(totC/n):0,avgF=n?Math.round(totF/n):0;

  // allenamenti ultimi 14gg di calendario
  const now=Date.now();
  const woKeys=Object.keys(days).filter(k=>{const age=(now-new Date(k+"T12:00:00").getTime())/86400000;return age<=14&&age>=0&&(days[k].workouts||[]).length;});
  let totWorkouts=0,totBurn=0;const woTypeCount={};
  woKeys.forEach(k=>{(days[k].workouts||[]).forEach(w=>{totWorkouts++;totBurn+=w.kcal;woTypeCount[w.label]=(woTypeCount[w.label]||0)+1;});});
  const workoutsPerWeek=+(totWorkouts/2).toFixed(1);
  const plannedPerWeek=activePlan?(activePlan.workouts||[]).reduce((a,w)=>a+w.perWeek,0):0;

  // peso
  const wKeys=Object.keys(weights).sort();
  const wPts=wKeys.map(k=>({t:new Date(k+"T12:00:00").getTime(),v:weights[k]}));
  let weeklyRate=null;
  if(wPts.length>=2){const dd=(wPts[wPts.length-1].t-wPts[0].t)/86400000;if(dd>0)weeklyRate=+((wPts[wPts.length-1].v-wPts[0].v)/dd*7).toFixed(2);}

  // deficit medio (introdotte - bruciate vs TDEE)
  const tdee=activePlan?activePlan.tdee:null;
  const avgBurnPerDay=Math.round(totBurn/14);
  const avgNet=avgK-avgBurnPerDay;
  const estDeficit=tdee?tdee-avgNet:null; // positivo = deficit

  /* ---- GENERA CONSIGLI ---- */
  const tips=[];
  const goal=activePlan?activePlan.goal:null;

  if(!activePlan){
    tips.push({pri:"high",icon:"🎯",cat:"Setup",txt:"Non hai ancora un piano attivo. Crealo nella scheda Piano: senza target di riferimento il coach non può valutare aderenza e deficit.",action:()=>setTab("piano"),actionLbl:"Crea piano"});
  }

  if(n<3){
    tips.push({pri:"high",icon:"📝",cat:"Dati",txt:`Hai registrato solo ${n} ${n===1?"giorno":"giorni"} di pasti. Servono almeno 5-7 giorni per analisi affidabili. Registra con costanza per qualche giorno e torna qui.`});
  }else{
    // aderenza calorica
    const adhPct=Math.round(daysOnTarget/n*100);
    if(adhPct>=70)tips.push({pri:"good",icon:"✅",cat:"Aderenza",txt:`Ottima costanza: ${adhPct}% dei giorni sei rimasto entro ±10% del target calorico. È il fattore che conta di più nel lungo periodo.`});
    else if(adhPct>=40)tips.push({pri:"med",icon:"📊",cat:"Aderenza",txt:`Sei in target nel ${adhPct}% dei giorni. C'è margine: prova a pianificare i pasti la sera prima, riduce le scelte impulsive e migliora la costanza.`});
    else tips.push({pri:"high",icon:"📊",cat:"Aderenza",txt:`Solo il ${adhPct}% dei giorni rientra nel target (media ${avgK} kcal). Se è troppo basso, il target potrebbe essere irrealistico: valuta di aggiornarlo nel Piano. Se troppo alto, lavora sulle porzioni.`,action:()=>setTab("piano"),actionLbl:"Rivedi target"});

    // proteine
    const protPct=Math.round(proteinHitDays/n*100);
    const tgtP=activePlan?activePlan.protein:120;
    if(protPct>=70)tips.push({pri:"good",icon:"🥩",cat:"Proteine",txt:`Proteine sotto controllo: centri il target (≥${Math.round(tgtP*0.9)}g) nel ${protPct}% dei giorni. Fondamentale per preservare la massa muscolare in deficit.`});
    else tips.push({pri:"med",icon:"🥩",cat:"Proteine",txt:`Media proteica ${avgP}g vs target ${tgtP}g, centrato solo nel ${protPct}% dei giorni. Aggiungi una fonte proteica agli spuntini: yogurt greco, bresaola, tonno o uova. Distribuirle in 4-5 pasti migliora la sintesi proteica.`});

    // distribuzione macro grassi/carbo
    if(avgF>0&&activePlan){
      const fGap=avgF-activePlan.fat;
      if(fGap>20)tips.push({pri:"med",icon:"🫒",cat:"Grassi",txt:`I grassi medi (${avgF}g) superano il target (${activePlan.fat}g) di ${Math.round(fGap)}g. Essendo i più calorici (9 kcal/g), ridurli un po' libera margine per carboidrati utili all'energia in allenamento. Controlla olio, frutta secca e formaggi.`});
    }
  }

  // allenamenti
  if(activePlan){
    if(workoutsPerWeek===0)tips.push({pri:"high",icon:"🏋️",cat:"Allenamento",txt:`Nessun allenamento registrato nelle ultime 2 settimane, ma il piano ne prevede ${plannedPerWeek}/sett. L'allenamento (soprattutto di forza) è ciò che indirizza il deficit verso il grasso e non verso il muscolo. Anche sessioni brevi a corpo libero contano.`});
    else if(plannedPerWeek&&workoutsPerWeek<plannedPerWeek*0.7)tips.push({pri:"med",icon:"🏋️",cat:"Allenamento",txt:`Stai facendo ~${workoutsPerWeek} allenamenti/sett contro i ${plannedPerWeek} pianificati. Prova a fissare giorni e orari ricorrenti: la regolarità batte l'intensità sporadica.`});
    else tips.push({pri:"good",icon:"🏋️",cat:"Allenamento",txt:`Buon ritmo di allenamento (~${workoutsPerWeek}/sett, ${avgBurnPerDay} kcal/giorno medie bruciate). Mantienilo: è la base della ricomposizione.`});
    // suggerimento forza se solo cardio/padel
    const onlyPadel=Object.keys(woTypeCount).length&&Object.keys(woTypeCount).every(t=>t==="Padel"||t==="Corsa"||t==="Camminata"||t==="Bici");
    if(onlyPadel&&(goal==="ricomposizione"||goal==="dimagrire"||goal==="massa"))tips.push({pri:"med",icon:"💪",cat:"Allenamento",txt:"I tuoi allenamenti sono prevalentemente aerobici/sport. Per la ricomposizione aggiungi 2 sedute di forza a settimana (anche a corpo libero: push-up, trazioni, squat, affondi): è lo stimolo che costruisce e protegge il muscolo."});
  }

  // peso vs obiettivo
  if(wPts.length<2){
    tips.push({pri:"med",icon:"⚖️",cat:"Peso",txt:"Registra il peso 2-3 volte a settimana: senza il trend non posso dirti se il deficit sta funzionando davvero. La bilancia è il feedback finale.",action:()=>setTab("peso"),actionLbl:"Aggiungi peso"});
  }else if(goal){
    if((goal==="dimagrire"||goal==="ricomposizione")){
      if(weeklyRate>0.1)tips.push({pri:"high",icon:"📈",cat:"Peso",txt:`Il peso sale (+${weeklyRate} kg/sett) ma l'obiettivo è ridurre il grasso. Incrocia con l'aderenza: se mangi sopra target, il deficit non esiste sul serio. Aggiorna il target o stringi le porzioni.`});
      else if(weeklyRate>=-1&&weeklyRate<=-0.2)tips.push({pri:"good",icon:"📉",cat:"Peso",txt:`Perdita di ${Math.abs(weeklyRate)} kg/sett: ritmo perfetto. Massa muscolare protetta e grasso in calo. Non accelerare: la pazienza qui paga.`});
      else if(weeklyRate>-0.2&&weeklyRate<=0.1)tips.push({pri:goal==="ricomposizione"?"good":"med",icon:"⚖️",cat:"Peso",txt:goal==="ricomposizione"?`Peso quasi stabile (${weeklyRate} kg/sett): in ricomposizione è un buon segnale, specie se la forza in allenamento sale. Guarda le misure e lo specchio più della bilancia.`:`Peso stabile (${weeklyRate} kg/sett) ma vuoi dimagrire. Aumenta il deficit di ~150-200 kcal/giorno o aggiungi attività.`});
      else if(weeklyRate<-1)tips.push({pri:"high",icon:"⚠️",cat:"Peso",txt:`Stai perdendo ${Math.abs(weeklyRate)} kg/sett: troppo rapido. Sopra l'1% del peso a settimana rischi muscolo e metabolismo. Alza le calorie di 150-250 kcal.`});
    }
  }

  // deficit reale
  if(estDeficit!=null&&n>=3){
    if(goal==="dimagrire"||goal==="ricomposizione"){
      if(estDeficit<50)tips.push({pri:"med",icon:"🔥",cat:"Deficit",txt:`Il tuo deficit stimato è quasi nullo (introiti netti ~${avgNet} kcal vs TDEE ${tdee}). Per perdere grasso serve un deficit reale: punta a 250-400 kcal/giorno tra dieta e movimento.`});
      else if(estDeficit>600)tips.push({pri:"high",icon:"🔥",cat:"Deficit",txt:`Deficit stimato molto ampio (~${estDeficit} kcal/giorno). Efficace nel breve ma poco sostenibile e a rischio perdita muscolare. Considera di rientrare verso 300-500 kcal.`});
      else tips.push({pri:"good",icon:"🔥",cat:"Deficit",txt:`Deficit stimato ~${estDeficit} kcal/giorno: range ideale per la ricomposizione. Bilancia tra introiti (${avgK}), bruciato (${avgBurnPerDay}) e TDEE (${tdee}).`});
    }
  }

  const order={high:0,med:1,good:2};
  tips.sort((a,b)=>order[a.pri]-order[b.pri]);
  const priColor={high:"#F87171",med:"#FBBF24",good:"#34D399"};
  const priBg={high:"#3B1212",med:"#3A2E0A",good:"#0F2A1E"};
  const priLbl={high:"Da sistemare",med:"Da migliorare",good:"Ben fatto"};

  // score complessivo
  let score=null;
  if(n>=3&&activePlan){
    let s=0;s+=Math.min(40,daysOnTarget/n*40);s+=Math.min(25,proteinHitDays/n*25);
    s+=workoutsPerWeek>0?Math.min(20,(workoutsPerWeek/(plannedPerWeek||2))*20):0;
    s+=wPts.length>=2?15:5;
    score=Math.round(s);
  }
  const scoreColor=score>=75?"#34D399":score>=50?"#FBBF24":"#F87171";
  const scoreLbl=score>=75?"Ottimo lavoro":score>=50?"Sulla buona strada":"C'è da lavorare";

  return(
    <div>
      <div style={{background:"linear-gradient(135deg,var(--header-from),var(--header-to))",borderRadius:14,padding:18,marginBottom:16,border:"1px solid var(--border)"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
          <span style={{fontSize:22}}>🧭</span>
          <h2 style={{margin:0,fontSize:18,fontWeight:700,color:"var(--text-strong)"}}>Il tuo Coach</h2>
        </div>
        <p style={{margin:0,fontSize:12,color:"var(--text-soft)",lineHeight:1.5}}>Analisi degli ultimi {n||0} giorni di alimentazione, {totWorkouts} allenamenti e {wPts.length} pesate, confrontati con il tuo piano.</p>
      </div>

      {score!=null&&(
        <div style={{background:"var(--surface)",borderRadius:14,padding:18,marginBottom:16,border:"1px solid var(--border)",display:"flex",alignItems:"center",gap:18}}>
          <div style={{position:"relative",width:84,height:84,flexShrink:0}}>
            <svg viewBox="0 0 84 84" style={{transform:"rotate(-90deg)"}}>
              <circle cx="42" cy="42" r="36" fill="none" stroke="var(--bg)" strokeWidth="9"/>
              <circle cx="42" cy="42" r="36" fill="none" stroke={scoreColor} strokeWidth="9" strokeLinecap="round" strokeDasharray={`${score/100*226} 226`}/>
            </svg>
            <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
              <span style={{fontSize:24,fontWeight:800,color:scoreColor}}>{score}</span>
              <span style={{fontSize:9,color:"var(--text-dim)"}}>/100</span>
            </div>
          </div>
          <div>
            <div style={{fontSize:15,fontWeight:700,color:scoreColor,marginBottom:4}}>{scoreLbl}</div>
            <div style={{fontSize:11,color:"var(--text-dim)",lineHeight:1.5}}>Punteggio di aderenza che combina costanza calorica, proteine, allenamento e monitoraggio del peso.</div>
          </div>
        </div>
      )}

      {/* snapshot metriche */}
      {n>0&&(
        <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8,marginBottom:16}}>
          {[["Media calorie",`${avgK} kcal`,activePlan?`target ${activePlan.targetKcal}`:""],
            ["Media proteine",`${avgP} g`,activePlan?`target ${activePlan.protein}g`:""],
            ["Allenamenti/sett",`${workoutsPerWeek}`,plannedPerWeek?`piano: ${plannedPerWeek}`:""],
            ["Ritmo peso",weeklyRate==null?"—":`${weeklyRate>0?"+":""}${weeklyRate} kg`,"a settimana"]].map(([k,v,sub])=>(
            <div key={k} style={{background:"var(--surface)",borderRadius:10,padding:"12px 14px",border:"1px solid var(--border)"}}>
              <div style={{fontSize:10,color:"var(--text-dim)"}}>{k}</div>
              <div style={{fontSize:18,fontWeight:800,color:"var(--accent-light)"}}>{v}</div>
              {sub&&<div style={{fontSize:10,color:"var(--muted)"}}>{sub}</div>}
            </div>
          ))}
        </div>
      )}

      {/* consigli */}
      <div style={{fontSize:12,color:"var(--text-dim)",marginBottom:10,fontWeight:600}}>CONSIGLI PERSONALIZZATI ({tips.length})</div>
      {tips.map((t,i)=>(
        <div key={i} style={{background:"var(--surface)",borderRadius:12,marginBottom:10,padding:16,border:"1px solid var(--border)",borderLeft:`3px solid ${priColor[t.pri]}`}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
            <span style={{fontSize:18}}>{t.icon}</span>
            <span style={{fontSize:13,fontWeight:700,color:"var(--text-strong)"}}>{t.cat}</span>
            <span style={{marginLeft:"auto",fontSize:10,fontWeight:700,color:priColor[t.pri],background:priBg[t.pri],borderRadius:8,padding:"3px 9px"}}>{priLbl[t.pri]}</span>
          </div>
          <p style={{margin:0,fontSize:13,color:"var(--text)",lineHeight:1.55}}>{t.txt}</p>
          {t.action&&<button onClick={t.action} style={{marginTop:10,padding:"7px 14px",borderRadius:8,border:"none",background:"linear-gradient(135deg,var(--accent),var(--accent-deep))",color:"#fff",fontWeight:700,cursor:"pointer",fontSize:12}}>{t.actionLbl} →</button>}
        </div>
      ))}

      {tips.length===0&&n>=3&&(
        <div style={{background:"#0F2A1E",borderRadius:12,padding:24,textAlign:"center",border:"1px solid #059669"}}>
          <div style={{fontSize:30,marginBottom:8}}>🌟</div>
          <p style={{margin:0,fontSize:14,color:"#6EE7B7"}}>Tutto sotto controllo! Stai seguendo bene il piano su ogni fronte.</p>
        </div>
      )}
    </div>
  );
}


function WeightView({weights,wInput,setWInput,saveWeight,removeWeight,selectedDate,setSelectedDate,plans}){
  const keys=Object.keys(weights).sort();
  const pts=keys.map(k=>({k,v:weights[k],t:new Date(k+"T12:00:00").getTime()}));
  const latest=pts.length?pts[pts.length-1]:null;
  const first=pts.length?pts[0]:null;
  const startWeight=plans.length?[...plans].sort((a,b)=>a.validFrom.localeCompare(b.validFrom))[0].weight:null;
  // target peso: dall'obiettivo del piano attivo (semplice riferimento)
  const activePlan=plans.length?[...plans].sort((a,b)=>b.validFrom.localeCompare(a.validFrom)).find(p=>p.validFrom<=todayKey()):null;

  const totalChange=first&&latest?+(latest.v-first.v).toFixed(1):0;
  // media mobile 7 giorni (trend) sull'ultimo punto
  const last7=pts.slice(-7);
  const avg7=last7.length?+(last7.reduce((a,p)=>a+p.v,0)/last7.length).toFixed(1):null;
  // rate settimanale
  let weeklyRate=null;
  if(pts.length>=2){const days=(latest.t-first.t)/86400000;if(days>0)weeklyRate=+((latest.v-first.v)/days*7).toFixed(2);}

  // SVG chart
  const W=680,H=220,padL=38,padR=14,padT=16,padB=28;
  const vals=pts.map(p=>p.v);
  let minV=vals.length?Math.min(...vals):60, maxV=vals.length?Math.max(...vals):70;
  if(minV===maxV){minV-=1;maxV+=1;}
  const range=maxV-minV;minV-=range*0.15;maxV+=range*0.15;
  const tMin=pts.length?pts[0].t:0,tMax=pts.length?pts[pts.length-1].t:1;
  const tSpan=tMax-tMin||1;
  const x=t=>padL+((t-tMin)/tSpan)*(W-padL-padR);
  const y=v=>padT+(1-(v-minV)/(maxV-minV))*(H-padT-padB);
  const line=pts.map((p,i)=>`${i?"L":"M"}${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ");
  const area=pts.length?`${line} L${x(pts[pts.length-1].t).toFixed(1)},${H-padB} L${x(pts[0].t).toFixed(1)},${H-padB} Z`:"";
  const yTicks=4;const ticks=Array.from({length:yTicks+1},(_,i)=>minV+(i/yTicks)*(maxV-minV));

  const inp={flex:1,padding:"11px 12px",borderRadius:8,border:"1px solid var(--border)",background:"var(--bg)",color:"var(--text)",fontSize:15,outline:"none"};

  return(
    <div>
      {/* input pesata */}
      <div style={{background:"var(--surface)",borderRadius:12,padding:16,marginBottom:16,border:"1px solid var(--border)"}}>
        <h3 style={{margin:"0 0 10px",fontSize:14,fontWeight:700,color:"var(--text-strong)"}}>Registra una pesata</h3>
        <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:8}}>
          <input type="date" value={selectedDate} max={todayKey()} onChange={e=>setSelectedDate(e.target.value)} style={{padding:"10px",borderRadius:8,border:"1px solid var(--border)",background:"var(--bg)",color:"var(--text)",fontSize:13,colorScheme:"dark"}}/>
          <input value={wInput} onChange={e=>setWInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")saveWeight();}} placeholder={weights[selectedDate]?`Attuale: ${weights[selectedDate]} kg`:"es. 64.5"} inputMode="decimal" style={inp}/>
          <span style={{fontSize:13,color:"var(--text-dim)"}}>kg</span>
          <button onClick={saveWeight} style={{padding:"11px 16px",borderRadius:8,border:"none",background:"linear-gradient(135deg,var(--accent),var(--accent-deep))",color:"#fff",fontWeight:700,cursor:"pointer",fontSize:13}}>Salva</button>
        </div>
        <p style={{margin:0,fontSize:11,color:"var(--text-dim)"}}>Per coerenza pesati sempre nelle stesse condizioni: mattino, a digiuno, dopo il bagno.</p>
      </div>

      {pts.length===0?(
        <div style={{background:"var(--surface)",borderRadius:12,padding:30,textAlign:"center",border:"1px solid var(--border)"}}>
          <div style={{fontSize:34,marginBottom:10}}>⚖️</div>
          <p style={{margin:0,fontSize:14,color:"var(--text-soft)",lineHeight:1.6}}>Nessuna pesata registrata.<br/>Inserisci la prima per iniziare a vedere l'andamento.</p>
        </div>
      ):(<>
        {/* riepilogo */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:14}}>
          <div style={{background:"var(--surface)",borderRadius:10,padding:"12px",border:"1px solid var(--border)",textAlign:"center"}}>
            <div style={{fontSize:10,color:"var(--text-dim)"}}>ATTUALE</div>
            <div style={{fontSize:22,fontWeight:800,color:"var(--accent-light)"}}>{latest.v}<span style={{fontSize:12,color:"var(--muted)"}}>kg</span></div>
          </div>
          <div style={{background:"var(--surface)",borderRadius:10,padding:"12px",border:"1px solid var(--border)",textAlign:"center"}}>
            <div style={{fontSize:10,color:"var(--text-dim)"}}>VARIAZIONE</div>
            <div style={{fontSize:22,fontWeight:800,color:totalChange<0?"#34D399":totalChange>0?"#F87171":"var(--text-soft)"}}>{totalChange>0?"+":""}{totalChange}<span style={{fontSize:12,color:"var(--muted)"}}>kg</span></div>
          </div>
          <div style={{background:"var(--surface)",borderRadius:10,padding:"12px",border:"1px solid var(--border)",textAlign:"center"}}>
            <div style={{fontSize:10,color:"var(--text-dim)"}}>RITMO/SETT</div>
            <div style={{fontSize:22,fontWeight:800,color:weeklyRate<0?"#34D399":weeklyRate>0?"#FBBF24":"var(--text-soft)"}}>{weeklyRate==null?"—":`${weeklyRate>0?"+":""}${weeklyRate}`}<span style={{fontSize:12,color:"var(--muted)"}}>kg</span></div>
          </div>
        </div>

        {/* grafico */}
        <div style={{background:"var(--surface)",borderRadius:12,padding:"16px 8px 8px",marginBottom:14,border:"1px solid var(--border)"}}>
          <div style={{fontSize:13,fontWeight:700,color:"var(--text-strong)",padding:"0 8px",marginBottom:8}}>📉 Andamento peso</div>
          <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:"auto"}}>
            <defs><linearGradient id="wg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--accent)" stopOpacity="0.35"/><stop offset="100%" stopColor="var(--accent)" stopOpacity="0"/></linearGradient></defs>
            {ticks.map((tk,i)=>(<g key={i}><line x1={padL} y1={y(tk)} x2={W-padR} y2={y(tk)} stroke="var(--border)" strokeWidth="1" strokeDasharray="3 4"/><text x={padL-6} y={y(tk)+3} fill="var(--text-dim)" fontSize="10" textAnchor="end">{tk.toFixed(1)}</text></g>))}
            {startWeight!=null&&startWeight>=minV&&startWeight<=maxV&&<line x1={padL} y1={y(startWeight)} x2={W-padR} y2={y(startWeight)} stroke="#F59E0B" strokeWidth="1.2" strokeDasharray="5 4" opacity="0.7"/>}
            {pts.length>1&&<path d={area} fill="url(#wg)"/>}
            {pts.length>1&&<path d={line} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>}
            {pts.map((p,i)=>(<circle key={i} cx={x(p.t)} cy={y(p.v)} r={i===pts.length-1?4.5:3} fill={i===pts.length-1?"var(--accent-light)":"var(--accent)"} stroke="var(--bg)" strokeWidth="1.5"/>))}
            {/* x labels: primo, medio, ultimo */}
            {[0,Math.floor((pts.length-1)/2),pts.length-1].filter((v,i,a)=>a.indexOf(v)===i).map(idx=>{const p=pts[idx];const d=new Date(p.t);return(<text key={idx} x={x(p.t)} y={H-8} fill="var(--text-dim)" fontSize="10" textAnchor="middle">{d.getDate()}/{d.getMonth()+1}</text>);})}
          </svg>
          {startWeight!=null&&<div style={{fontSize:10,color:"var(--text-dim)",padding:"4px 10px"}}><span style={{color:"#F59E0B"}}>— —</span> peso iniziale del piano ({startWeight} kg)</div>}
        </div>

        {/* insight */}
        <div style={{background:activePlan?"#1E3A2F":"var(--surface)",borderRadius:12,padding:14,marginBottom:14,border:activePlan?"1px solid #059669":"1px solid var(--border)"}}>
          <div style={{fontSize:12,fontWeight:700,color:activePlan?"#6EE7B7":"var(--text-soft)",marginBottom:6}}>🧠 Lettura del trend</div>
          <div style={{fontSize:12,color:activePlan?"#A7F3D0":"var(--text-soft)",lineHeight:1.5}}>{weightInsight(weeklyRate,activePlan,avg7,totalChange,pts.length)}</div>
        </div>

        {/* lista pesate */}
        <div style={{fontSize:12,color:"var(--text-dim)",marginBottom:8,fontWeight:600}}>PESATE REGISTRATE ({pts.length})</div>
        {[...pts].reverse().map((p,i)=>{const prev=pts[pts.length-2-i];const d=prev?+(p.v-prev.v).toFixed(1):null;return(
          <div key={p.k} style={{display:"flex",alignItems:"center",gap:10,background:"var(--surface)",borderRadius:10,padding:"11px 14px",marginBottom:6,border:"1px solid var(--border)"}}>
            <div style={{flex:1}}><span style={{fontSize:13,fontWeight:700,color:"var(--text-strong)"}}>{fmtDate(p.k)}</span></div>
            {d!=null&&<span style={{fontSize:11,color:d<0?"#34D399":d>0?"#F87171":"var(--text-dim)"}}>{d>0?"+":""}{d} kg</span>}
            <span style={{fontSize:15,fontWeight:800,color:"var(--accent-light)"}}>{p.v} kg</span>
            <button onClick={()=>removeWeight(p.k)} style={{background:"none",border:"none",color:"var(--text-dim)",cursor:"pointer",fontSize:16,padding:2}}>×</button>
          </div>);})}
      </>)}
    </div>
  );
}

function weightInsight(rate,plan,avg7,totalChange,n){
  if(n<2)return "Registra almeno 2 pesate in giorni diversi per leggere il ritmo settimanale. Per dati affidabili, pesati 2-3 volte a settimana.";
  if(!plan)return `Variazione totale ${totalChange>0?"+":""}${totalChange} kg. Crea un piano nella scheda 🎯 per confrontare il ritmo con il tuo obiettivo.`;
  const goal=plan.goal;
  if(goal==="dimagrire"||goal==="ricomposizione"){
    if(rate==null)return "Continua a registrare per stimare il ritmo.";
    if(rate<-1)return `Stai perdendo ${Math.abs(rate)} kg/sett: ritmo aggressivo. Oltre ~1% del peso a settimana rischi di intaccare la massa muscolare — valuta di alzare un po' le calorie.`;
    if(rate<-0.2)return `Perdita di ${Math.abs(rate)} kg/sett: ritmo ideale per la ricomposizione. La massa muscolare è protetta, continua così.`;
    if(rate<0.2)return `Peso sostanzialmente stabile (${rate} kg/sett). Per un obiettivo di dimagrimento, considera di aumentare il deficit di ~150 kcal o l'attività. In ricomposizione, peso stabile con allenamento è normale e positivo.`;
    return `Peso in salita (+${rate} kg/sett) rispetto a un obiettivo di riduzione: rivedi l'aderenza al piano o aggiorna il target calorico nella scheda 🎯.`;
  }
  if(goal==="massa"){
    if(rate>0.1&&rate<0.4)return `Crescita di +${rate} kg/sett: ritmo ottimale per minimizzare l'accumulo di grasso in fase di massa.`;
    if(rate>=0.4)return `+${rate} kg/sett è rapido: parte sarà grasso. Valuta di ridurre il surplus.`;
    return `Per l'aumento di massa il peso dovrebbe salire lentamente; ora sei a ${rate} kg/sett. Aumenta leggermente le calorie.`;
  }
  return `Variazione ${totalChange>0?"+":""}${totalChange} kg dall'inizio. In mantenimento punta a un ritmo vicino a zero.`;
}

function initWizardData(plans){
  const last = plans.length ? [...plans].sort((a,b)=>b.validFrom.localeCompare(a.validFrom))[0] : null;
  if(last) return {...last, validFrom: todayKey(), _editing:false};
  return { sex:"m", age:37, height:170, weight:65, goal:"ricomposizione", activity:"leggero",
    workouts:[{type:"padel",kcalEst:600,perWeek:1}], likes:["pollo","tonno","salmone","uova","yogurt greco","riso","pasta integrale","avena","patate"],
    dislikes:["latte"], freeMeals:{6:["cena"],0:["pranzo"]}, validFrom: todayKey() };
}

/* ============ WIZARD COMPONENT ============ */
function Wizard({wizard,setWizard,onSave,analysis}){
  const {step,data}=wizard;
  const set=(patch)=>setWizard(w=>({...w,data:{...w.data,...patch}}));
  const go=(d)=>setWizard(w=>({...w,step:Math.max(0,Math.min(5,w.step+d))}));
  const preview=computePlan(data);
  const STEPS=["Dati","Obiettivo","Allenamenti","Preferenze","Pasti liberi","Riepilogo"];

  const inp={width:"100%",padding:"10px 12px",borderRadius:8,border:"1px solid var(--border)",background:"var(--bg)",color:"var(--text)",fontSize:14,outline:"none",boxSizing:"border-box"};
  const lbl={fontSize:12,color:"var(--text-soft)",display:"block",marginBottom:6,fontWeight:600};
  const chip=(on)=>({padding:"8px 14px",borderRadius:20,border:"none",cursor:"pointer",fontSize:13,fontWeight:600,background:on?"linear-gradient(135deg,var(--accent),var(--accent-deep))":"var(--bg)",color:on?"#fff":"var(--text-soft)",outline:on?"none":"1px solid var(--border)"});

  const FOODS=["pollo","tacchino","salmone","tonno","bresaola","uova","yogurt greco","merluzzo","avena","riso","pasta integrale","pane integrale","patate","patate dolci","gallette","mandorle","frutti di bosco","banana","mela","verdure","broccoli","spinaci"];

  return(
    <div>
      {/* progress */}
      <div style={{display:"flex",gap:4,marginBottom:18}}>{STEPS.map((s,i)=>(<div key={i} style={{flex:1,textAlign:"center"}}><div style={{height:4,borderRadius:2,background:i<=step?"var(--accent)":"var(--border)",marginBottom:5}}/><div style={{fontSize:9,color:i<=step?"var(--accent-light)":"var(--muted)"}}>{s}</div></div>))}</div>

      <div style={{background:"var(--surface)",borderRadius:14,padding:18,border:"1px solid var(--border)",marginBottom:14}}>
        {step===0&&(<>
          <h3 style={{margin:"0 0 14px",fontSize:16,color:"var(--text-strong)"}}>I tuoi dati</h3>
          <div style={{display:"flex",gap:8,marginBottom:12}}>{[["m","Uomo"],["f","Donna"]].map(([v,l])=>(<button key={v} onClick={()=>set({sex:v})} style={{...chip(data.sex===v),flex:1}}>{l}</button>))}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
            <div><label style={lbl}>Età</label><input type="number" value={data.age} onChange={e=>set({age:+e.target.value})} style={inp}/></div>
            <div><label style={lbl}>Altezza (cm)</label><input type="number" value={data.height} onChange={e=>set({height:+e.target.value})} style={inp}/></div>
            <div><label style={lbl}>Peso (kg)</label><input type="number" value={data.weight} onChange={e=>set({weight:+e.target.value})} style={inp}/></div>
          </div>
          <label style={{...lbl,marginTop:14}}>Livello di attività quotidiana (esclusi allenamenti)</label>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{[["sedentario","Sedentario"],["leggero","Leggero"],["moderato","Moderato"],["attivo","Attivo"]].map(([v,l])=>(<button key={v} onClick={()=>set({activity:v})} style={chip(data.activity===v)}>{l}</button>))}</div>
        </>)}

        {step===1&&(<>
          <h3 style={{margin:"0 0 14px",fontSize:16,color:"var(--text-strong)"}}>Obiettivo</h3>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>{[["dimagrire","🔻 Dimagrire","Deficit ~18%, priorità perdita grassa"],["ricomposizione","♻️ Ricomposizione","Deficit lieve ~10%, grasso giù + muscolo"],["mantenimento","⚖️ Mantenimento","Calorie di mantenimento"],["massa","🔺 Aumento massa","Surplus ~10% per crescita muscolare"]].map(([v,t,d])=>(<button key={v} onClick={()=>set({goal:v})} style={{textAlign:"left",padding:"12px 14px",borderRadius:10,border:data.goal===v?"1px solid var(--accent)":"1px solid var(--border)",background:data.goal===v?"var(--accent-deep)22":"var(--bg)",cursor:"pointer"}}><div style={{fontSize:14,fontWeight:700,color:data.goal===v?"var(--accent-light)":"var(--text)"}}>{t}</div><div style={{fontSize:11,color:"var(--text-dim)",marginTop:2}}>{d}</div></button>))}</div>
        </>)}

        {step===2&&(<>
          <h3 style={{margin:"0 0 6px",fontSize:16,color:"var(--text-strong)"}}>Abitudini di allenamento</h3>
          <p style={{margin:"0 0 14px",fontSize:12,color:"var(--text-dim)"}}>Aggiungi le attività settimanali tipiche: servono a calibrare il fabbisogno.</p>
          {(data.workouts||[]).map((w,i)=>{const t=WORKOUT_TYPES.find(x=>x.id===w.type)||WORKOUT_TYPES[0];return(
            <div key={i} style={{display:"flex",gap:8,alignItems:"center",marginBottom:8,background:"var(--bg)",borderRadius:10,padding:10}}>
              <select value={w.type} onChange={e=>{const wt=WORKOUT_TYPES.find(x=>x.id===e.target.value);const arr=[...data.workouts];arr[i]={...arr[i],type:e.target.value,kcalEst:wt.est};set({workouts:arr});}} style={{...inp,flex:"1 1 auto",padding:"8px"}}>{WORKOUT_TYPES.map(x=>(<option key={x.id} value={x.id}>{x.icon} {x.label}</option>))}</select>
              <input type="number" value={w.perWeek} onChange={e=>{const arr=[...data.workouts];arr[i]={...arr[i],perWeek:+e.target.value};set({workouts:arr});}} style={{...inp,width:55,padding:"8px"}} title="volte/sett"/>
              <span style={{fontSize:11,color:"var(--text-dim)"}}>×/sett</span>
              <input type="number" value={w.kcalEst} onChange={e=>{const arr=[...data.workouts];arr[i]={...arr[i],kcalEst:+e.target.value};set({workouts:arr});}} style={{...inp,width:65,padding:"8px"}} title="kcal stimate"/>
              <span style={{fontSize:11,color:"var(--text-dim)"}}>kcal</span>
              <button onClick={()=>set({workouts:data.workouts.filter((_,j)=>j!==i)})} style={{background:"none",border:"none",color:"var(--text-dim)",cursor:"pointer",fontSize:18}}>×</button>
            </div>);})}
          <button onClick={()=>set({workouts:[...(data.workouts||[]),{type:"corpolibero",kcalEst:250,perWeek:1}]})} style={{padding:"9px 14px",borderRadius:8,border:"1px dashed var(--muted)",background:"transparent",color:"var(--text-soft)",cursor:"pointer",fontSize:12,width:"100%"}}>+ Aggiungi attività</button>
        </>)}

        {step===3&&(<>
          <h3 style={{margin:"0 0 6px",fontSize:16,color:"var(--text-strong)"}}>Preferenze alimentari</h3>
          <p style={{margin:"0 0 12px",fontSize:12,color:"var(--text-dim)"}}>Tocca per indicare cosa gradisci. Il latte è già escluso di default.</p>
          <label style={lbl}>✅ Alimenti graditi</label>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>{FOODS.map(f=>{const on=(data.likes||[]).includes(f);return(<button key={f} onClick={()=>set({likes:on?data.likes.filter(x=>x!==f):[...(data.likes||[]),f]})} style={{...chip(on),padding:"6px 11px",fontSize:12}}>{f}</button>);})}</div>
          <label style={lbl}>🚫 Da evitare (testo libero, separato da virgola)</label>
          <input value={(data.dislikes||[]).join(", ")} onChange={e=>set({dislikes:e.target.value.split(",").map(s=>s.trim()).filter(Boolean)})} style={inp} placeholder="es: latte, lattosio, fritti"/>
        </>)}

        {step===4&&(<>
          <h3 style={{margin:"0 0 6px",fontSize:16,color:"var(--text-strong)"}}>Pasti liberi</h3>
          <p style={{margin:"0 0 14px",fontSize:12,color:"var(--text-dim)"}}>Quando concederti il pasto libero durante la settimana.</p>
          {[1,2,3,4,5,6,0].map(di=>(<div key={di} style={{marginBottom:8}}><div style={{fontSize:13,fontWeight:600,color:"var(--text)",marginBottom:6}}>{DOW[di]}</div><div style={{display:"flex",gap:5,flexWrap:"wrap"}}>{MEAL_SLOTS.map(s=>{const cur=data.freeMeals?.[di]||[];const on=cur.includes(s.id);return(<button key={s.id} onClick={()=>{const fm={...(data.freeMeals||{})};const arr=fm[di]||[];const next=arr.includes(s.id)?arr.filter(x=>x!==s.id):[...arr,s.id];if(next.length)fm[di]=next;else delete fm[di];set({freeMeals:fm});}} style={{padding:"5px 10px",borderRadius:16,border:"none",cursor:"pointer",fontSize:11,fontWeight:600,background:on?"linear-gradient(135deg,#D97706,#B45309)":"var(--bg)",color:on?"#fff":"var(--text-dim)",outline:on?"none":"1px solid var(--border)"}}>{s.icon}</button>);})}</div></div>))}
        </>)}

        {step===5&&(<>
          <h3 style={{margin:"0 0 14px",fontSize:16,color:"var(--text-strong)"}}>Riepilogo piano</h3>
          {analysis&&(
            <div style={{background:"#1E3A2F",border:"1px solid #059669",borderRadius:10,padding:"12px 14px",marginBottom:14}}>
              <div style={{fontSize:12,fontWeight:700,color:"#6EE7B7",marginBottom:6}}>🧠 Analisi dei tuoi dati ({analysis.n} giorni)</div>
              <div style={{fontSize:12,color:"#A7F3D0",lineHeight:1.5}}>{analysis.note}</div>
              {analysis.suggestion!==0&&<button onClick={()=>set({learnedAdjustment:(data.learnedAdjustment||0)+analysis.suggestion})} style={{marginTop:8,padding:"6px 12px",borderRadius:6,border:"none",background:"#059669",color:"#fff",fontSize:11,fontWeight:700,cursor:"pointer"}}>Applica aggiustamento {analysis.suggestion>0?"+":""}{analysis.suggestion} kcal</button>}
              {analysis.proteinLow&&<div style={{fontSize:11,color:"#FBBF24",marginTop:8}}>⚠️ Le tue proteine medie ({analysis.avgP}g) sono sotto il target: punta a distribuirle meglio nei pasti.</div>}
            </div>
          )}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
            {[["BMR",`${preview.bmr} kcal`],["TDEE",`${preview.tdee} kcal`],["Da allenamenti","+"+preview.weeklyBurn+" kcal/sett"],["Target giorno normale",`${preview.targetKcal} kcal`]].map(([k,v])=>(<div key={k} style={{background:"var(--bg)",borderRadius:8,padding:"10px 12px"}}><div style={{fontSize:10,color:"var(--text-dim)"}}>{k}</div><div style={{fontSize:15,fontWeight:700,color:"var(--accent-light)"}}>{v}</div></div>))}
          </div>
          <div style={{background:"linear-gradient(135deg,var(--header-from),var(--surface))",borderRadius:10,padding:14,marginBottom:14}}>
            <div style={{fontSize:12,fontWeight:700,color:"#93C5FD",marginBottom:10}}>🎯 Target macro (giorno normale)</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>{[["Kcal",preview.targetKcal,"var(--accent-light)"],["Prot",preview.protein+"g","var(--accent)"],["Carb",preview.carbs+"g","#F59E0B"],["Grassi",preview.fat+"g","#10B981"]].map(([k,v,c])=>(<div key={k} style={{textAlign:"center"}}><div style={{fontSize:18,fontWeight:800,color:c}}>{v}</div><div style={{fontSize:9,color:"var(--text-dim)"}}>{k}</div></div>))}</div>
            <div style={{fontSize:11,color:"var(--text-dim)",marginTop:10,paddingTop:10,borderTop:"1px solid var(--border)"}}>Giorni sport 🎾: {preview.sport.kcal} kcal · {preview.sport.c}g carbo</div>
          </div>
          <label style={lbl}>📅 Il piano è valido a partire dal</label>
          <input type="date" value={data.validFrom} onChange={e=>set({validFrom:e.target.value})} style={{...inp,colorScheme:"dark"}}/>
          <p style={{fontSize:11,color:"var(--text-dim)",marginTop:8}}>I piani precedenti restano nello storico. Le giornate prima di questa data continuano a usare il piano in vigore allora.</p>
        </>)}
      </div>

      <div style={{display:"flex",gap:8}}>
        {step>0&&<button onClick={()=>go(-1)} style={{flex:1,padding:"12px",borderRadius:8,border:"1px solid var(--border)",background:"transparent",color:"var(--text-soft)",cursor:"pointer",fontSize:14,fontWeight:600}}>← Indietro</button>}
        <button onClick={()=>setWizard(null)} style={{padding:"12px 16px",borderRadius:8,border:"1px solid var(--border)",background:"transparent",color:"var(--text-dim)",cursor:"pointer",fontSize:13}}>Annulla</button>
        {step<5?<button onClick={()=>go(1)} style={{flex:2,padding:"12px",borderRadius:8,border:"none",background:"linear-gradient(135deg,var(--accent),var(--accent-deep))",color:"#fff",cursor:"pointer",fontSize:14,fontWeight:700}}>Avanti →</button>
        :<button onClick={()=>onSave({...computePlan(data),...data,id:Date.now()})} style={{flex:2,padding:"12px",borderRadius:8,border:"none",background:"linear-gradient(135deg,#059669,#047857)",color:"#fff",cursor:"pointer",fontSize:14,fontWeight:700}}>✓ Salva piano</button>}
      </div>
    </div>
  );
}

/* ============ PLAN VIEW (lista versioni) ============ */
function PlanView({plans,onNew,onEdit,onOpenMenu}){
  const sorted=[...plans].sort((a,b)=>b.validFrom.localeCompare(a.validFrom));
  const current=sorted.find(p=>p.validFrom<=todayKey())||sorted[0];
  return(
    <div>
      <button onClick={onNew} style={{width:"100%",padding:"14px",borderRadius:12,border:"none",background:"linear-gradient(135deg,var(--accent),var(--accent-deep))",color:"#fff",fontWeight:700,cursor:"pointer",fontSize:15,marginBottom:16}}>
        {plans.length?"+ Aggiorna / crea nuovo piano":"🎯 Crea il tuo primo piano personalizzato"}
      </button>
      {plans.length===0?(
        <div style={{background:"var(--surface)",borderRadius:12,padding:30,textAlign:"center",border:"1px solid var(--border)"}}>
          <div style={{fontSize:34,marginBottom:10}}>🎯</div>
          <p style={{margin:0,fontSize:14,color:"var(--text-soft)",lineHeight:1.6}}>Nessun piano ancora.<br/>Crea il primo: bastano 6 passaggi rapidi. Calcolo BMR, TDEE e macro su misura per il tuo obiettivo.</p>
        </div>
      ):(<>
        <div style={{fontSize:12,color:"var(--text-dim)",marginBottom:10,fontWeight:600}}>STORICO PIANI ({plans.length})</div>
        {sorted.map((p,i)=>{const isCurrent=p===current;return(
          <div key={p.id||i} style={{background:"var(--surface)",borderRadius:12,marginBottom:10,padding:16,border:isCurrent?"1px solid var(--accent)":"1px solid var(--border)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:14,fontWeight:700,color:"var(--text-strong)"}}>Valido dal {fmtShort(p.validFrom)}</span>
                  {isCurrent&&<span style={{fontSize:10,background:"var(--accent-deep)",color:"#fff",borderRadius:8,padding:"2px 8px",fontWeight:700}}>ATTIVO</span>}
                </div>
                <div style={{fontSize:11,color:"var(--text-dim)",marginTop:3}}>{({dimagrire:"🔻 Dimagrire",ricomposizione:"♻️ Ricomposizione",mantenimento:"⚖️ Mantenimento",massa:"🔺 Massa"})[p.goal]} · {p.weight}kg · {p.sex==="m"?"Uomo":"Donna"} {p.age}a</div>
              </div>
              <button onClick={()=>onEdit(p)} style={{padding:"6px 12px",borderRadius:8,border:"1px solid var(--border)",background:"transparent",color:"var(--accent-light)",cursor:"pointer",fontSize:12}}>Duplica</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,background:"var(--bg)",borderRadius:8,padding:10}}>
              {[["Kcal",p.targetKcal,"var(--accent-light)"],["Prot",p.protein+"g","var(--accent)"],["Carb",p.carbs+"g","#F59E0B"],["Grassi",p.fat+"g","#10B981"]].map(([k,v,c])=>(<div key={k} style={{textAlign:"center"}}><div style={{fontSize:16,fontWeight:800,color:c}}>{v}</div><div style={{fontSize:9,color:"var(--text-dim)"}}>{k}</div></div>))}
            </div>
            {p.learnedAdjustment?<div style={{fontSize:10,color:"#6EE7B7",marginTop:8}}>🧠 Include aggiustamento dai dati: {p.learnedAdjustment>0?"+":""}{p.learnedAdjustment} kcal</div>:null}
            {isCurrent&&(
              <button onClick={()=>onOpenMenu(p)} style={{width:"100%",marginTop:12,padding:"12px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#7C3AED,#5B21B6)",color:"#fff",fontWeight:700,cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                🍽️ Genera menù del giorno
              </button>
            )}
            {isCurrent&&<div style={{fontSize:10,color:"var(--text-dim)",marginTop:6,textAlign:"center"}}>Ricette su misura per i tuoi target, diverse ogni giorno</div>}
          </div>);})}
      </>)}
    </div>
  );
}

/* ============ PRODUCT ROW (risultato ricerca) ============ */
function ProductRow({ prod, onAdd }) {
  const [grams, setGrams] = useState(prod.serving || 100);
  const fct = grams/100;
  return (
    <div style={{ background:"var(--bg)", borderRadius:10, padding:12, marginBottom:8, border:"1px solid var(--border)" }}>
      <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:8 }}>
        {prod.img ? <img src={prod.img} alt="" style={{ width:40, height:40, borderRadius:6, objectFit:"cover", background:"var(--surface)" }}/> : <div style={{ width:40, height:40, borderRadius:6, background:"var(--surface)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>🍫</div>}
        <div style={{ flex:1 }}>
          <div style={{ fontSize:13, fontWeight:600, color:"var(--text)", lineHeight:1.3 }}>{prod.name}</div>
          <div style={{ fontSize:10, color:"var(--text-dim)" }}>per 100g: {prod.kcal100}kcal · P{prod.p100} C{prod.c100} F{prod.f100}{prod.servingTxt?` · porz: ${prod.servingTxt}`:""}</div>
        </div>
      </div>
      <div style={{ display:"flex", gap:8, alignItems:"center" }}>
        <input type="number" value={grams} onChange={e=>setGrams(Math.max(0,parseInt(e.target.value)||0))}
          style={{ width:70, padding:"7px 8px", borderRadius:6, border:"1px solid var(--border)", background:"var(--surface)", color:"var(--text)", fontSize:13, outline:"none" }}/>
        <span style={{ fontSize:12, color:"var(--text-dim)" }}>g →</span>
        <span style={{ fontSize:12, color:"var(--accent-light)", fontWeight:700 }}>{Math.round(prod.kcal100*fct)} kcal</span>
        <span style={{ fontSize:11, color:"var(--text-dim)" }}>P{(prod.p100*fct).toFixed(1)} C{(prod.c100*fct).toFixed(1)} F{(prod.f100*fct).toFixed(1)}</span>
        <button onClick={()=>onAdd(grams)} style={{ marginLeft:"auto", padding:"7px 14px", borderRadius:6, border:"none", background:"linear-gradient(135deg,var(--accent),var(--accent-deep))", color:"#fff", fontWeight:700, cursor:"pointer", fontSize:12 }}>+ Aggiungi</button>
      </div>
    </div>
  );
}

/* ============ SCHERMATA LOGIN / REGISTRAZIONE ============ */
function AuthScreen({theme,setTheme,onWelcome}){
  const [mode,setMode]=useState("login"); // login | signup | forgot
  const [email,setEmail]=useState("");
  const [pw,setPw]=useState("");
  const [alias,setAlias]=useState("");
  const [busy,setBusy]=useState(false);
  const [msg,setMsg]=useState(null); // {t:'err'|'ok', x}
  const [info,setInfo]=useState(null);

  const inp={width:"100%",padding:"12px 14px",borderRadius:10,border:"1px solid var(--border)",background:"var(--bg)",color:"var(--text)",fontSize:15,outline:"none",boxSizing:"border-box",marginBottom:10};

  const submit=async()=>{
    setMsg(null); setInfo(null);
    if(!email.trim()||(mode!=="forgot"&&!pw)){ setMsg({t:"err",x:"Compila tutti i campi."}); return; }
    if(mode==="signup"&&!alias.trim()){ setMsg({t:"err",x:"Scegli un nome da mostrare."}); return; }
    setBusy(true);
    if(mode==="signup"){
      const r=await signUp(email,pw,alias);
      setBusy(false);
      if(r.error){ setMsg({t:"err",x:r.error}); return; }
      if(r.needsConfirm){ setInfo("Ti abbiamo inviato un'email di conferma. Aprila e tocca il link, poi torna qui e accedi."); setMode("login"); setPw(""); return; }
      onWelcome(alias.trim());
    } else if(mode==="login"){
      const r=await signIn(email,pw);
      setBusy(false);
      if(r.error){ setMsg({t:"err",x:r.error}); return; }
      onWelcome(aliasOf(r.user));
    } else { // forgot
      const r=await resetPassword(email);
      setBusy(false);
      if(r.error){ setMsg({t:"err",x:r.error}); return; }
      setInfo("Se l'email è registrata, riceverai un link per reimpostare la password. Controlla anche lo spam.");
      setMode("login");
    }
  };

  return(
    <div style={{background:"var(--bg)",minHeight:"100vh",color:"var(--text)",fontFamily:"'Inter','Segoe UI',sans-serif",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"24px 18px"}}>
      <div style={{width:"100%",maxWidth:380}}>
        <div style={{textAlign:"center",marginBottom:24}}>
          <img src="/icon-192.png" alt="" style={{width:64,height:64,borderRadius:16,marginBottom:12}}/>
          <h1 style={{margin:0,fontSize:24,fontWeight:800,color:"var(--text-strong)",letterSpacing:"-0.5px"}}>NutriCoach</h1>
          <p style={{margin:"4px 0 0",fontSize:13,color:"var(--text-dim)"}}>
            {mode==="login"?"Accedi al tuo account":mode==="signup"?"Crea il tuo account":"Recupera la password"}
          </p>
        </div>

        <div style={{background:"var(--surface)",borderRadius:16,padding:20,border:"1px solid var(--border)"}}>
          {mode==="signup"&&(
            <input value={alias} onChange={e=>setAlias(e.target.value)} placeholder="Nome da mostrare (es. Adriano)" style={inp} maxLength={40}/>
          )}
          <input value={email} onChange={e=>setEmail(e.target.value)} type="email" inputMode="email" autoCapitalize="none" autoCorrect="off" placeholder="Email" style={inp}/>
          {mode!=="forgot"&&(
            <input value={pw} onChange={e=>setPw(e.target.value)} type="password" placeholder="Password" style={inp} onKeyDown={e=>{if(e.key==="Enter")submit();}}/>
          )}

          {msg&&<div style={{background:"#3B1212",border:"1px solid #7F1D1D",borderRadius:8,padding:"9px 12px",fontSize:12,color:"#FCA5A5",marginBottom:10}}>{msg.x}</div>}
          {info&&<div style={{background:"#0F2A1E",border:"1px solid #059669",borderRadius:8,padding:"9px 12px",fontSize:12,color:"#A7F3D0",marginBottom:10,lineHeight:1.5}}>{info}</div>}

          <button onClick={submit} disabled={busy} style={{width:"100%",padding:"13px",borderRadius:10,border:"none",background:"linear-gradient(135deg,var(--accent),var(--accent-deep))",color:"#fff",fontWeight:700,fontSize:15,cursor:"pointer",marginBottom:6}}>
            {busy?"…":mode==="login"?"Accedi":mode==="signup"?"Crea account":"Invia link di recupero"}
          </button>

          {mode==="login"&&(
            <div style={{textAlign:"center",marginTop:6}}>
              <button onClick={()=>{setMode("forgot");setMsg(null);setInfo(null);}} style={{background:"none",border:"none",color:"var(--text-dim)",fontSize:12,cursor:"pointer",textDecoration:"underline"}}>Password dimenticata?</button>
            </div>
          )}
        </div>

        <div style={{textAlign:"center",marginTop:18,fontSize:13,color:"var(--text-soft)"}}>
          {mode==="login"&&<>Non hai un account? <button onClick={()=>{setMode("signup");setMsg(null);setInfo(null);}} style={{background:"none",border:"none",color:"var(--accent-light)",fontWeight:700,cursor:"pointer",fontSize:13}}>Registrati</button></>}
          {mode==="signup"&&<>Hai già un account? <button onClick={()=>{setMode("login");setMsg(null);setInfo(null);}} style={{background:"none",border:"none",color:"var(--accent-light)",fontWeight:700,cursor:"pointer",fontSize:13}}>Accedi</button></>}
          {mode==="forgot"&&<button onClick={()=>{setMode("login");setMsg(null);setInfo(null);}} style={{background:"none",border:"none",color:"var(--accent-light)",fontWeight:700,cursor:"pointer",fontSize:13}}>← Torna all'accesso</button>}
        </div>

        <div style={{display:"flex",justifyContent:"center",gap:8,marginTop:24}}>
          {[["midnight","🌙"],["fresh","☀️"]].map(([id,ic])=>(
            <button key={id} onClick={()=>setTheme(id)} style={{padding:"6px 12px",borderRadius:8,border:theme===id?"1px solid var(--accent)":"1px solid var(--border)",background:"transparent",color:theme===id?"var(--accent)":"var(--text-dim)",cursor:"pointer",fontSize:12}}>{ic} {id==="midnight"?"Scuro":"Chiaro"}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============ SCHERMATA RESET PASSWORD (dopo link email) ============ */
function ResetPasswordScreen({theme,onDone}){
  const [pw,setPw]=useState("");
  const [pw2,setPw2]=useState("");
  const [busy,setBusy]=useState(false);
  const [msg,setMsg]=useState(null);
  const inp={width:"100%",padding:"12px 14px",borderRadius:10,border:"1px solid var(--border)",background:"var(--bg)",color:"var(--text)",fontSize:15,outline:"none",boxSizing:"border-box",marginBottom:10};
  const submit=async()=>{
    if(pw.length<6){ setMsg({t:"err",x:"La password deve avere almeno 6 caratteri."}); return; }
    if(pw!==pw2){ setMsg({t:"err",x:"Le due password non coincidono."}); return; }
    setBusy(true);
    const r=await updatePassword(pw);
    setBusy(false);
    if(r.error){ setMsg({t:"err",x:r.error}); return; }
    setMsg({t:"ok",x:"Password aggiornata! Ora puoi usare l'app."});
    setTimeout(onDone,1400);
  };
  return(
    <div style={{background:"var(--bg)",minHeight:"100vh",color:"var(--text)",fontFamily:"'Inter','Segoe UI',sans-serif",display:"flex",alignItems:"center",justifyContent:"center",padding:"24px 18px"}}>
      <div style={{width:"100%",maxWidth:380}}>
        <h1 style={{textAlign:"center",fontSize:20,fontWeight:800,color:"var(--text-strong)",marginBottom:6}}>Nuova password</h1>
        <p style={{textAlign:"center",fontSize:13,color:"var(--text-dim)",marginBottom:20}}>Imposta una nuova password per il tuo account.</p>
        <div style={{background:"var(--surface)",borderRadius:16,padding:20,border:"1px solid var(--border)"}}>
          <input value={pw} onChange={e=>setPw(e.target.value)} type="password" placeholder="Nuova password" style={inp}/>
          <input value={pw2} onChange={e=>setPw2(e.target.value)} type="password" placeholder="Ripeti la password" style={inp} onKeyDown={e=>{if(e.key==="Enter")submit();}}/>
          {msg&&<div style={{background:msg.t==="ok"?"#0F2A1E":"#3B1212",border:`1px solid ${msg.t==="ok"?"#059669":"#7F1D1D"}`,borderRadius:8,padding:"9px 12px",fontSize:12,color:msg.t==="ok"?"#A7F3D0":"#FCA5A5",marginBottom:10}}>{msg.x}</div>}
          <button onClick={submit} disabled={busy} style={{width:"100%",padding:"13px",borderRadius:10,border:"none",background:"linear-gradient(135deg,var(--accent),var(--accent-deep))",color:"#fff",fontWeight:700,fontSize:15,cursor:"pointer"}}>{busy?"…":"Salva password"}</button>
        </div>
      </div>
    </div>
  );
}
