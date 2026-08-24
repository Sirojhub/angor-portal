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
  getOne(key,id)  { return this.get(key).find(x=>x.id==id || x.id===parseInt(id))||null; },
  getById(key,id) { return this.getOne(key,id); },
  nextId(key)     { const d=this.get(key); return d.length? Math.max(...d.map(x=>parseInt(x.id)||0))+1 : 1; },

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
    const targetId = parseInt(id);
    const idx  = data.findIndex(x=>x.id==id || x.id===targetId);
    if(idx===-1)return null;
    data[idx] = {...data[idx],...changes, updated_at:new Date().toISOString()};
    this.set(key,data);
    return data[idx];
  },
  delete(key,id){
    const targetId = parseInt(id);
    const data = this.get(key).filter(x=>x.id!=id && x.id!==targetId);
    this.set(key,data);
  },
  filter(key,fn){ return this.get(key).filter(fn); },
  count(key,fn)  { return fn? this.get(key).filter(fn).length : this.get(key).length; }
};

// ============================================================
// Boshlang'ich ma'lumotlar (birinchi yuklashda)
// ============================================================
function seedData(){
  if(localStorage.getItem('ags_prod_clean_v20260822')) return;

  // Clear all old demo storage keys from browser
  localStorage.removeItem('ags_seeded');
  localStorage.removeItem('ags_tasks');
  localStorage.removeItem('ags_docs');
  localStorage.removeItem('ags_clients');
  localStorage.removeItem('ags_wh');
  localStorage.removeItem('ags_users');
  localStorage.removeItem('ags_notifs');
  localStorage.removeItem('ags_logs');

  // --- Xodimlar (Parollarsiz) ---
  const employees = [
    {id:1,name:'Aziz Karimov',role:'director',position:'Direktor',email:'aziz@angor.uz',avatar:'AK',avatarColor:'#C8922A',department:'Boshqaruv',phone:'+998 90 111-22-33',hireDate:'2021-03-01',efficiency:98,status:'active'},
    {id:6,name:'Sirojiddin Faxriddinovich',role:'employee',position:'Bosh agronom',email:'sirojiddin1997tmi@gmail.com',avatar:'SF',avatarColor:'#C8922A',department:'Ishlab chiqarish',phone:'+998 90 123-45-67',hireDate:'2026-08-21',efficiency:95,status:'active'}
  ];
  DB.set(DB.KEYS.USERS, employees);

  // --- Topshiriqlar, Hujjatlar, Mijozlar, Omborxona toza holatda ---
  DB.set(DB.KEYS.TASKS, []);
  DB.set(DB.KEYS.DOCS, []);
  DB.set(DB.KEYS.CLIENTS, []);
  DB.set(DB.KEYS.WAREHOUSE, []);
  DB.set(DB.KEYS.LAB_SAMPLES, []);
  DB.set(DB.KEYS.NOTIFS, []);
  DB.set(DB.KEYS.LOGS, []);

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

  localStorage.setItem('ags_prod_clean_v20260822','1');
  console.log('[AGS] Ishlab chiqarish tizimi ma\'lumotlari muvaffaqiyatli tozalandi va tayyorlandi!');
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
