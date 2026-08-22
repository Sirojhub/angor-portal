// ============================================================
// ANGOR AGRO STAR PORTAL — Ma'lumotlar boshqaruvi (localStorage)
// ============================================================

const DB = {
  // --- Kalitlar ---
  KEYS: {
    USERS:    'ags_users',
    TASKS:    'ags_tasks',
    DOCS:     'ags_documents',
    CLIENTS:  'ags_clients',
    CONTRACTS:'ags_contracts',
    WAREHOUSE:'ags_warehouse',
    WAREHOUSE_TXN:'ags_warehouse_txn',
    LAB_SAMPLES:  'ags_lab_samples',
    LAB_RESULTS:  'ags_lab_results',
    EMPLOYEES:'ags_employees',
    NOTIFS:   'ags_notifications',
    LOGS:     'ags_activity_logs',
    SETTINGS: 'ags_settings',
    ANALYTICS:'ags_analytics'
  },

  // --- CRUD yordamchilari ---
  get(key)        { try{ return JSON.parse(localStorage.getItem(key)||'[]'); }catch(e){ return []; } },
  set(key,data)   { localStorage.setItem(key, JSON.stringify(data)); },
  getOne(key,id)  { return this.get(key).find(x=>x.id===parseInt(id)||x.id===id)||null; },
  getById(key,id) { return this.getOne(key,id); },
  nextId(key)     { const d=this.get(key); return d.length? Math.max(...d.map(x=>x.id))+1 : 1; },

  create(key,obj) {
    const data = this.get(key);
    obj.id = this.nextId(key);
    obj.created_at = obj.created_at||new Date().toISOString();
    obj.updated_at = new Date().toISOString();
    data.push(obj);
    this.set(key,data);
    return obj;
  },
  update(key,id,changes){
    const data = this.get(key);
    const idx  = data.findIndex(x=>x.id===id);
    if(idx===-1)return null;
    data[idx] = {...data[idx],...changes, updated_at:new Date().toISOString()};
    this.set(key,data);
    return data[idx];
  },
  delete(key,id){
    const data = this.get(key).filter(x=>x.id!==id);
    this.set(key,data);
  },
  filter(key,fn){ return this.get(key).filter(fn); },
  count(key,fn)  { return fn? this.get(key).filter(fn).length : this.get(key).length; }
};

// ============================================================
// Boshlang'ich ma'lumotlar (birinchi yuklashda)
// ============================================================
function seedData(){
  if(localStorage.getItem('ags_seeded')) return;

  // --- Xodimlar ---
  const employees = [
    {id:1,name:'Aziz Karimov',role:'director',position:'Direktor',email:'aziz@angor.uz',password:'',avatar:'AK',avatarColor:'#C8922A',department:'Boshqaruv',phone:'+998 90 111-22-33',hireDate:'2021-03-01',efficiency:98,status:'active'},
    {id:6,name:'Sirojiddin Faxriddinovich',role:'employee',position:'Bosh agronom',email:'sirojiddin1997tmi@gmail.com',password:'REDACTED_OLD_PASSWORD',avatar:'SF',avatarColor:'#C8922A',department:'Ishlab chiqarish',phone:'+998 90 123-45-67',hireDate:'2026-08-21',efficiency:95,status:'active'}
  ];
  DB.set(DB.KEYS.USERS, employees);

  // --- Topshiriqlar ---
  const tasks = [
    {id:1,title:'Brokkoli dalasini sug\'orish jadvalini yangilash',description:'Aprel oyidan boshlab yangi sug\'orish jadvalini tuzish va tasdiqlash',assignedTo:3,assignedName:'Bobur Toshev',deadline:'2026-07-07',priority:'medium',status:'new',category:'Ishlab chiqarish',createdBy:1,created_at:'2026-06-20T08:00:00Z'},
    {id:2,title:'Piyoz eksporti uchun shartnoma loyihasini tayyorlash',description:'AgroTrade LLC bilan yangi shartnoma SH-2026/15 loyihasini tuzish',assignedTo:2,assignedName:'Dilnoza Rahimova',deadline:'2026-07-09',priority:'high',status:'new',category:'Eksport',createdBy:1,created_at:'2026-06-21T08:00:00Z'},
    {id:3,title:'Yangi urug\'lik karam navlari bo\'yicha taklif tayyorlash',description:'Xitoy va Gollandiya navlarini taqqoslash va eng yaxshisini tanlash',assignedTo:5,assignedName:'Jasur Ergashev',deadline:'2026-07-12',priority:'low',status:'new',category:'Agrotexnika',createdBy:1,created_at:'2026-06-22T08:00:00Z'},
    {id:4,title:'Eksport uchun fitosanitariya sertifikatini rasmiylashtirish',description:'Rossiya yo\'nalishi uchun fitosanitariya sertifikati olish',assignedTo:4,assignedName:'Malika Yusupova',deadline:'2026-07-10',priority:'high',status:'new',category:'Eksport',createdBy:1,created_at:'2026-06-22T09:00:00Z'},
    {id:5,title:'3-dala piyoz hosilini yig\'ishni yakunlash',description:'3-dalaning 100% hosilini yig\'ib, omborga topshirish',assignedTo:3,assignedName:'Bobur Toshev',deadline:'2026-07-06',priority:'high',status:'progress',category:'Ishlab chiqarish',createdBy:1,created_at:'2026-06-15T08:00:00Z'},
    {id:6,title:'Iyun oyi moliyaviy hisobotini topshirish',description:'Moliya vazirligiga iyun oyi moliyaviy hisobotini tayyorlab topshirish',assignedTo:2,assignedName:'Dilnoza Rahimova',deadline:'2026-07-03',priority:'high',status:'progress',category:'Moliya',createdBy:1,created_at:'2026-06-01T08:00:00Z'},
    {id:7,title:'Sovutkichli omborga karam partiyasini joylashtirish',description:'500 tonna karam partiyasini temperaturasi -2°C bo\'lgan omborga joylashtirish',assignedTo:4,assignedName:'Malika Yusupova',deadline:'2026-07-08',priority:'medium',status:'progress',category:'Omborxona',createdBy:1,created_at:'2026-06-20T08:00:00Z'},
    {id:8,title:'Sug\'orish nasosini ta\'mirlash',description:'3-dalaning sug\'orish nasosi buzilgan, shoshilinch ta\'mirlash kerak',assignedTo:5,assignedName:'Jasur Ergashev',deadline:'2026-06-30',priority:'medium',status:'progress',category:'Texnika',createdBy:1,created_at:'2026-06-25T08:00:00Z'},
    {id:9,title:'2-dala brokkoli ekish rejasini tuzish',description:'Iyul oyida ekish uchun 2-dala tayyorlash rejasi',assignedTo:3,assignedName:'Bobur Toshev',deadline:'2026-07-11',priority:'low',status:'progress',category:'Agrotexnika',createdBy:1,created_at:'2026-06-18T08:00:00Z'},
    {id:10,title:'Brokkoli partiyasini yuklab jo\'natish',description:'300 tonna brokkoli partiyasini Toshkentga jo\'natish',assignedTo:4,assignedName:'Malika Yusupova',deadline:'2026-07-04',priority:'high',status:'review',category:'Eksport',createdBy:1,created_at:'2026-06-10T08:00:00Z'},
    {id:11,title:'O\'g\'it yetkazib beruvchi bilan muzokara o\'tkazish',description:'FertUz kompaniyasi bilan yangi shartnoma shartlari muhokamasi',assignedTo:3,assignedName:'Bobur Toshev',deadline:'2026-07-02',priority:'medium',status:'review',category:'Xarid',createdBy:1,created_at:'2026-06-05T08:00:00Z'},
    {id:12,title:'May oyi ish haqi vedomostini tayyorlash',description:'Barcha xodimlar uchun ish haqi vedomostini tuzish',assignedTo:2,assignedName:'Dilnoza Rahimova',deadline:'2026-06-28',priority:'medium',status:'done',category:'Moliya',createdBy:1,created_at:'2026-06-20T08:00:00Z'}
  ];
  DB.set(DB.KEYS.TASKS, tasks);

  // --- Hujjatlar ---
  const documents = [
    {id:1,title:'Piyoz eksport shartnomasi — AgroTrade LLC',category:'shartnoma',subcategory:'Eksport',version:'v3',fileType:'PDF',fileSize:'2.4 MB',uploadedBy:2,uploadedName:'Dilnoza Rahimova',uploadDate:'2026-03-12',status:'active',description:'Yillik piyoz eksport asosiy shartnomasi'},
    {id:2,title:'Sifat kafolati ilovasi — AgroTrade LLC',category:'shartnoma',subcategory:'Eksport',version:'v1',fileType:'PDF',fileSize:'1.1 MB',uploadedBy:4,uploadedName:'Malika Yusupova',uploadDate:'2026-03-12',status:'active',description:''},
    {id:3,title:'Karam yetishtirish texnologik xaritasi',category:'dala_jurnali',subcategory:'Agrotexnika',version:'v2',fileType:'XLSX',fileSize:'890 KB',uploadedBy:3,uploadedName:'Bobur Toshev',uploadDate:'2026-03-01',status:'active',description:''},
    {id:4,title:'3-dala piyoz jurnali — 2026',category:'dala_jurnali',subcategory:'Dala',version:'v5',fileType:'XLSX',fileSize:'1.8 MB',uploadedBy:3,uploadedName:'Bobur Toshev',uploadDate:'2026-01-10',status:'active',description:''},
    {id:5,title:'Iyun oyi moliyaviy hisobot',category:'moliyaviy',subcategory:'Hisobot',version:'v1',fileType:'XLSX',fileSize:'3.2 MB',uploadedBy:2,uploadedName:'Dilnoza Rahimova',uploadDate:'2026-07-05',status:'pending',description:''},
    {id:6,title:'FertUz o\'g\'it yetkazib berish shartnomasi',category:'shartnoma',subcategory:'Xarid',version:'v2',fileType:'PDF',fileSize:'1.5 MB',uploadedBy:2,uploadedName:'Dilnoza Rahimova',uploadDate:'2026-04-20',status:'active',description:''},
    {id:7,title:'Fitosanitariya sertifikati — Rossiya 2026',category:'sertifikat',subcategory:'Eksport',version:'v1',fileType:'PDF',fileSize:'450 KB',uploadedBy:4,uploadedName:'Malika Yusupova',uploadDate:'2026-06-15',status:'active',description:''},
    {id:8,title:'Direktor buyrug\'i №12 — Sug\'orish rejasi',category:'buyruq',subcategory:'Boshqaruv',version:'v1',fileType:'DOCX',fileSize:'230 KB',uploadedBy:1,uploadedName:'Aziz Karimov',uploadDate:'2026-03-28',status:'active',description:''},
    {id:9,title:'2025 yil moliyaviy yillik hisobot',category:'moliyaviy',subcategory:'Hisobot',version:'v2',fileType:'XLSX',fileSize:'5.6 MB',uploadedBy:2,uploadedName:'Dilnoza Rahimova',uploadDate:'2026-01-25',status:'active',description:''},
    {id:10,title:'Tuproq tahlili natijalari — 1-dala',category:'laboratoriya',subcategory:'Tahlil',version:'v1',fileType:'PDF',fileSize:'780 KB',uploadedBy:3,uploadedName:'Bobur Toshev',uploadDate:'2026-05-10',status:'active',description:''}
  ];
  DB.set(DB.KEYS.DOCS, documents);

  // --- Mijozlar ---
  const clients = [
    {id:1,name:'AgroTrade LLC',inn:'305612348',country:'O\'zbekiston',city:'Toshkent',contactPerson:'R. Nazarov',phone:'+998 71 200-44-55',email:'info@agrotrade.uz',contractNumber:'SH-2026/14',aiRisk:'medium',riskText:'O\'rtacha xavf: 2024-yilda bitta sud nizosi qayd etilgan',status:'active',notes:'Asosiy eksport hamkori'},
    {id:2,name:'Tashkent Retail',inn:'302118765',country:'O\'zbekiston',city:'Toshkent',contactPerson:'S. Alimova',phone:'+998 78 150-22-10',email:'orders@tretail.uz',contractNumber:'SH-2026/11',aiRisk:'low',riskText:'Qulay: moliyaviy ko\'rsatkichlar barqaror',status:'active',notes:''},
    {id:3,name:'KazAgro Import',inn:'',country:'Qozog\'iston',city:'Almati',contactPerson:'D. Serikov',phone:'+7 727 355-80-12',email:'import@kazagro.kz',contractNumber:'',aiRisk:'high',riskText:'Yuqori xavf: to\'lov muddatlari buzilgan',status:'active',notes:''},
    {id:4,name:'FertUz',inn:'304776120',country:'O\'zbekiston',city:'Samarqand',contactPerson:'B. Qodirov',phone:'+998 66 233-18-40',email:'sales@fertuz.uz',contractNumber:'SH-2026/08',aiRisk:'low',riskText:'Ishonchli yetkazib beruvchi',status:'active',notes:'O\'g\'it yetkazib beruvchi'},
    {id:5,name:'YukTrans',inn:'306901554',country:'O\'zbekiston',city:'Termiz',contactPerson:'M. Raximov',phone:'+998 76 224-70-33',email:'office@yuktrans.uz',contractNumber:'SH-2026/16',aiRisk:'low',riskText:'Yangi hamkor, xavf darajasi past',status:'active',notes:'Transport xizmati'}
  ];
  DB.set(DB.KEYS.CLIENTS, clients);

  // --- Omborxona ---
  const warehouse = [
    {id:1,name:'Piyoz',category:'sabzavot',unit:'tonna',currentStock:850,minStock:100,maxStock:2000,location:'1-ombor',temperature:null,status:'normal'},
    {id:2,name:'Brokkoli',category:'sabzavot',unit:'tonna',currentStock:320,minStock:50,maxStock:800,location:'Sovutgich-1',temperature:-2,status:'normal'},
    {id:3,name:'Karam',category:'sabzavot',unit:'tonna',currentStock:1200,minStock:200,maxStock:3000,location:'2-ombor',temperature:null,status:'normal'},
    {id:4,name:'Urug\'lik (piyoz)',category:'urug',unit:'kg',currentStock:450,minStock:100,maxStock:1000,location:'Xazina',temperature:null,status:'normal'},
    {id:5,name:'Mineral o\'g\'it (FertUz)',category:'ogit',unit:'tonna',currentStock:28,minStock:30,maxStock:150,location:'Kimyo ombori',temperature:null,status:'low'},
    {id:6,name:'Fitosanitariya preparati',category:'kimyo',unit:'litr',currentStock:180,minStock:50,maxStock:500,location:'Kimyo ombori',temperature:null,status:'normal'}
  ];
  DB.set(DB.KEYS.WAREHOUSE, warehouse);

  // --- Laboratoriya namunalari ---
  const labSamples = [
    {id:1,type:'tuproq',location:'1-dala, sektor A',collectionDate:'2026-06-01',status:'done',collectedBy:3,results:[{parameter:'pH',value:'6.8',norm:'6.5-7.5',unit:'',ok:true},{parameter:'Azot (N)',value:'1.8',norm:'1.5-2.5',unit:'%',ok:true},{parameter:'Fosfor (P)',value:'0.12',norm:'0.1-0.2',unit:'%',ok:true}]},
    {id:2,type:'suv',location:'Asosiy kanal',collectionDate:'2026-06-10',status:'done',collectedBy:3,results:[{parameter:'pH',value:'7.2',norm:'6.5-8.5',unit:'',ok:true},{parameter:'Tuzlilik',value:'0.8',norm:'<2.0',unit:'g/l',ok:true}]},
    {id:3,type:'tuproq',location:'2-dala, sektor B',collectionDate:'2026-07-01',status:'pending',collectedBy:3,results:[]},
    {id:4,type:'hosil',location:'3-dala piyoz',collectionDate:'2026-07-08',status:'lab',collectedBy:3,results:[]}
  ];
  DB.set(DB.KEYS.LAB_SAMPLES, labSamples);

  // --- Bildirishnomalar ---
  const notifs = [
    {id:1,userId:1,title:'Muddati o\'tgan topshiriq',message:'«Iyun oyi moliyaviy hisobotini topshirish» topshirig\'i 2 kun kechikti',type:'danger',isRead:false,created_at:'2026-07-05T09:00:00Z'},
    {id:2,userId:1,title:'Yangi hujjat yuklandi',message:'Dilnoza Rahimova «Iyun oyi moliyaviy hisobot»ni yukladi',type:'info',isRead:false,created_at:'2026-07-05T08:15:00Z'},
    {id:3,userId:1,title:'Tasdiqlash kutilmoqda',message:'«Brokkoli partiyasini yuklab jo\'natish» topshirig\'i tasdiqlashni kutmoqda',type:'warning',isRead:true,created_at:'2026-07-04T16:00:00Z'}
  ];
  DB.set(DB.KEYS.NOTIFS, notifs);

  // --- Faoliyat logi ---
  const logs = [
    {id:1,userId:4,userName:'Malika Yusupova',action:'complete',model:'task',modelId:10,description:'«Brokkoli partiyasini yuklab jo\'natish» topshirig\'ini bajarilgan deb belgiladi',time:'09:42'},
    {id:2,userId:2,userName:'Dilnoza Rahimova',action:'upload',model:'document',modelId:5,description:'«Piyoz eksport shartnomasi — AgroTrade LLC» hujjatining 3-versiyasini yukladi',time:'08:15'},
    {id:3,userId:1,userName:'Aziz Karimov',action:'approve',model:'task',modelId:11,description:'«O\'g\'it yetkazib beruvchi bilan muzokara» topshirig\'ini tasdiqladi',time:'08:02'},
    {id:4,userId:3,userName:'Bobur Toshev',action:'note',model:'document',modelId:4,description:'3-dala piyoz jurnaliga yangi yozuv qo\'shdi',time:'Kecha, 18:30'},
    {id:5,userId:5,userName:'Jasur Ergashev',action:'comment',model:'document',modelId:3,description:'«Karam yetishtirish texnologik xaritasi» hujjatiga izoh qoldirdi',time:'Kecha, 16:05'},
    {id:6,userId:1,userName:'Aziz Karimov',action:'create',model:'task',modelId:1,description:'2 ta yangi topshiriq yaratdi va mas\'ullarni tayinladi',time:'Kecha, 10:20'}
  ];
  DB.set(DB.KEYS.LOGS, logs);

  // --- Sozlamalar ---
  DB.set(DB.KEYS.SETTINGS, {
    companyName:'Angor Agro Star MCHJ',
    companyFullName:'«Uzagrostar xolding» kompaniyasi',
    region:'O\'zbekiston Respublikasi · Surxondaryo viloyati · Angor tumani',
    phone:'+998 76 XXX-XX-XX',
    email:'info@angoragrostar.uz',
    version:'1.0',
    currency:'UZS',
    language:'uz'
  });

  localStorage.setItem('ags_seeded','1');
  console.log('[AGS] Ma\'lumotlar muvaffaqiyatli yuklandi!');
}

// ============================================================
// Auth
// ============================================================
const Auth = {
  currentUser: null,

  init(){
    const data = localStorage.getItem('ags_user')||sessionStorage.getItem('ags_user');
    if(!data) return false;
    this.currentUser = JSON.parse(data);
    return true;
  },

  logout(){
    localStorage.removeItem('ags_user');
    localStorage.removeItem('ags_token');
    sessionStorage.removeItem('ags_user');
    sessionStorage.removeItem('ags_token');
    window.location.href='login.html';
  },

  can(permission){
    if(!this.currentUser) return false;
    if(this.currentUser.role==='director') return true;
    return this.currentUser.permissions?.includes(permission)||
           this.currentUser.permissions?.includes('all');
  },

  isDirector(){ return this.currentUser?.role==='director'; },
  isManager() { return this.currentUser?.role==='manager'; }
};

// ============================================================
// Faoliyat logi qo'shish
// ============================================================
function logActivity(action, model, modelId, description){
  if(!Auth.currentUser) return;
  DB.create(DB.KEYS.LOGS, {
    userId:   Auth.currentUser.id,
    userName: Auth.currentUser.name,
    action, model, modelId, description,
    time: new Date().toLocaleTimeString('uz-UZ',{hour:'2-digit',minute:'2-digit'})
  });
}

// ============================================================
// Toast xabarnomalar
// ============================================================
function showToast(message, type='success', duration=3000){
  const icons = {success:'✅',error:'❌',warning:'⚠️',info:'ℹ️'};
  const container = document.getElementById('toastContainer');
  if(!container) return;
  const toast = document.createElement('div');
  toast.className=`toast ${type}`;
  toast.innerHTML=`
    <span class="toast-icon">${icons[type]||'ℹ️'}</span>
    <span class="toast-text">${message}</span>
    <span class="toast-close" onclick="this.parentElement.remove()">×</span>
  `;
  container.appendChild(toast);
  setTimeout(()=>toast.style.animation='toastOut .3s ease forwards', duration);
  setTimeout(()=>toast.remove(), duration+300);
}

// ============================================================
// Vaqt formatlash
// ============================================================
function fmtDate(dateStr){
  if(!dateStr) return '—';
  const d = new Date(dateStr);
  if(isNaN(d)) return dateStr;
  return d.toLocaleDateString('uz-UZ',{day:'2-digit',month:'2-digit',year:'numeric'});
}
function fmtDateTime(dateStr){
  if(!dateStr) return '—';
  const d = new Date(dateStr);
  if(isNaN(d)) return dateStr;
  return d.toLocaleDateString('uz-UZ',{day:'2-digit',month:'2-digit',year:'numeric'})
    +' '+d.toLocaleTimeString('uz-UZ',{hour:'2-digit',minute:'2-digit'});
}
function isOverdue(deadline){
  return new Date(deadline) < new Date() && deadline;
}
function daysLeft(deadline){
  const diff = new Date(deadline) - new Date();
  return Math.ceil(diff/(1000*60*60*24));
}
