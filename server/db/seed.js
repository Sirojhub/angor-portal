// ============================================================
// ANGOR AGRO STAR PORTAL — Boshlang'ich Ma'lumotlar
// ============================================================
const db = require('./database');
const bcrypt = require('bcryptjs');

function seedDatabase() {
  const insertUser = db.prepare(`
    INSERT INTO users (name, email, password, role, position, department, phone, avatar, avatar_color, hire_date, efficiency, status)
    VALUES (@name, @email, @password, @role, @position, @department, @phone, @avatar, @avatar_color, @hire_date, @efficiency, @status)
  `);

  const users = [
    { name:'Aziz Karimov',    email:'aziz@angor.uz',    password: hash('admin123'),   role:'director', position:'Direktor',          department:'Boshqaruv',      phone:'+998 90 111-22-33', avatar:'AK', avatar_color:'#C8922A', hire_date:'2021-03-01', efficiency:98, status:'active' },
    { name:'Dilnoza Rahimova', email:'dilnoza@angor.uz', password: hash('manager123'), role:'manager',  position:'Moliya menejeri',   department:'Moliya',         phone:'+998 90 222-33-44', avatar:'DR', avatar_color:'#7c3aed', hire_date:'2022-05-15', efficiency:87, status:'active' },
    { name:'Bobur Toshev',    email:'bobur@angor.uz',   password: hash('bobur123'),   role:'employee', position:'Agronom',           department:'Ishlab chiqarish',phone:'+998 90 333-44-55', avatar:'BT', avatar_color:'#2563eb', hire_date:'2022-08-10', efficiency:92, status:'active' },
    { name:'Malika Yusupova', email:'malika@angor.uz',  password: hash('malika123'),  role:'employee', position:'Eksport menejeri',  department:'Eksport',        phone:'+998 90 444-55-66', avatar:'MY', avatar_color:'#ea580c', hire_date:'2022-11-20', efficiency:81, status:'active' },
    { name:'Jasur Ergashev',  email:'jasur@angor.uz',   password: hash('jasur123'),   role:'employee', position:'Omborchi',          department:'Omborxona',      phone:'+998 90 555-66-77', avatar:'JE', avatar_color:'#16a34a', hire_date:'2023-01-05', efficiency:74, status:'active' },
    { name:'Sirojiddin Faxriddinovich', email:'sirojiddin1997tmi@gmail.com', password: hash('siroj_2821'), role:'employee', position:'Bosh agronom', department:'Ishlab chiqarish', phone:'+998 90 123-45-67', avatar:'SF', avatar_color:'#C8922A', hire_date:'2026-08-21', efficiency:95, status:'active' },
    { name:'Sirojiddin Faxriddinovich', email:'sirojiddin@angor.uz', password: hash('siroj_2821'), role:'employee', position:'Bosh agronom', department:'Ishlab chiqarish', phone:'+998 90 123-45-67', avatar:'SF', avatar_color:'#C8922A', hire_date:'2026-08-21', efficiency:95, status:'active' }
  ];

  for (const u of users) {
    const existingUser = db.data.users.find(x => (x.email || '').trim().toLowerCase() === u.email.trim().toLowerCase());
    if (!existingUser) {
      insertUser.run(u);
    } else {
      existingUser.name = u.name;
      existingUser.password = u.password;
      existingUser.role = u.role;
      existingUser.position = u.position;
      existingUser.status = 'active';
    }
  }
  db.save();

  // --- Topshiriqlar ---
  const insertTask = db.prepare(`
    INSERT INTO tasks (title, description, assigned_to, assigned_name, deadline, priority, category, status, created_by, created_at)
    VALUES (@title, @description, @assigned_to, @assigned_name, @deadline, @priority, @category, @status, @created_by, @created_at)
  `);

  const tasks = [
    { title:"Brokkoli dalasini sug'orish jadvalini yangilash", description:"Aprel oyidan boshlab yangi sug'orish jadvalini tuzish", assigned_to:3, assigned_name:'Bobur Toshev',    deadline:'2026-07-07', priority:'medium', category:'Ishlab chiqarish', status:'new',      created_by:1, created_at:'2026-06-20T08:00:00' },
    { title:"Piyoz eksporti uchun shartnoma loyihasini tayyorlash", description:"AgroTrade LLC bilan yangi shartnoma loyihasi", assigned_to:2, assigned_name:'Dilnoza Rahimova', deadline:'2026-07-09', priority:'high',   category:'Eksport',          status:'new',      created_by:1, created_at:'2026-06-21T08:00:00' },
    { title:"Eksport uchun fitosanitariya sertifikatini rasmiylashtirish", description:"Rossiya yo'nalishi uchun sertifikat", assigned_to:4, assigned_name:'Malika Yusupova',  deadline:'2026-07-10', priority:'high',   category:'Eksport',          status:'new',      created_by:1, created_at:'2026-06-22T09:00:00' },
    { title:"3-dala piyoz hosilini yig'ishni yakunlash", description:"3-dalaning 100% hosilini yig'ib, omborga topshirish", assigned_to:3, assigned_name:'Bobur Toshev',    deadline:'2026-07-06', priority:'high',   category:'Ishlab chiqarish', status:'progress', created_by:1, created_at:'2026-06-15T08:00:00' },
    { title:"Iyun oyi moliyaviy hisobotini topshirish", description:"Moliya vazirligiga hisobot tayyorlash", assigned_to:2, assigned_name:'Dilnoza Rahimova', deadline:'2026-07-03', priority:'high',   category:'Moliya',           status:'progress', created_by:1, created_at:'2026-06-01T08:00:00' },
    { title:"Brokkoli partiyasini yuklab jo'natish", description:"300 tonna brokkoli partiyasini Toshkentga jo'natish", assigned_to:4, assigned_name:'Malika Yusupova',  deadline:'2026-07-04', priority:'high',   category:'Eksport',          status:'review',   created_by:1, created_at:'2026-06-10T08:00:00' },
    { title:"May oyi ish haqi vedomostini tayyorlash", description:"Barcha xodimlar uchun vedomost tuzish", assigned_to:2, assigned_name:'Dilnoza Rahimova', deadline:'2026-06-28', priority:'medium', category:'Moliya',           status:'done',     created_by:1, created_at:'2026-06-20T08:00:00' },
  ];

  const insertManyTasks = db.transaction((list) => {
    for (const t of list) insertTask.run(t);
  });
  insertManyTasks(tasks);

  // --- Mijozlar ---
  const insertClient = db.prepare(`
    INSERT INTO clients (name, inn, country, city, contact_person, phone, email, contract_number, ai_risk, risk_text, status, notes)
    VALUES (@name, @inn, @country, @city, @contact_person, @phone, @email, @contract_number, @ai_risk, @risk_text, @status, @notes)
  `);

  const clients = [
    { name:"AgroTrade LLC",   inn:'305612348', country:"O'zbekiston", city:'Toshkent', contact_person:'R. Nazarov', phone:'+998 71 200-44-55', email:'info@agrotrade.uz', contract_number:'SH-2026/14', ai_risk:'medium', risk_text:"O'rtacha xavf: 2024-yilda bitta sud nizosi", status:'active', notes:'Asosiy eksport hamkori' },
    { name:'Tashkent Retail', inn:'302118765', country:"O'zbekiston", city:'Toshkent', contact_person:'S. Alimova', phone:'+998 78 150-22-10', email:'orders@tretail.uz',  contract_number:'SH-2026/11', ai_risk:'low',    risk_text:"Qulay: moliyaviy ko'rsatkichlar barqaror", status:'active', notes:'' },
    { name:'KazAgro Import',  inn:'',          country:"Qozog'iston", city:'Almati',   contact_person:'D. Serikov', phone:'+7 727 355-80-12',  email:'import@kazagro.kz', contract_number:'',            ai_risk:'high',   risk_text:"Yuqori xavf: to'lov muddatlari buzilgan",  status:'active', notes:'' },
    { name:'FertUz',          inn:'304776120', country:"O'zbekiston", city:'Samarqand',contact_person:'B. Qodirov', phone:'+998 66 233-18-40', email:'sales@fertuz.uz',   contract_number:'SH-2026/08', ai_risk:'low',    risk_text:"Ishonchli yetkazib beruvchi",              status:'active', notes:"O'g'it yetkazib beruvchi" },
    { name:'YukTrans',        inn:'306901554', country:"O'zbekiston", city:'Termiz',   contact_person:'M. Raximov', phone:'+998 76 224-70-33', email:'office@yuktrans.uz', contract_number:'SH-2026/16', ai_risk:'low',    risk_text:'Yangi hamkor, xavf darajasi past',        status:'active', notes:'Transport xizmati' },
  ];

  const insertManyClients = db.transaction((list) => {
    for (const c of list) insertClient.run(c);
  });
  insertManyClients(clients);

  // --- Omborxona ---
  const insertWH = db.prepare(`
    INSERT INTO warehouse_items (name, category, unit, current_stock, min_stock, max_stock, location, temperature, status)
    VALUES (@name, @category, @unit, @current_stock, @min_stock, @max_stock, @location, @temperature, @status)
  `);

  const warehouse = [
    { name:'Piyoz',                   category:'sabzavot', unit:'tonna', current_stock:850,  min_stock:100, max_stock:2000, location:'1-ombor',      temperature:null, status:'normal' },
    { name:'Brokkoli',                category:'sabzavot', unit:'tonna', current_stock:320,  min_stock:50,  max_stock:800,  location:'Sovutgich-1',  temperature:-2,   status:'normal' },
    { name:'Karam',                   category:'sabzavot', unit:'tonna', current_stock:1200, min_stock:200, max_stock:3000, location:'2-ombor',      temperature:null, status:'normal' },
    { name:"Urug'lik (piyoz)",        category:'urug',     unit:'kg',    current_stock:450,  min_stock:100, max_stock:1000, location:'Xazina',       temperature:null, status:'normal' },
    { name:"Mineral o'g'it (FertUz)", category:'ogit',     unit:'tonna', current_stock:28,   min_stock:30,  max_stock:150,  location:'Kimyo ombori', temperature:null, status:'low'    },
    { name:'Fitosanitariya preparati',category:'kimyo',    unit:'litr',  current_stock:180,  min_stock:50,  max_stock:500,  location:'Kimyo ombori', temperature:null, status:'normal' },
  ];

  const insertManyWH = db.transaction((list) => {
    for (const w of list) insertWH.run(w);
  });
  insertManyWH(warehouse);

  // --- Bildirishnomalar ---
  db.prepare(`INSERT INTO notifications (user_id, title, message, type, is_read) VALUES (1,'Muddati o''tgan topshiriq','Iyun oyi moliyaviy hisobotini topshirish topshirig''i kechikti','danger',0)`).run();
  db.prepare(`INSERT INTO notifications (user_id, title, message, type, is_read) VALUES (1,'Yangi hujjat yuklandi','Dilnoza Rahimova Iyun oyi moliyaviy hisobotini yukladi','info',0)`).run();
  db.prepare(`INSERT INTO notifications (user_id, title, message, type, is_read) VALUES (1,'Tasdiqlash kutilmoqda','Brokkoli partiyasini yuklab jo''natish topshirig''i tasdiqlashni kutmoqda','warning',1)`).run();

  // --- Faoliyat logi ---
  db.prepare(`INSERT INTO activity_logs (user_id, user_name, action, model, model_id, description) VALUES (4,'Malika Yusupova','complete','task',6,'Brokkoli partiyasini yuklab jo''natish topshirig''ini bajarilgan deb belgiladi')`).run();
  db.prepare(`INSERT INTO activity_logs (user_id, user_name, action, model, model_id, description) VALUES (2,'Dilnoza Rahimova','upload','document',5,'Iyun oyi moliyaviy hisobot hujjatini yukladi')`).run();
  db.prepare(`INSERT INTO activity_logs (user_id, user_name, action, model, model_id, description) VALUES (1,'Aziz Karimov','approve','task',3,'Brokkoli partiyasini jo''natish topshirig''ini tasdiqladi')`).run();

  // --- Sozlamalar ---
  const setSetting = db.prepare(`INSERT OR REPLACE INTO settings (key, value) VALUES (@key, @value)`);
  setSetting.run({ key: 'companyName',     value: 'Angor Agro Star MCHJ' });
  setSetting.run({ key: 'companyFullName', value: '«Uzagrostar xolding» kompaniyasi' });
  setSetting.run({ key: 'region',          value: "O'zbekiston Respublikasi · Surxondaryo viloyati · Angor tumani" });
  setSetting.run({ key: 'phone',           value: '+998 76 XXX-XX-XX' });
  setSetting.run({ key: 'email',           value: 'info@angoragrostar.uz' });

  // --- Hujjatlar ---
  const insertDoc = db.prepare(`
    INSERT INTO documents (title, category, version, file_type, file_size, uploaded_by, uploaded_name, upload_date, status, description)
    VALUES (@title, @category, @version, @file_type, @file_size, @uploaded_by, @uploaded_name, @upload_date, @status, @description)
  `);
  const docs = [
    { title:'Piyoz eksport shartnomasi — AgroTrade LLC',     category:'shartnoma',    version:'v3', file_type:'PDF',  file_size:'2.4 MB', uploaded_by:2, uploaded_name:'Dilnoza Rahimova', upload_date:'2026-03-12', status:'active',  description:'Yillik piyoz eksport asosiy shartnomasi' },
    { title:'Karam yetishtirish texnologik xaritasi',        category:'dala_jurnali', version:'v2', file_type:'XLSX', file_size:'890 KB', uploaded_by:3, uploaded_name:'Bobur Toshev',     upload_date:'2026-03-01', status:'active',  description:'' },
    { title:'Iyun oyi moliyaviy hisobot',                    category:'moliyaviy',    version:'v1', file_type:'XLSX', file_size:'3.2 MB', uploaded_by:2, uploaded_name:'Dilnoza Rahimova', upload_date:'2026-07-05', status:'pending', description:'' },
    { title:"FertUz o'g'it yetkazib berish shartnomasi",     category:'shartnoma',    version:'v2', file_type:'PDF',  file_size:'1.5 MB', uploaded_by:2, uploaded_name:'Dilnoza Rahimova', upload_date:'2026-04-20', status:'active',  description:'' },
    { title:'Fitosanitariya sertifikati — Rossiya 2026',     category:'sertifikat',   version:'v1', file_type:'PDF',  file_size:'450 KB', uploaded_by:4, uploaded_name:'Malika Yusupova',  upload_date:'2026-06-15', status:'active',  description:'' },
    { title:"Direktor buyrug'i №12 — Sug'orish rejasi",      category:'buyruq',       version:'v1', file_type:'DOCX', file_size:'230 KB', uploaded_by:1, uploaded_name:'Aziz Karimov',     upload_date:'2026-03-28', status:'active',  description:'' },
    { title:'Tuproq tahlili natijalari — 1-dala',            category:'laboratoriya', version:'v1', file_type:'PDF',  file_size:'780 KB', uploaded_by:3, uploaded_name:'Bobur Toshev',     upload_date:'2026-05-10', status:'active',  description:'' },
  ];
  const insertManyDocs = db.transaction((list) => { for (const d of list) insertDoc.run(d); });
  insertManyDocs(docs);

  console.log('[Seed] ✅ Barcha ma\'lumotlar muvaffaqiyatli yuklandi!');
}

module.exports = { seedDatabase };
