// ============================================================
// ANGOR AGRO STAR PORTAL — Asosiy dastur logikasi
// ============================================================

// --- Global o'zgaruvchilar ---
let currentPage    = 'dashboard';
let taskTab        = 'all';
let docTab         = 'all';
let taskPage       = 1;
const TASKS_PER_PAGE = 10;
let editingClientId = null;
let harvestChart, financeChart, taskPieChart;

// ============================================================
// ILOVANI ISHGA TUSHIRISH
// ============================================================
window.addEventListener('DOMContentLoaded', function(){
  // Auth tekshirish
  if(!Auth.init()){
    window.location.href='login.html';
    return;
  }
  // Ma'lumotlarni yuklash
  seedData();
  // UI ni sozlash
  setupHeader();
  setupSidebar();
  setupClock();
  // Dashboard ni ko'rsatish
  navigate('dashboard');
  // Bildirishnomalarni yangilash
  updateNotifBadge();
});

// ============================================================
// HEADER SOZLASH
// ============================================================
function setupHeader(){
  const u = Auth.currentUser;
  document.getElementById('userName').textContent  = u.name;
  document.getElementById('userRole').textContent  = u.position||u.role;
  const av = document.getElementById('userAvatar');
  av.textContent = u.avatar||u.name.split(' ').map(x=>x[0]).join('').toUpperCase().slice(0,2);
  av.style.background = u.avatarColor||'#C8922A';
  av.style.color = '#fff';
}

function setupSidebar(){
  const u = Auth.currentUser;
  if(u.role==='director'){
    document.getElementById('adminSection').style.display='block';
    document.getElementById('nav-admin').style.display='flex';
    document.getElementById('nav-logs').style.display='flex';
  }
  // Ruxsatga qarab itemlarni yashirish
  if(u.role==='employee'){
    // Xodimlar ba'zi bo'limlarga kira olmaydi — faqat o'zlariniki
  }
  // Kam zaxira ogohlantiruvi
  const lowStock = DB.filter(DB.KEYS.WAREHOUSE, w=>w.currentStock<=w.minStock);
  if(lowStock.length){
    const badge = document.getElementById('navBadgeWH');
    badge.style.display='flex';
    badge.textContent='!';
  }
}

function setupClock(){
  function tick(){
    const now = new Date();
    document.getElementById('headerTime').textContent =
      now.toLocaleDateString('uz-UZ',{day:'2-digit',month:'2-digit',year:'numeric'}) +
      ' · ' +
      now.toLocaleTimeString('uz-UZ',{hour:'2-digit',minute:'2-digit'});
  }
  tick(); setInterval(tick,60000);
  // Dashboard sana
  const dashDate = document.getElementById('dashboardDate');
  if(dashDate){
    const d=new Date();
    const days=['yakshanba','dushanba','seshanba','chorshanba','payshanba','juma','shanba'];
    dashDate.textContent='Holat: '+d.toLocaleDateString('uz-UZ',{day:'numeric',month:'long',year:'numeric'})+', '+days[d.getDay()];
  }
}

// ============================================================
// NAVIGATSIYA
// ============================================================
function navigate(page){
  currentPage = page;
  // Barcha sahifalarni yashirish
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  // Tanlangan sahifani ko'rsatish
  const pageEl = document.getElementById('page-'+page);
  if(pageEl) pageEl.classList.add('active');
  const navEl = document.getElementById('nav-'+page);
  if(navEl) navEl.classList.add('active');
  // Sahifani render qilish
  const renders = {
    dashboard:  renderDashboard,
    tasks:      renderTaskPage,
    documents:  renderDocPage,
    clients:    renderClientPage,
    warehouse:  renderWarehouse,
    laboratory: renderLaboratory,
    analytics:  renderAnalytics,
    employees:  renderEmployeePage,
    ai:         renderAI,
    profile:    renderProfile,
    admin:      renderAdmin,
    logs:       renderLogs,
    settings:   renderSettings
  };
  if(renders[page]) renders[page]();
}

// ============================================================
// DASHBOARD
// ============================================================
function renderDashboard(){
  const tasks = DB.get(DB.KEYS.TASKS);
  const u = Auth.currentUser;
  const myTasks = u.role==='director' ? tasks : tasks.filter(t=>t.assignedTo===u.id);

  const active  = myTasks.filter(t=>t.status!=='done').length;
  const overdue = myTasks.filter(t=>isOverdue(t.deadline)&&t.status!=='done').length;
  const review  = myTasks.filter(t=>t.status==='review').length;
  const doneTdy = myTasks.filter(t=>t.status==='done').length;

  // KPI
  document.getElementById('kpiGrid').innerHTML=`
    <div class="kpi-card blue">
      <div class="kpi-label">Faol topshiriqlar</div>
      <div class="kpi-value">${active}</div>
      <div class="kpi-trend up">↑ Jami ${myTasks.length} ta</div>
    </div>
    <div class="kpi-card red">
      <div class="kpi-label">Muddati o'tgan</div>
      <div class="kpi-value">${overdue}</div>
      <div class="kpi-trend ${overdue>0?'down':'up'}">${overdue>0?'⚠️ E\'tibor bering':'✅ Hammasi tartibda'}</div>
    </div>
    <div class="kpi-card orange">
      <div class="kpi-label">Tasdiqlash kutilmoqda</div>
      <div class="kpi-value">${review}</div>
      <div class="kpi-trend">Tasdiqlash kerak</div>
    </div>
    <div class="kpi-card green">
      <div class="kpi-label">Jami bajarilgan</div>
      <div class="kpi-value">${doneTdy}</div>
      <div class="kpi-trend up">✅ Muvaffaqiyatli</div>
    </div>
  `;

  // Faoliyat
  const logs = DB.get(DB.KEYS.LOGS).slice(-6).reverse();
  const actionIcons={complete:'✅',upload:'📄',approve:'✔️',create:'➕',note:'📝',comment:'💬'};
  document.getElementById('activityList').innerHTML = logs.map(l=>`
    <div class="activity-item">
      <div class="activity-icon">${actionIcons[l.action]||'📌'}</div>
      <div class="activity-text"><strong>${l.userName}</strong> ${l.description}</div>
      <div class="activity-time">${l.time}</div>
    </div>
  `).join('') || '<div class="text-muted text-sm" style="padding:16px 0">Faoliyat yo\'q</div>';

  // Xodimlar samaradorligi
  const users = DB.get(DB.KEYS.USERS).filter(u=>u.role!=='director');
  document.getElementById('efficiencyList').innerHTML = users.slice(0,4).map(u=>`
    <div class="progress-item">
      <div class="progress-header">
        <span class="progress-name">${u.name}</span>
        <span class="progress-val">${u.efficiency}%</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill ${u.efficiency>=85?'high':u.efficiency>=70?'medium':'low'}"
          style="width:${u.efficiency}%"></div>
      </div>
    </div>
  `).join('');

  // Muddati o'tgan
  const overdueList = tasks.filter(t=>isOverdue(t.deadline)&&t.status!=='done').slice(0,3);
  document.getElementById('overdueDashList').innerHTML = overdueList.length
    ? overdueList.map(t=>`
      <div style="background:#fff5f5;border-left:3px solid var(--danger);border-radius:6px;padding:10px 12px;margin-bottom:8px;cursor:pointer" onclick="viewTask(${t.id})">
        <div style="font-size:13px;font-weight:600;color:var(--text)">${t.title}</div>
        <div style="display:flex;justify-content:space-between;margin-top:4px">
          <span style="font-size:12px;color:#64748b">${t.assignedName}</span>
          <span style="font-size:12px;font-weight:700;color:var(--danger)">${Math.abs(daysLeft(t.deadline))} kun kechikti</span>
        </div>
      </div>
    `).join('')
    : '<div style="text-align:center;padding:16px;color:var(--text-muted);font-size:13px">✅ Muddati o\'tgan topshiriq yo\'q</div>';

  // Tasks badge
  document.getElementById('navBadgeTasks').textContent = overdue;
  document.getElementById('navBadgeTasks').style.display = overdue?'flex':'none';
}

// ============================================================
// TOPSHIRIQLAR
// ============================================================
const STATUS_MAP = {
  new:'Yangi', progress:'Jarayonda', review:'Tasdiqlashda', done:'Bajarildi'
};
const STATUS_CLASS = {
  new:'status-new', progress:'status-progress', review:'status-review', done:'status-done'
};
const PRIORITY_MAP = { high:'Yuqori', medium:'O\'rta', low:'Past' };
const PRIORITY_CLASS = { high:'priority-high', medium:'priority-medium', low:'priority-low' };

function renderTaskPage(){
  populateTaskFilters();
  buildTaskTabs();
  renderTasks();
}

function populateTaskFilters(){
  const users = DB.get(DB.KEYS.USERS);
  const sel = document.getElementById('taskFilterUser');
  if(sel.options.length<=1){
    users.forEach(u=>{
      const opt=document.createElement('option');
      opt.value=u.id; opt.textContent=u.name;
      sel.appendChild(opt);
    });
  }
  const catSel = document.getElementById('taskFilterCategory');
  if(catSel.options.length<=1){
    const cats=['Ishlab chiqarish','Eksport','Moliya','Agrotexnika','Omborxona','Xarid','Texnika','Boshqaruv'];
    cats.forEach(c=>{ const o=document.createElement('option'); o.value=c; o.textContent=c; catSel.appendChild(o); });
  }
  // Assigned filter
  const assigned = document.getElementById('taskAssigned');
  assigned.innerHTML='';
  users.forEach(u=>{ const o=document.createElement('option'); o.value=u.id; o.textContent=u.name+' — '+u.position; assigned.appendChild(o); });
}

function getFilteredTasks(){
  let tasks = DB.get(DB.KEYS.TASKS);
  const u = Auth.currentUser;
  if(u.role==='employee') tasks=tasks.filter(t=>t.assignedTo===u.id);

  if(taskTab!=='all') tasks=tasks.filter(t=>t.status===taskTab);

  const search = document.getElementById('taskSearch')?.value.toLowerCase();
  if(search) tasks=tasks.filter(t=>t.title.toLowerCase().includes(search)||t.assignedName.toLowerCase().includes(search));

  const user = document.getElementById('taskFilterUser')?.value;
  if(user) tasks=tasks.filter(t=>t.assignedTo==user);

  const pri = document.getElementById('taskFilterPriority')?.value;
  if(pri) tasks=tasks.filter(t=>t.priority===pri);

  const cat = document.getElementById('taskFilterCategory')?.value;
  if(cat) tasks=tasks.filter(t=>t.category===cat);

  return tasks;
}

function buildTaskTabs(){
  const all = DB.get(DB.KEYS.TASKS);
  const tabs=[
    {key:'all',label:'Barchasi',count:all.length},
    {key:'new',label:'Yangi',count:all.filter(t=>t.status==='new').length},
    {key:'progress',label:'Jarayonda',count:all.filter(t=>t.status==='progress').length},
    {key:'review',label:'Tasdiqlashda',count:all.filter(t=>t.status==='review').length},
    {key:'done',label:'Bajarildi',count:all.filter(t=>t.status==='done').length}
  ];
  document.getElementById('taskTabs').innerHTML = tabs.map(t=>`
    <div class="tab ${taskTab===t.key?'active':''}" onclick="setTaskTab('${t.key}')">
      ${t.label} <span class="tab-count">${t.count}</span>
    </div>
  `).join('');
}

function setTaskTab(tab){ taskTab=tab; taskPage=1; buildTaskTabs(); renderTasks(); }

function renderTasks(){
  const tasks  = getFilteredTasks();
  const total  = tasks.length;
  const pages  = Math.ceil(total/TASKS_PER_PAGE)||1;
  if(taskPage>pages) taskPage=1;
  const slice  = tasks.slice((taskPage-1)*TASKS_PER_PAGE, taskPage*TASKS_PER_PAGE);
  const isDir  = Auth.isDirector()||Auth.isManager();

  document.getElementById('tasksBody').innerHTML = slice.length
    ? slice.map((t,i)=>{
        const over=isOverdue(t.deadline)&&t.status!=='done';
        return `<tr style="${over?'border-left:3px solid var(--danger)':''}">
          <td style="color:var(--text-muted);font-weight:600">${String((taskPage-1)*TASKS_PER_PAGE+i+1).padStart(2,'0')}</td>
          <td>
            <div style="font-weight:500;color:var(--text)">${t.title}</div>
            <div style="font-size:11px;color:var(--text-light);margin-top:2px">${t.category||'—'}</div>
          </td>
          <td>
            <div style="display:flex;align-items:center;gap:6px">
              <div class="avatar av-blue" style="width:24px;height:24px;font-size:10px;${getUserColor(t.assignedTo)}">
                ${getInitials(t.assignedName)}
              </div>
              ${t.assignedName}
            </div>
          </td>
          <td style="color:${over?'var(--danger)':'var(--text)'};font-weight:${over?'700':'400'}">
            ${fmtDate(t.deadline)}
            ${over?'<br><span style="font-size:11px">'+Math.abs(daysLeft(t.deadline))+' kun kechikti</span>':''}
          </td>
          <td><span class="priority ${PRIORITY_CLASS[t.priority]}">${PRIORITY_MAP[t.priority]}</span></td>
          <td><span class="status ${STATUS_CLASS[t.status]}">${STATUS_MAP[t.status]}</span></td>
          <td>
            <div style="display:flex;gap:4px;flex-wrap:wrap;align-items:center">
              <button class="btn btn-sm btn-outline" onclick="viewTask(${t.id})">Ko'rish</button>
              ${isDir ? (
                t.status==='review'
                  ? `<button class="btn btn-sm btn-success" onclick="approveTask(${t.id})">✔ Tasdiqlash</button>`
                  : `<button class="btn btn-sm btn-outline" onclick="editTask(${t.id})">✏️</button>`
              ) : (
                t.status==='new'
                  ? `<button class="btn btn-sm btn-primary" onclick="changeStatus(${t.id},'progress')">▶ Boshlash</button>`
                  : t.status==='progress'
                    ? `<button class="btn btn-sm btn-success" onclick="changeStatus(${t.id},'review')">📤 Topshirish</button>`
                    : t.status==='review'
                      ? `<span style="font-size:11px;color:var(--warning);font-weight:600">⏳ Tasdiqlash kutilmoqda</span>`
                      : ''
              )}
            </div>
          </td>
        </tr>`;
      }).join('')
    : `<tr><td colspan="7"><div class="empty-state"><div class="icon">📋</div><h3>Topshiriqlar yo'q</h3></div></td></tr>`;
document.getElementById('taskPaginBtns').innerHTML=btns;
}

function setTaskPg(p){ if(p<1||p>Math.ceil(getFilteredTasks().length/TASKS_PER_PAGE)) return; taskPage=p; renderTasks(); }

function setupHeader(){
  const u = Auth.currentUser;
  document.getElementById('userName').textContent  = u.name;
  document.getElementById('userRole').textContent  = u.position||u.role;
  const av = document.getElementById('userAvatar');
  av.textContent = u.avatar||u.name.split(' ').map(x=>x[0]).join('').toUpperCase().slice(0,2);
  av.style.background = u.avatarColor||'#C8922A';
  av.style.color = '#fff';

  const isDirector = Auth.isDirector();
  document.querySelectorAll('.btn-new-task').forEach(b => {
    b.style.display = isDirector ? '' : 'none';
  });
}

function getInitials(name){ return (name||'?').split(' ').map(x=>x[0]).join('').toUpperCase().slice(0,2); }
function getUserColor(id){
  const u=DB.getOne(DB.KEYS.USERS,id);
  return u?`background:${u.avatarColor};`:'';
}

function openNewTaskModal(){
  if (!Auth.isDirector()) {
    showToast('Faqat Direktor yangi topshiriq berishi mumkin!', 'error');
    return;
  }
  document.getElementById('taskId').value='';
  document.getElementById('taskTitle').value='';
  document.getElementById('taskDesc').value='';
  document.getElementById('taskDeadline').value='';
  document.getElementById('taskPriority').value='medium';
  document.getElementById('taskCategory').value='Ishlab chiqarish';
  document.getElementById('taskModalTitle').textContent='Yangi topshiriq';
  document.getElementById('taskStatusGroup').style.display='none';
  openModal('taskModal');
}

function editTask(id){
  const t=DB.getOne(DB.KEYS.TASKS,id);
  if(!t)return;
  document.getElementById('taskId').value=id;
  document.getElementById('taskTitle').value=t.title;
  document.getElementById('taskDesc').value=t.description||'';
  document.getElementById('taskDeadline').value=t.deadline;
  document.getElementById('taskPriority').value=t.priority;
  document.getElementById('taskCategory').value=t.category||'Ishlab chiqarish';
  document.getElementById('taskAssigned').value=t.assignedTo;
  document.getElementById('taskStatus').value=t.status;
  document.getElementById('taskStatusGroup').style.display='block';
  document.getElementById('taskModalTitle').textContent='Topshiriqni tahrirlash';
  openModal('taskModal');
}

async function saveTask(){
  if (!Auth.isDirector()) {
    showToast('Faqat Direktor topshiriq berishi yoki tahrirlashi mumkin!', 'error');
    return;
  }
  const id    = document.getElementById('taskId').value;
  const title = document.getElementById('taskTitle').value.trim();
  const uid   = +document.getElementById('taskAssigned').value;
  const deadline = document.getElementById('taskDeadline').value;

  if(!title){ showToast('Topshiriq sarlavhasini kiriting!','error'); return; }
  if(!deadline){ showToast('Muddatni kiriting!','error'); return; }

  const user = DB.getOne(DB.KEYS.USERS, uid);
  const obj  = {
    title,
    description: document.getElementById('taskDesc').value,
    assigned_to: uid,
    assignedTo:  uid,
    assigned_name: user?.name||'—',
    assignedName: user?.name||'—',
    deadline,
    priority: document.getElementById('taskPriority').value,
    category: document.getElementById('taskCategory').value,
    status:   id ? document.getElementById('taskStatus').value : 'new',
    createdBy: Auth.currentUser.id
  };

  showToast('Topshiriq saqlanmoqda va Telegramga yuborilmoqda...', 'info');

  if(id){
    await API.updateTask(+id, obj);
    DB.update(DB.KEYS.TASKS,+id,obj);
    logActivity('update','task',+id,'Topshiriq yangilandi: '+title);
    showToast('Topshiriq yangilandi!','success');
  } else {
    const res = await API.createTask(obj);
    const created = (res && res.task) ? res.task : DB.create(DB.KEYS.TASKS,obj);
    if (!DB.getOne(DB.KEYS.TASKS, created.id)) {
      DB.create(DB.KEYS.TASKS, created);
    }
    logActivity('create','task',created.id,'Yangi topshiriq yaratildi: '+title);
    showToast('✅ Yangi topshiriq yaratildi va Telegram xabari yuborildi! 📲','success');
  }
  closeModal('taskModal');
  renderTasks(); buildTaskTabs(); renderDashboard();
}

function viewTask(id){
  const t=DB.getOne(DB.KEYS.TASKS,id);
  if(!t)return;
  const over=isOverdue(t.deadline)&&t.status!=='done';
  document.getElementById('taskViewTitle').textContent=t.title;
  document.getElementById('taskViewBody').innerHTML=`
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
      <div>
        <div class="info-section">
          <div class="info-section-title">Asosiy ma'lumot</div>
          <div class="info-row"><span class="info-key">Holat</span><span class="info-val"><span class="status ${STATUS_CLASS[t.status]}">${STATUS_MAP[t.status]}</span></span></div>
          <div class="info-row"><span class="info-key">Muhimlik</span><span class="info-val"><span class="priority ${PRIORITY_CLASS[t.priority]}">${PRIORITY_MAP[t.priority]}</span></span></div>
          <div class="info-row"><span class="info-key">Turkum</span><span class="info-val">${t.category||'—'}</span></div>
          <div class="info-row"><span class="info-key">Muddat</span><span class="info-val" style="color:${over?'var(--danger)':'inherit'}">${fmtDate(t.deadline)}${over?' ('+Math.abs(daysLeft(t.deadline))+' kun kechikti)':''}</span></div>
          <div class="info-row"><span class="info-key">Mas'ul</span><span class="info-val">${t.assignedName}</span></div>
          <div class="info-row"><span class="info-key">Yaratildi</span><span class="info-val">${fmtDate(t.created_at)}</span></div>
        </div>
      </div>
      <div>
        ${t.description?`<div class="info-section-title">Tavsif</div><p style="font-size:13px;color:var(--text);line-height:1.6">${t.description}</p>`:''}
      </div>
    </div>
  `;
  const isDir=Auth.isDirector()||Auth.isManager();
  let actionBtn = '';
  if (isDir) {
    if (t.status === 'review') {
      actionBtn = `<button class="btn btn-success" onclick="approveTask(${t.id});closeModal('taskViewModal')">✔ Tasdiqlash</button>`;
    }
  } else {
    if (t.status === 'new') {
      actionBtn = `<button class="btn btn-primary" onclick="changeStatus(${t.id},'progress');closeModal('taskViewModal')">▶ Boshlash</button>`;
    } else if (t.status === 'progress') {
      actionBtn = `<button class="btn btn-success" onclick="changeStatus(${t.id},'review');closeModal('taskViewModal')">📤 Bajarib topshirish (Direktorga yuborish)</button>`;
    } else if (t.status === 'review') {
      actionBtn = `<span style="font-size:12px;color:var(--warning);font-weight:600;padding:6px 12px;background:rgba(234,179,8,0.1);border-radius:6px">⏳ Direktor tasdiqlashi kutilmoqda</span>`;
    }
  }

  document.getElementById('taskViewFooter').innerHTML=`
    <button class="btn btn-outline" onclick="closeModal('taskViewModal')">Yopish</button>
    ${isDir?`<button class="btn btn-outline" onclick="closeModal('taskViewModal');editTask(${t.id})">✏️ Tahrirlash</button>`:''}
    ${actionBtn}
  `;
  openModal('taskViewModal');
}

function nextStatus(s){ return {new:'progress',progress:'review',review:'done',done:'done'}[s]; }

async function changeStatus(id,status){
  await API.updateTask(id, { status });
  const updated = DB.update(DB.KEYS.TASKS,id,{status});
  logActivity('update','task',id,'Topshiriq holati o\'zgartirildi: '+STATUS_MAP[status]);
  showToast('Holat o\'zgartirildi: '+STATUS_MAP[status],'success');
  if (window.TelegramService) {
    TelegramService.sendNotification('update', updated || { id, status });
  }
  renderTasks(); buildTaskTabs(); renderDashboard();
}

async function approveTask(id){
  await API.updateTask(id, { status: 'done' });
  const updated = DB.update(DB.KEYS.TASKS,id,{status:'done'});
  logActivity('approve','task',id,'Topshiriq tasdiqlandi');
  showToast('Topshiriq tasdiqlandi va Telegram bildirishnomasi yuborildi! 📲','success');
  if (window.TelegramService) {
    TelegramService.sendNotification('done', updated || { id, status: 'done' });
  }
  renderTasks(); buildTaskTabs(); renderDashboard();
}

// ============================================================
// HUJJATLAR
// ============================================================
const DOC_CATS=[
  {key:'all',label:'Barchasi'},
  {key:'shartnoma',label:'Shartnomalar'},
  {key:'moliyaviy',label:'Moliyaviy'},
  {key:'dala_jurnali',label:'Dala jurnallari'},
  {key:'buyruq',label:'Buyruqlar'},
  {key:'sertifikat',label:'Sertifikatlar'},
  {key:'laboratoriya',label:'Laboratoriya'}
];

function renderDocPage(){
  buildDocTabs();
  populateDocFilters();
  renderDocs();
}

function buildDocTabs(){
  const docs=DB.get(DB.KEYS.DOCS);
  document.getElementById('docTabs').innerHTML=DOC_CATS.map(c=>`
    <div class="tab ${docTab===c.key?'active':''}" onclick="setDocTab('${c.key}')">
      ${c.label}
      <span class="tab-count">${c.key==='all'?docs.length:docs.filter(d=>d.category===c.key).length}</span>
    </div>
  `).join('');
}

function setDocTab(t){ docTab=t; buildDocTabs(); renderDocs(); }

function populateDocFilters(){
  const sel=document.getElementById('docFilterUser');
  if(sel.options.length>1)return;
  DB.get(DB.KEYS.USERS).forEach(u=>{ const o=document.createElement('option'); o.value=u.id; o.textContent=u.name; sel.appendChild(o); });
}

function renderDocs(){
  let docs=DB.get(DB.KEYS.DOCS);
  if(docTab!=='all') docs=docs.filter(d=>d.category===docTab);
  const search=document.getElementById('docSearch')?.value.toLowerCase();
  if(search) docs=docs.filter(d=>d.title.toLowerCase().includes(search));
  const user=document.getElementById('docFilterUser')?.value;
  if(user) docs=docs.filter(d=>d.uploadedBy==user);

  const catLabels={shartnoma:'Shartnoma',moliyaviy:'Moliyaviy',dala_jurnali:'Dala jurnali',buyruq:'Buyruq',sertifikat:'Sertifikat',laboratoriya:'Laboratoriya'};
  const ftIcons={PDF:'📕',XLSX:'📗',DOCX:'📘',JPG:'🖼️'};
  const statusLabels={active:'Amalda',pending:'Kutilmoqda',expired:'Eskirgan'};
  const statusClass={active:'status-active',pending:'status-progress',expired:'status-overdue'};

  document.getElementById('docsBody').innerHTML=docs.length
    ? docs.map(d=>`<tr>
        <td>
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-size:20px">${(['JPG','PNG','JPEG','GIF','WEBP'].includes((d.fileType||'').toUpperCase())) ? '🖼️' : (ftIcons[d.fileType]||'📄')}</span>
            <div>
              <div style="font-weight:500">${d.title}</div>
              ${d.description?`<div style="font-size:11px;color:var(--text-light)">${d.description}</div>`:''}
              ${d.target_user_name || d.targetUserName ? `<div style="margin-top:2px"><span style="font-size:10px;background:#e0f2fe;color:#0369a1;padding:1px 6px;border-radius:4px;font-weight:600">🎯 Mas'ul: ${d.target_user_name || d.targetUserName}</span></div>` : ''}
            </div>
          </div>
        </td>
        <td><span class="status status-new" style="font-size:11px">${catLabels[d.category]||d.category}</span></td>
        <td><span style="background:#f1f5f9;padding:2px 8px;border-radius:6px;font-size:12px;font-weight:700">${d.version}</span></td>
        <td>${d.uploadedName}</td>
        <td>${fmtDate(d.uploadDate)}</td>
        <td style="color:var(--text-muted)">${d.fileSize||'—'}</td>
        <td><span class="status ${statusClass[d.status]||'status-active'}">${statusLabels[d.status]||'Amalda'}</span></td>
        <td>
          <div style="display:flex;gap:4px">
            <button class="btn btn-sm btn-primary" onclick="previewDoc(${d.id})" title="Ko'rib chiqish va Tasdiqlash">👁️</button>
            <button class="btn btn-sm btn-outline" onclick="downloadDoc(${d.id})" title="Yuklab olish">↓</button>
            <button class="btn btn-sm btn-outline" onclick="deleteDoc(${d.id})" title="O'chirish" style="color:var(--danger)">🗑</button>
          </div>
        </td>
      </tr>`).join('')
    : `<tr><td colspan="8"><div class="empty-state"><div class="icon">📁</div><h3>Hujjatlar yo'q</h3></div></td></tr>`;

  document.getElementById('docCount').textContent=`Jami ${docs.length} ta hujjat`;
}

function openUploadModal(replyToId = null){
  document.getElementById('docTitle').value='';
  document.getElementById('docDesc').value='';
  document.getElementById('fileSelected').style.display='none';
  const fileInp = document.getElementById('fileInput');
  if (fileInp) fileInp.value = '';

  const sel = document.getElementById('docTargetUser');
  if (sel) {
    const emps = DB.get(DB.KEYS.USERS);
    sel.innerHTML = '<option value="">— Barcha xodimlar uchun (Umumiy) —</option>' +
      emps.map(u => `<option value="${u.id}">${u.name} (${u.position||u.role})</option>`).join('');
  }

  window._docReplyToId = replyToId;
  if (replyToId) {
    const parentDoc = DB.getOne(DB.KEYS.DOCS, replyToId);
    if (parentDoc) {
      document.getElementById('docTitle').value = `Javob: ${parentDoc.title}`;
    }
  }
  openModal('uploadModal');
}

function handleFileSelect(input){
  const file=input.files[0];
  if(!file)return;
  const el=document.getElementById('fileSelected');
  el.style.display='block';
  el.textContent=`✅ Tanlangan: ${file.name} (${(file.size/1024).toFixed(0)} KB)`;
  if(!document.getElementById('docTitle').value)
    document.getElementById('docTitle').value=file.name.replace(/\.[^.]+$/,'');
}

async function saveDocument(){
  const title=document.getElementById('docTitle').value.trim();
  if(!title){ showToast('Hujjat nomini kiriting!','error'); return; }

  const fileInput = document.getElementById('fileInput');
  const file = fileInput.files ? fileInput.files[0] : null;
  const category = document.getElementById('docCategory').value;
  const fileType = document.getElementById('docFileType').value;
  const description = document.getElementById('docDesc').value;

  const targetId = document.getElementById('docTargetUser')?.value;
  const targetUser = targetId ? DB.getOne(DB.KEYS.USERS, +targetId) : null;

  const formData = new FormData();
  formData.append('title', title);
  formData.append('category', category);
  formData.append('fileType', fileType);
  formData.append('description', description);
  formData.append('version', 'v1');
  if (targetId) {
    formData.append('target_user_id', targetId);
    formData.append('target_user_name', targetUser ? targetUser.name : '');
  }
  if (window._docReplyToId) {
    formData.append('reply_to_id', window._docReplyToId);
  }

  let localFilePath = null;
  if (file) {
    try {
      localFilePath = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      });
    } catch (e) {
      if (typeof URL !== 'undefined' && URL.createObjectURL) {
        localFilePath = URL.createObjectURL(file);
      }
    }
  }

  if (file) {
    formData.append('file', file);
  }

  showToast('Hujjat saqlanmoqda va Telegramga yuborilmoqda...','info');

  const res = await API.createDoc(formData);
  if (res && res.success && res.document) {
    showToast('✅ Hujjat muvaffaqiyatli saqlandi va yuklandi!','success');
    DB.create(DB.KEYS.DOCS, res.document);
  } else {
    const ftMap={shartnoma:'PDF',moliyaviy:'XLSX',dala_jurnali:'XLSX',buyruq:'DOCX',sertifikat:'PDF',laboratoriya:'PDF'};
    const doc=DB.create(DB.KEYS.DOCS,{
      title,
      category,
      version: 'v1',
      fileType: fileType||ftMap[category]||'PDF',
      fileSize: file ? (file.size/1024).toFixed(0)+' KB' : '1.2 MB',
      file_path: localFilePath,
      filePath: localFilePath,
      uploadedBy: Auth.currentUser.id,
      uploadedName: Auth.currentUser.name,
      uploadDate: new Date().toISOString().split('T')[0],
      status: 'active',
      description,
      target_user_id: targetId ? +targetId : null,
      target_user_name: targetUser ? targetUser.name : null,
      reply_to_id: window._docReplyToId || null
    });
    logActivity('upload','document',doc.id,'Yangi hujjat yukladi: '+title);
    showToast('Hujjat saqlandi!','success');
  }

  window._docReplyToId = null;
  closeModal('uploadModal');
  renderDocs(); buildDocTabs();
}

function previewDoc(id){
  const d=DB.getOne(DB.KEYS.DOCS,id);
  if(!d)return;

  const catLabels={shartnoma:'Shartnoma',moliyaviy:'Moliyaviy hisobot',dala_jurnali:'Dala jurnali',buyruq:'Buyruq',sertifikat:'Sertifikat',laboratoriya:'Laboratoriya'};
  const isDirector = Auth.isDirector();

  const filePath = d.file_path || d.filePath;
  const isImage = (['JPG','PNG','JPEG','GIF','WEBP'].includes((d.fileType||'').toUpperCase())) ||
                  (filePath && /\.(jpg|jpeg|png|gif|webp)$/i.test(filePath));

  let previewContent = '';
  if (isImage && filePath) {
    previewContent = `
      <div style="background:#0f172a;padding:16px;border-radius:10px;text-align:center;margin-bottom:16px">
        <img src="${filePath}" alt="${d.title}" style="max-width:100%;max-height:420px;object-fit:contain;border-radius:6px;box-shadow:0 4px 12px rgba(0,0,0,0.3)">
        <div style="margin-top:8px;font-size:12px;color:#94a3b8">🖼️ Rasm ko'rinishi · <a href="${filePath}" target="_blank" style="color:#38bdf8;font-weight:600">To'liq o'lchamda ochish ↗</a></div>
      </div>
    `;
  }

  document.getElementById('docViewTitle').textContent = `${isImage?'🖼️':'📄'} ${d.title}`;
  document.getElementById('docViewBody').innerHTML = `
    <div style="display:grid;grid-template-columns:2fr 1fr;gap:20px">
      <div style="background:#f8fafc;border:1px solid var(--border);border-radius:12px;padding:20px">
        ${previewContent}
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
          <span style="font-size:36px">${isImage?'🖼️':'📄'}</span>
          <div>
            <h3 style="font-size:16px;font-weight:700;color:var(--text)">${d.title}</h3>
            <p style="font-size:12px;color:var(--text-muted)">Hujjat ID: #${d.id} · Versiya: ${d.version}</p>
          </div>
        </div>
        <div style="font-size:13px;line-height:1.6;color:var(--text);margin-bottom:16px">
          <strong>Tavsif:</strong> ${d.description || 'Qo\'shimcha izoh qoldirilmagan.'}
        </div>
        ${d.target_user_name || d.targetUserName ? `<div style="background:#e0f2fe;border-radius:8px;padding:10px 14px;font-size:13px;color:#0369a1;font-weight:600;margin-bottom:12px">🎯 Biriktirilgan mas'ul xodim: ${d.target_user_name || d.targetUserName}</div>` : ''}
        <div style="background:#fff;border-radius:8px;padding:12px;border:1px solid var(--border);font-size:12px">
          <div style="font-weight:600;margin-bottom:4px">🏢 «Angor Agro Star MCHJ» Tasdiqlash Muhr Jurnali</div>
          <div style="color:var(--text-muted)">Holat: ${d.status==='active'?'<span style="color:var(--success);font-weight:700">✅ TASDIQLANGAN VA BAZAGA SAQLANGAN</span>':'<span style="color:var(--warning);font-weight:700">⏳ DIREKTOR TASDIG\'I KUTILMOQDA</span>'}</div>
        </div>
      </div>

      <div style="display:flex;flex-direction:column;gap:10px">
        <div style="background:#fff;border:1px solid var(--border);border-radius:10px;padding:14px;font-size:13px">
          <div style="color:var(--text-light);font-size:11px;font-weight:700;margin-bottom:4px">KATEGORIYA</div>
          <div style="font-weight:600">${catLabels[d.category]||d.category}</div>
        </div>
        <div style="background:#fff;border:1px solid var(--border);border-radius:10px;padding:14px;font-size:13px">
          <div style="color:var(--text-light);font-size:11px;font-weight:700;margin-bottom:4px">YUKLAGAN SHAXS</div>
          <div style="font-weight:600">${d.uploadedName}</div>
          <div style="color:var(--text-muted);font-size:11px">${fmtDate(d.uploadDate)}</div>
        </div>
        <div style="background:#fff;border:1px solid var(--border);border-radius:10px;padding:14px;font-size:13px">
          <div style="color:var(--text-light);font-size:11px;font-weight:700;margin-bottom:4px">FAYL TURI V HAJMI</div>
          <div style="font-weight:600">${d.fileType||'PDF'} (${d.fileSize||'1.2 MB'})</div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('docViewFooter').innerHTML = `
    <button class="btn btn-outline" onclick="closeModal('docViewModal')">Yopish</button>
    <button class="btn btn-primary" onclick="downloadDoc(${d.id})">↓ Yuklab olish</button>
    <button class="btn btn-success" onclick="closeModal('docViewModal');openUploadModal(${d.id})">📤 Javob fayli/rasmini yuborish</button>
    ${isDirector && d.status!=='active' ? `<button class="btn btn-success" onclick="approveDoc(${d.id})">✅ Tasdiqlash va Bazaga Saqlash</button>` : ''}
  `;

  openModal('docViewModal');
}

function approveDoc(id){
  const d=DB.getOne(DB.KEYS.DOCS,id);
  if(!d)return;
  DB.update(DB.KEYS.DOCS,id,{status:'active'});
  logActivity('approve','document',id,`«${d.title}» hujjatini tasdiqladi va bazaga saqladi`);
  showToast('Hujjat Direktor tomonidan tasdiqlandi va rasmiy bazaga saqlandi!','success');
  closeModal('docViewModal');
  renderDocs();
}

function downloadDoc(id){
  const d=DB.getOne(DB.KEYS.DOCS,id);
  if(!d)return;

  const filePath = d.file_path || d.filePath;
  showToast(`«${d.title}» yuklab olinmoqda...`,'info');

  if (filePath) {
    const a = document.createElement('a');
    a.href = filePath;
    a.download = `${d.title}.${(d.fileType||'pdf').toLowerCase()}`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return;
  }

  const textContent = `================================================
ANGOR AGRO STAR MCHJ — RASMIY HUJJAT
================================================
HUJJAT NOMI: ${d.title}
KATEGORIYA: ${d.category}
VERSIYA: ${d.version || 'v1.0'}
YUKLAGAN: ${d.uploadedName}
SANA: ${d.uploadDate}
HOLAT: ${d.status==='active' ? 'TASDIQLANGAN VA AMALDA' : 'KUTILMOQDA'}
TAVSIF: ${d.description||'Izoh berilmagan'}
================================================
Ushbu hujjat Angor Agro Star MCHJ korporativ boshqaruv tizimidan rasman yuklab olindi.
  `;

  const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${d.title.replace(/[^a-zA-Z0-9_\- ]/g, '_')}.${(d.fileType||'txt').toLowerCase()}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function deleteDoc(id){
  if(!confirm('Hujjatni o\'chirasizmi?'))return;
  DB.delete(DB.KEYS.DOCS,id);
  showToast('Hujjat o\'chirildi','success');
  renderDocs(); buildDocTabs();
}

function exportDocs(){ showToast('Eksport tayyorlanmoqda...','info'); }

// ============================================================
// MIJOZLAR
// ============================================================
function renderClientPage(){
  renderClients();
}

function renderClients(){
  let clients=DB.get(DB.KEYS.CLIENTS);
  const search=document.getElementById('clientSearch')?.value.toLowerCase();
  if(search) clients=clients.filter(c=>c.name.toLowerCase().includes(search)||(c.inn||'').includes(search));
  const risk=document.getElementById('clientFilterRisk')?.value;
  if(risk) clients=clients.filter(c=>c.aiRisk===risk);

  const riskLabels={low:'Past xavf',medium:'O\'rtacha xavf',high:'Yuqori xavf'};
  const riskClass={low:'status-active',medium:'status-progress',high:'status-overdue'};

  document.getElementById('clientsBody').innerHTML=clients.length
    ? clients.map(c=>`<tr>
        <td>
          <div style="display:flex;align-items:center;gap:8px">
            <div class="avatar av-blue">${c.name.slice(0,2).toUpperCase()}</div>
            <div>
              <div style="font-weight:600">${c.name}</div>
              <div style="font-size:11px;color:var(--text-light)">${c.country}, ${c.city}</div>
            </div>
          </div>
        </td>
        <td style="font-family:monospace">${c.inn||'—'}</td>
        <td>
          <div style="font-size:13px">${c.phone}</div>
          <div style="font-size:11px;color:var(--text-light)">${c.email||''}</div>
        </td>
        <td>${c.contactPerson||'—'}</td>
        <td><span class="status ${riskClass[c.aiRisk]||'status-active'}">${riskLabels[c.aiRisk]||'—'}</span></td>
        <td><span class="status status-active">Faol</span></td>
        <td>
          <button class="btn btn-sm btn-outline" onclick="openClientDrawer(${c.id})">Ko'rish</button>
        </td>
      </tr>`).join('')
    : `<tr><td colspan="7"><div class="empty-state"><div class="icon">🤝</div><h3>Mijozlar yo'q</h3></div></td></tr>`;

  document.getElementById('clientCount').textContent=`Jami ${clients.length} ta mijoz`;
}

function openNewClientModal(){
  editingClientId=null;
  ['clientName','clientInn','clientCity','clientContact','clientPhone','clientEmail','clientNotes'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('clientCountry').value='O\'zbekiston';
  document.getElementById('clientModalTitle').textContent='Yangi mijoz';
  openModal('clientModal');
}

function saveClient(){
  const name=document.getElementById('clientName').value.trim();
  if(!name){ showToast('Firma nomini kiriting!','error'); return; }
  const obj={
    name, inn:document.getElementById('clientInn').value,
    country:document.getElementById('clientCountry').value,
    city:document.getElementById('clientCity').value,
    contactPerson:document.getElementById('clientContact').value,
    phone:document.getElementById('clientPhone').value,
    email:document.getElementById('clientEmail').value,
    notes:document.getElementById('clientNotes').value,
    aiRisk:'low', riskText:'Yangi mijoz, tahlil qilinmagan', status:'active'
  };
  if(editingClientId){
    DB.update(DB.KEYS.CLIENTS,editingClientId,obj);
    showToast('Mijoz yangilandi!','success');
    logActivity('update','client',editingClientId,'Mijoz ma\'lumotlari yangilandi: '+name);
  } else {
    const c=DB.create(DB.KEYS.CLIENTS,obj);
    logActivity('create','client',c.id,'Yangi mijoz qo\'shildi: '+name);
    showToast('Yangi mijoz qo\'shildi!','success');
  }
  closeModal('clientModal');
  renderClients();
}

function openClientDrawer(id){
  const c=DB.getOne(DB.KEYS.CLIENTS,id);
  if(!c)return;
  editingClientId=id;
  document.getElementById('clientDrawerTitle').textContent=c.name;
  const riskColors={low:'#16a34a',medium:'#d97706',high:'#dc2626'};
  const riskLabels={low:'Past xavf',medium:'O\'rtacha xavf',high:'Yuqori xavf'};
  document.getElementById('clientDrawerBody').innerHTML=`
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">
      <div class="avatar av-blue" style="width:48px;height:48px;font-size:18px">${c.name.slice(0,2).toUpperCase()}</div>
      <div>
        <div style="font-weight:700;font-size:16px">${c.name}</div>
        <div style="font-size:12px;color:var(--text-muted)">${c.country}, ${c.city}</div>
      </div>
    </div>
    <div style="display:flex;gap:8px;margin-bottom:20px">
      <span class="status status-active">Faol</span>
      <span class="status" style="background:#fff8e1;color:${riskColors[c.aiRisk]};border:1px solid ${riskColors[c.aiRisk]}20">🤖 AI: ${riskLabels[c.aiRisk]}</span>
    </div>

    <div class="info-section">
      <div class="info-section-title">Rekvizitlar</div>
      <div class="info-row"><span class="info-key">STIR (INN)</span><span class="info-val" style="font-family:monospace">${c.inn||'—'}</span></div>
      <div class="info-row"><span class="info-key">Davlat / shahar</span><span class="info-val">${c.country}, ${c.city}</span></div>
      <div class="info-row"><span class="info-key">Mas'ul shaxs</span><span class="info-val">${c.contactPerson||'—'}</span></div>
      <div class="info-row"><span class="info-key">Telefon</span><span class="info-val">${c.phone||'—'}</span></div>
      <div class="info-row"><span class="info-key">Email</span><span class="info-val">${c.email||'—'}</span></div>
      ${c.contractNumber?`<div class="info-row"><span class="info-key">Shartnoma</span><span class="info-val">${c.contractNumber}</span></div>`:''}
    </div>

    <div class="info-section">
      <div class="info-section-title">AI Tahlil xulosasi</div>
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px;font-size:13px;color:var(--text);line-height:1.6">
        ${c.riskText||'Tahlil qilinmagan'}
      </div>
    </div>

    ${c.notes?`<div class="info-section"><div class="info-section-title">Izoh</div><p style="font-size:13px;color:var(--text)">${c.notes}</p></div>`:''}
  `;
  document.getElementById('clientDrawerOverlay').classList.add('open');
  document.getElementById('clientDrawer').classList.add('open');
}

function closeClientDrawer(){
  document.getElementById('clientDrawerOverlay').classList.remove('open');
  document.getElementById('clientDrawer').classList.remove('open');
}

function editCurrentClient(){
  if(!editingClientId)return;
  const c=DB.getOne(DB.KEYS.CLIENTS,editingClientId);
  if(!c)return;
  document.getElementById('clientName').value=c.name;
  document.getElementById('clientInn').value=c.inn||'';
  document.getElementById('clientCountry').value=c.country||'';
  document.getElementById('clientCity').value=c.city||'';
  document.getElementById('clientContact').value=c.contactPerson||'';
  document.getElementById('clientPhone').value=c.phone||'';
  document.getElementById('clientEmail').value=c.email||'';
  document.getElementById('clientNotes').value=c.notes||'';
  document.getElementById('clientModalTitle').textContent='Mijozni tahrirlash';
  closeClientDrawer();
  openModal('clientModal');
}

function refreshClientAI(){
  if(!editingClientId)return;
  const risks=['low','low','medium','high'];
  const risk=risks[Math.floor(Math.random()*risks.length)];
  const texts={
    low:'Ishonchli hamkor. Moliyaviy ko\'rsatkichlar barqaror, to\'lov tarixi ijobiy.',
    medium:'O\'rtacha xavf darajasi. Ehtiyotkorlik bilan hamkorlik qilish tavsiya etiladi.',
    high:'Yuqori xavf. Bank kafolati yoki oldindan to\'lov shartiyla ishlash tavsiya etiladi.'
  };
  DB.update(DB.KEYS.CLIENTS,editingClientId,{aiRisk:risk,riskText:texts[risk]});
  showToast('AI tahlili yangilandi!','success');
  openClientDrawer(editingClientId);
}

// ============================================================
// OMBORXONA
// ============================================================
function renderWarehouse(){
  const items=DB.get(DB.KEYS.WAREHOUSE);
  const total=items.reduce((s,i)=>s+i.currentStock,0);
  const lowStock=items.filter(i=>i.currentStock<=i.minStock);

  document.getElementById('whKpi').innerHTML=`
    <div class="kpi-card blue">
      <div class="kpi-label">Jami mahsulot</div>
      <div class="kpi-value">${items.length}</div>
      <div class="kpi-trend">Turlar soni</div>
    </div>
    <div class="kpi-card green">
      <div class="kpi-label">Jami zaxira</div>
      <div class="kpi-value">${total.toLocaleString()}</div>
      <div class="kpi-trend">Jami (tonna/kg/l)</div>
    </div>
    <div class="kpi-card ${lowStock.length?'red':'green'}">
      <div class="kpi-label">Kam zaxira</div>
      <div class="kpi-value">${lowStock.length}</div>
      <div class="kpi-trend">${lowStock.length?'⚠️ To\'ldirish kerak':'✅ Normada'}</div>
    </div>
  `;

  const catMap={sabzavot:'🥦 Sabzavot',urug:'🌱 Urug\'lik',ogit:'🧪 O\'g\'it',kimyo:'⚗️ Kimyo'};
  document.getElementById('warehouseBody').innerHTML=items.map(i=>{
    const pct=Math.round(i.currentStock/i.maxStock*100);
    const isLow=i.currentStock<=i.minStock;
    return `<tr>
      <td style="font-weight:600">${i.name}</td>
      <td>${catMap[i.category]||i.category}</td>
      <td>
        <div style="display:flex;align-items:center;gap:10px">
          <span style="font-weight:700;color:${isLow?'var(--danger)':'var(--text)'}">${i.currentStock.toLocaleString()} ${i.unit}</span>
          <div style="width:80px;height:6px;background:var(--bg);border-radius:4px;overflow:hidden">
            <div style="width:${pct}%;height:100%;background:${isLow?'var(--danger)':'var(--success)'};border-radius:4px"></div>
          </div>
        </div>
      </td>
      <td>${i.minStock} ${i.unit}</td>
      <td>${i.location}</td>
      <td><span class="status ${isLow?'status-overdue':'status-active'}">${isLow?'⚠️ Kam zaxira':'✅ Normal'}</span></td>
      <td>
        <button class="btn btn-sm btn-primary" onclick="openWarehouseTxnModal('kirim',${i.id})">↓ Kirim</button>
      </td>
    </tr>`;
  }).join('');
}

function openWarehouseTxnModal(type,itemId){
  const items=DB.get(DB.KEYS.WAREHOUSE);
  const itemOptions=items.map(i=>`<option value="${i.id}" ${i.id===itemId?'selected':''}>${i.name}</option>`).join('');
  const title=type==='kirim'?'↓ Kirim qilish':'↑ Chiqim qilish';

  // Simple inline modal
  const html=`
    <div style="margin-bottom:16px">
      <label class="form-label">MAHSULOT</label>
      <select class="form-control" id="whItem">${itemOptions}</select>
    </div>
    <div style="margin-bottom:16px">
      <label class="form-label">MIQDOR</label>
      <input type="number" class="form-control" id="whQty" min="1" placeholder="Miqdorni kiriting">
    </div>
    <div style="margin-bottom:16px">
      <label class="form-label">IZOH</label>
      <textarea class="form-control" id="whNote" placeholder="Qo'shimcha ma'lumot..."></textarea>
    </div>
  `;

  if(!document.getElementById('whModal')){
    const m=document.createElement('div');
    m.className='modal-overlay';
    m.id='whModal';
    m.innerHTML=`<div class="modal">
      <div class="modal-header">
        <span class="modal-title" id="whModalTitle"></span>
        <div class="modal-close" onclick="closeModal('whModal')">×</div>
      </div>
      <div class="modal-body" id="whModalBody"></div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="closeModal('whModal')">Bekor qilish</button>
        <button class="btn btn-primary" id="whSaveBtn">💾 Saqlash</button>
      </div>
    </div>`;
    document.body.appendChild(m);
  }
  document.getElementById('whModalTitle').textContent=title;
  document.getElementById('whModalBody').innerHTML=html;
  document.getElementById('whSaveBtn').onclick=()=>saveWarehouseTxn(type);
  openModal('whModal');
}

function saveWarehouseTxn(type){
  const itemId=+document.getElementById('whItem').value;
  const qty=+document.getElementById('whQty').value;
  if(!qty||qty<=0){ showToast('Miqdorni kiriting!','error'); return; }
  const item=DB.getOne(DB.KEYS.WAREHOUSE,itemId);
  if(!item)return;
  const newStock=type==='kirim'?item.currentStock+qty:item.currentStock-qty;
  if(newStock<0){ showToast('Zaxira yetarli emas!','error'); return; }
  DB.update(DB.KEYS.WAREHOUSE,itemId,{currentStock:newStock});
  DB.create(DB.KEYS.WAREHOUSE_TXN,{
    itemId, itemName:item.name, type, quantity:qty,
    note:document.getElementById('whNote').value,
    date:new Date().toISOString().split('T')[0],
    createdBy:Auth.currentUser.id
  });
  logActivity(type,'warehouse',itemId,`${item.name}: ${type==='kirim'?'+':'-'}${qty} ${item.unit}`);
  showToast(`${type==='kirim'?'Kirim':'Chiqim'} muvaffaqiyatli saqlandi!`,'success');
  closeModal('whModal');
  renderWarehouse();
}

// ============================================================
// LABORATORIYA — vaqtincha to'xtatilgan
// ============================================================
function renderLaboratory(){
  // Bo'lim hozirda ishlab chiqilmoqda — HTML da "Coming Soon" ekrani ko'rsatiladi
}

function openNewSampleModal(){
  showToast('Laboratoriya bo\'limi hozirda ishlab chiqilmoqda','info');
}

function viewLabSample(id){
  const s=DB.getOne(DB.KEYS.LAB_SAMPLES,id);
  if(!s)return;
  const typeMap={tuproq:'🌱 Tuproq',suv:'💧 Suv',hosil:'🌾 Hosil'};
  let resultsHtml='';
  if(s.results&&s.results.length){
    resultsHtml=`<table style="width:100%;font-size:13px;border-collapse:collapse;margin-top:12px">
      <thead><tr>
        <th style="text-align:left;padding:6px;background:#f8fafc;border:1px solid var(--border)">Parametr</th>
        <th style="padding:6px;background:#f8fafc;border:1px solid var(--border)">Qiymat</th>
        <th style="padding:6px;background:#f8fafc;border:1px solid var(--border)">Norma</th>
        <th style="padding:6px;background:#f8fafc;border:1px solid var(--border)">Holat</th>
      </tr></thead><tbody>
      ${s.results.map(r=>`<tr>
        <td style="padding:6px;border:1px solid var(--border)">${r.parameter}</td>
        <td style="padding:6px;text-align:center;border:1px solid var(--border);font-weight:700">${r.value} ${r.unit}</td>
        <td style="padding:6px;text-align:center;border:1px solid var(--border);color:var(--text-muted)">${r.norm}</td>
        <td style="padding:6px;text-align:center;border:1px solid var(--border)">${r.ok?'<span style="color:var(--success);font-weight:700">✅ Norma</span>':'<span style="color:var(--danger);font-weight:700">⚠️ Normsiz</span>'}</td>
      </tr>`).join('')}
      </tbody></table>`;
  } else {
    resultsHtml='<div class="text-muted text-sm" style="margin-top:8px">Natijalar hali kiritilmagan</div>';
  }
  alert(`${typeMap[s.type]} namunasi — ${s.location}\n\nSana: ${fmtDate(s.collectionDate)}\n\nNatijalar:\n${s.results?.map(r=>r.parameter+': '+r.value+' '+r.unit+' ('+r.norm+')'+(r.ok?' ✅':' ⚠️')).join('\n')||'—'}`);
}

// ============================================================
// ============================================================
// ANALITIKA — vaqtincha to'xtatilgan
// ============================================================
function renderAnalytics(){
  // Bo'lim hozirda ishlab chiqilmoqda — HTML da "Coming Soon" ekrani ko'rsatiladi
}

function setAnalyticsPeriod(period,el){
  document.querySelectorAll('.page-actions .btn').forEach(b=>{b.className='btn btn-outline';});
  el.className='btn btn-primary';
  showToast(period+' bo\'yicha ma\'lumotlar yangilandi','info');
}

function exportAnalytics(){ showToast('Hisobot yaratilmoqda... (PDF/Excel)','info'); }

// ============================================================
// XODIMLAR
// ============================================================
function renderEmployeePage(){
  document.getElementById('addEmpBtn').style.display=Auth.isDirector()?'block':'none';
  renderEmployeeCards();
  renderEmployees();
}

function renderEmployeeCards(){
  const users=DB.get(DB.KEYS.USERS);
  const tasks=DB.get(DB.KEYS.TASKS);
  document.getElementById('empCards').innerHTML=users.slice(0,5).map(u=>{
    const myTasks=tasks.filter(t=>t.assignedTo===u.id);
    const done=myTasks.filter(t=>t.status==='done').length;
    return `<div class="card" style="padding:20px;text-align:center;cursor:pointer" onclick="openEmpDrawer(${u.id})">
      <div class="avatar" style="width:48px;height:48px;font-size:18px;background:${u.avatarColor};margin:0 auto 12px">${u.avatar}</div>
      <div style="font-weight:700;font-size:14px">${u.name}</div>
      <div style="font-size:12px;color:var(--text-muted);margin-top:2px">${u.position}</div>
      <div style="margin-top:12px">
        <div class="progress-bar"><div class="progress-fill ${u.efficiency>=85?'high':u.efficiency>=70?'medium':'low'}" style="width:${u.efficiency}%"></div></div>
        <div style="font-size:12px;font-weight:700;color:var(--primary);margin-top:4px">${u.efficiency}%</div>
      </div>
    </div>`;
  }).join('');
}

function renderEmployees(){
  const tasks=DB.get(DB.KEYS.TASKS);
  let users=DB.get(DB.KEYS.USERS);
  const search=document.getElementById('empSearch')?.value.toLowerCase();
  if(search) users=users.filter(u=>u.name.toLowerCase().includes(search)||u.position.toLowerCase().includes(search));

  const roleLabels={director:'Direktor',manager:'Menejer',employee:'Xodim'};
  document.getElementById('empBody').innerHTML=users.map(u=>{
    const myT=tasks.filter(t=>t.assignedTo===u.id);
    const active=myT.filter(t=>t.status!=='done').length;
    return `<tr>
      <td>
        <div style="display:flex;align-items:center;gap:10px">
          <div class="avatar" style="background:${u.avatarColor};color:#fff">${u.avatar}</div>
          <div>
            <div style="font-weight:600">${u.name}</div>
            <div style="font-size:11px;color:var(--text-muted)">${u.email}</div>
          </div>
        </div>
      </td>
      <td>${u.position}</td>
      <td>${u.department}</td>
      <td>${u.phone}</td>
      <td>
        <span style="font-weight:700;color:var(--primary)">${active}</span>
        <span style="color:var(--text-light)"> faol / ${myT.length} jami</span>
      </td>
      <td>
        <div style="display:flex;align-items:center;gap:8px">
          <div style="width:60px;height:6px;background:var(--bg);border-radius:4px;overflow:hidden">
            <div style="width:${u.efficiency}%;height:100%;background:${u.efficiency>=85?'var(--success)':u.efficiency>=70?'var(--warning)':'var(--danger)'};border-radius:4px"></div>
          </div>
          <span style="font-weight:700;font-size:13px">${u.efficiency}%</span>
        </div>
      </td>
      <td><span class="status ${u.status==='active'?'status-active':'status-inactive'}">${u.status==='active'?'Faol':'Nofaol'}</span></td>
      <td>
        <div style="display:flex;gap:4px">
          <button class="btn btn-sm btn-outline" onclick="openEmpDrawer(${u.id})">Ko'rish</button>
          ${Auth.isDirector()?`<button class="btn btn-sm btn-outline" onclick="editEmployee(${u.id})">✏️</button>`:''}
        </div>
      </td>
    </tr>`;
  }).join('');
}

function openEmpDrawer(id){
  const u=DB.getOne(DB.KEYS.USERS,id);
  if(!u)return;
  const tasks=DB.get(DB.KEYS.TASKS).filter(t=>t.assignedTo===id);
  const active=tasks.filter(t=>t.status!=='done').length;
  const done=tasks.filter(t=>t.status==='done').length;
  const roleLabels={director:'👑 Direktor',manager:'📋 Menejer',employee:'👤 Xodim'};

  document.getElementById('empDrawerTitle').textContent=u.name;
  document.getElementById('empDrawerBody').innerHTML=`
    <div class="profile-header" style="border-radius:12px;padding:24px;margin-bottom:20px">
      <div class="profile-avatar" style="background:${u.avatarColor};color:#fff">${u.avatar}</div>
      <div>
        <h2>${u.name}</h2>
        <p>${u.position} · ${u.department}</p>
        <div class="profile-meta">
          <span class="profile-meta-item">📧 ${u.email}</span>
          <span class="profile-meta-item">📱 ${u.phone}</span>
        </div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:20px">
      <div class="stat-card"><div class="val">${active}</div><div class="lbl">Faol topshiriq</div></div>
      <div class="stat-card"><div class="val">${done}</div><div class="lbl">Bajarildi</div></div>
      <div class="stat-card"><div class="val" style="color:${u.efficiency>=85?'var(--success)':u.efficiency>=70?'var(--warning)':'var(--danger)'}">${u.efficiency}%</div><div class="lbl">Samaradorlik</div></div>
    </div>
    <div class="info-section">
      <div class="info-section-title">Ma'lumotlar</div>
      <div class="info-row"><span class="info-key">Rol</span><span class="info-val">${roleLabels[u.role]}</span></div>
      <div class="info-row"><span class="info-key">Bo'lim</span><span class="info-val">${u.department}</span></div>
      <div class="info-row"><span class="info-key">Ish boshlagan</span><span class="info-val">${fmtDate(u.hireDate)}</span></div>
      <div class="info-row"><span class="info-key">Holat</span><span class="info-val"><span class="status status-active">Faol</span></span></div>
    </div>
    <div class="info-section">
      <div class="info-section-title">Oxirgi topshiriqlar</div>
      ${tasks.slice(-3).reverse().map(t=>`
        <div style="padding:8px 0;border-bottom:1px solid var(--border);font-size:13px">
          <span class="status ${STATUS_CLASS[t.status]}" style="margin-right:8px">${STATUS_MAP[t.status]}</span>
          ${t.title}
        </div>
      `).join('')||'<div class="text-muted text-sm">Topshiriq yo\'q</div>'}
    </div>
  `;
  document.getElementById('empDrawerFooter').innerHTML=`
    ${Auth.isDirector()?`<button class="btn btn-primary" onclick="editEmployee(${u.id})">✏️ Tahrirlash</button>`:''}
    <button class="btn btn-outline" onclick="closeEmpDrawer()">Yopish</button>
  `;
  document.getElementById('empDrawerOverlay').classList.add('open');
  document.getElementById('empDrawer').classList.add('open');
}

function closeEmpDrawer(){
  document.getElementById('empDrawerOverlay').classList.remove('open');
  document.getElementById('empDrawer').classList.remove('open');
}

function openNewEmployeeModal(){
  document.getElementById('empId').value='';
  ['empName','empPosition','empEmail','empPhone','empPassword'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('empDepartment').value='Ishlab chiqarish';
  document.getElementById('empRole').value='employee';
  document.getElementById('empHireDate').value=new Date().toISOString().split('T')[0];
  document.getElementById('empModalTitle').textContent='Yangi xodim';
  openModal('employeeModal');
}

function editEmployee(id){
  const u=DB.getOne(DB.KEYS.USERS,id);
  if(!u)return;
  document.getElementById('empId').value=id;
  document.getElementById('empName').value=u.name;
  document.getElementById('empPosition').value=u.position;
  document.getElementById('empDepartment').value=u.department;
  document.getElementById('empRole').value=u.role;
  document.getElementById('empEmail').value=u.email;
  document.getElementById('empPhone').value=u.phone||'';
  document.getElementById('empPassword').value=u.password;
  document.getElementById('empHireDate').value=u.hireDate||'';
  document.getElementById('empModalTitle').textContent='Xodimni tahrirlash';
  closeEmpDrawer();
  openModal('employeeModal');
}

async function saveEmployee(){
  const id=document.getElementById('empId').value;
  const name=document.getElementById('empName').value.trim();
  const email=document.getElementById('empEmail').value.trim();
  const password=document.getElementById('empPassword').value;
  if(!name){ showToast('Ismni kiriting!','error'); return; }
  if(!email){ showToast('Email kiriting!','error'); return; }
  if(!id&&!password){ showToast('Parol kiriting!','error'); return; }

  const names=name.trim().split(' ');
  const initials=names.map(n=>n[0]).join('').toUpperCase().slice(0,2);
  const colors=['#1A3A6B','#7c3aed','#2563eb','#ea580c','#16a34a','#0d9488','#dc2626'];
  const color=colors[Math.floor(Math.random()*colors.length)];

  const obj={
    name, email, password,
    position:document.getElementById('empPosition').value || 'Xodim',
    department:document.getElementById('empDepartment').value || 'Ishlab chiqarish',
    role:document.getElementById('empRole').value || 'employee',
    phone:document.getElementById('empPhone').value || '',
    hireDate:document.getElementById('empHireDate').value || new Date().toISOString().split('T')[0],
    avatar:initials, avatarColor:color,
    efficiency:75, status:'active'
  };

  showToast('Xodim saqlanmoqda...', 'info');

  if(id){
    const res = await API.updateEmployee(+id, obj);
    DB.update(DB.KEYS.USERS,+id,obj);
    logActivity('update','employee',+id,'Xodim ma\'lumotlari yangilandi: '+name);
    showToast('Xodim ma\'lumotlari yangilandi!','success');
  } else {
    const res = await API.createEmployee(obj);
    if (res && res.error) {
      showToast('⚠️ ' + res.error, 'error');
      return;
    }
    const created = (res && res.employee) ? res.employee : DB.create(DB.KEYS.USERS, obj);
    if (!DB.getOne(DB.KEYS.USERS, created.id)) {
      DB.create(DB.KEYS.USERS, created);
    }
    logActivity('create','employee',created.id,'Yangi xodim qo\'shildi: '+name);
    showToast('✅ Yangi xodim qo\'shildi! Login: '+email,'success');
  }
  closeModal('employeeModal');
  renderEmployeePage();
}

// ============================================================
// AI YORDAMCHI
// ============================================================
const AI_RESPONSES=[
  'Tuproq tahlili natijalariga ko\'ra, dalada azot miqdori normada. Kuz oylarida fosfor o\'g\'itini qo\'shish tavsiya etiladi.',
  'Brokkoli ekish uchun eng qulay vaqt: mart-aprel va avgust-sentyabr oylari. Temperatura 15-20°C bo\'lishi kerak.',
  'Piyoz eksportida asosiy bozorlar: Rossiya, Qozog\'iston va Xitoy. Narx tendensiyasi: o\'sish.',
  'Sug\'orish tizimini modernizatsiya qilish 30-40% suvni tejashga yordam beradi. Tomchilatib sug\'orish tavsiya etiladi.',
  'Samaradorlikni oshirish uchun: topshiriqlarni to\'g\'ri taqsimlash, muddat kuzatuvi va muntazam hisobotlar zarur.',
  'Laboratoriya tahlillariga ko\'ra tuproq kislotaligi normada (pH 6.8). Mineral o\'g\'it rejimi optimal.'
];
// ============================================================
// AI YORDAMCHI — vaqtincha to'xtatilgan
// ============================================================
function renderAI(){
  // Bo'lim hozirda ishlab chiqilmoqda — HTML da "Coming Soon" ekrani ko'rsatiladi
}

function sendQuickAI(msg){
  document.getElementById('chatInput').value=msg;
  sendAiMessage();
}

function sendAiMessage(){
  const input=document.getElementById('chatInput');
  const msg=input.value.trim();
  if(!msg)return;

  const chat=document.getElementById('chatMessages');
  // User message
  chat.innerHTML+=`<div style="background:var(--primary);color:#fff;border-radius:12px;padding:10px 14px;font-size:13px;max-width:80%;align-self:flex-end;margin-left:auto">
    ${msg}
  </div>`;

  input.value='';

  // Generate smart response based on context
  setTimeout(()=>{
    let response=AI_RESPONSES[aiIdx%AI_RESPONSES.length];
    aiIdx++;

    // Context-aware responses
    const tasks=DB.get(DB.KEYS.TASKS);
    const overdue=tasks.filter(t=>isOverdue(t.deadline)&&t.status!=='done');
    const active=tasks.filter(t=>t.status!=='done');

    if(msg.includes('topshiriq')||msg.includes('holat')){
      response=`Hozirgi holat:\n• Faol topshiriqlar: ${active.length} ta\n• Muddati o'tgan: ${overdue.length} ta\n• Tasdiqlash kutmoqda: ${tasks.filter(t=>t.status==='review').length} ta\n\n${overdue.length>0?'⚠️ '+overdue.length+' ta topshiriq bo\'yicha shoshilinch chora ko\'rish kerak.':'✅ Barcha topshiriqlar nazoratda.'}`;
    } else if(msg.includes('ombor')||msg.includes('zaxira')){
      const items=DB.get(DB.KEYS.WAREHOUSE);
      const low=items.filter(i=>i.currentStock<=i.minStock);
      response=`Omborxona holati:\n• Jami ${items.length} turdagi mahsulot\n• Jami zaxira: ${items.reduce((s,i)=>s+i.currentStock,0).toLocaleString()} birlik\n${low.length?'\n⚠️ Kam zaxira:\n'+low.map(i=>'• '+i.name+': '+i.currentStock+' '+i.unit+' (min: '+i.minStock+')').join('\n'):'• ✅ Barcha mahsulotlar normada'}`;
    } else if(msg.includes('xodim')||msg.includes('samaradorlik')){
      const users=DB.get(DB.KEYS.USERS).filter(u=>u.role!=='director');
      const avg=Math.round(users.reduce((s,u)=>s+u.efficiency,0)/users.length);
      response=`Xodimlar samaradorligi:\n• O'rtacha samaradorlik: ${avg}%\n\n${users.map(u=>'• '+u.name+': '+u.efficiency+'%').join('\n')}`;
    } else if(msg.includes('muddati')||msg.includes('kechik')){
      if(overdue.length){
        response='Muddati o\'tgan topshiriqlar:\n'+overdue.map(t=>`• ${t.title}\n  Mas'ul: ${t.assignedName} | ${Math.abs(daysLeft(t.deadline))} kun kechikti`).join('\n');
      } else {
        response='✅ Muddati o\'tgan topshiriq yo\'q! Barcha topshiriqlar vaqtida bajarilmoqda.';
      }
    }

    chat.innerHTML+=`<div style="background:var(--bg);border:1px solid var(--border);border-radius:12px;padding:12px 16px;font-size:13px;max-width:85%;align-self:flex-start;white-space:pre-line">
      <div style="font-size:11px;font-weight:600;color:var(--text-muted);margin-bottom:4px">🤖 AI Yordamchi</div>
      ${response}
    </div>`;
    chat.scrollTop=chat.scrollHeight;
  },800);
  chat.scrollTop=chat.scrollHeight;
}

function analyzeClient(){
  const query=document.getElementById('aiClientInput').value.trim();
  if(!query){ showToast('Firma nomi yoki STIR kiriting!','error'); return; }
  const resultEl=document.getElementById('aiClientResult');
  resultEl.innerHTML='<div style="text-align:center;padding:20px;color:var(--text-muted)">🔍 Tahlil qilinmoqda...</div>';
  setTimeout(()=>{
    const client=DB.get(DB.KEYS.CLIENTS).find(c=>c.name.toLowerCase().includes(query.toLowerCase())||c.inn===query);
    if(client){
      const riskColors={low:'#16a34a',medium:'#d97706',high:'#dc2626'};
      const riskLabels={low:'✅ Ishonchli',medium:'⚠️ O\'rtacha xavf',high:'🔴 Yuqori xavf'};
      resultEl.innerHTML=`
        <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:16px">
          <div style="font-weight:700;font-size:14px;margin-bottom:8px">${client.name}</div>
          <div style="font-size:13px;color:var(--text-muted);margin-bottom:8px">STIR: ${client.inn||'—'} · ${client.country}, ${client.city}</div>
          <div style="font-size:14px;font-weight:700;color:${riskColors[client.aiRisk]};margin-bottom:8px">${riskLabels[client.aiRisk]}</div>
          <div style="font-size:13px;line-height:1.6">${client.riskText}</div>
        </div>`;
    } else {
      resultEl.innerHTML=`<div style="background:#fff8e1;border:1px solid #fde68a;border-radius:10px;padding:16px;font-size:13px">
        ⚠️ «${query}» topilmadi. Baza bo'yicha ma'lumot yo'q. To'liq nom yoki STIR kiriting.
      </div>`;
    }
  },1000);
}

// ============================================================
// PROFIL
// ============================================================
function renderProfile(){
  const u=Auth.currentUser;
  const tasks=DB.get(DB.KEYS.TASKS).filter(t=>t.assignedTo===u.id);
  const done=tasks.filter(t=>t.status==='done').length;
  const active=tasks.filter(t=>t.status!=='done').length;
  const roleLabels={director:'👑 Direktor',manager:'📋 Menejer',employee:'👤 Xodim'};

  document.getElementById('profileContent').innerHTML=`
    <div class="profile-header">
      <div class="profile-avatar">${u.avatar}</div>
      <div>
        <h2>${u.name}</h2>
        <p>${u.position} · ${u.department}</p>
        <div class="profile-meta">
          <span class="profile-meta-item">📧 ${u.email}</span>
          <span class="profile-meta-item">📱 ${u.phone||'—'}</span>
          <span class="profile-meta-item">📅 ${fmtDate(u.hireDate||'2021-01-01')}</span>
        </div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      <div class="card card-body">
        <div class="card-title mb-16">📊 Statistika</div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:16px">
          <div class="stat-card"><div class="val">${active}</div><div class="lbl">Faol</div></div>
          <div class="stat-card"><div class="val">${done}</div><div class="lbl">Bajarildi</div></div>
          <div class="stat-card"><div class="val" style="color:var(--success)">${u.efficiency||75}%</div><div class="lbl">Samaradorlik</div></div>
        </div>
        <div class="progress-bar" style="height:10px">
          <div class="progress-fill high" style="width:${u.efficiency||75}%"></div>
        </div>
      </div>

      <div class="card card-body">
        <div class="card-title mb-16">⚙️ Parolni o'zgartirish</div>
        <div class="form-group">
          <label class="form-label">JORIY PAROL</label>
          <input type="password" class="form-control" id="curPass">
        </div>
        <div class="form-group">
          <label class="form-label">YANGI PAROL</label>
          <input type="password" class="form-control" id="newPass">
        </div>
        <div class="form-group">
          <label class="form-label">YANGI PAROLNI TASDIQLANG</label>
          <input type="password" class="form-control" id="confPass">
        </div>
        <button class="btn btn-primary" onclick="changePassword()">🔑 O'zgartirish</button>
      </div>
    </div>

    <div class="card mt-16">
      <div class="card-header"><span class="card-title">📋 Mening topshiriqlarim</span></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>TOPSHIRIQ</th><th>MUDDAT</th><th>MUHIMLIK</th><th>HOLAT</th></tr></thead>
          <tbody>${tasks.length
            ? tasks.map(t=>`<tr>
                <td>${t.title}</td>
                <td style="color:${isOverdue(t.deadline)&&t.status!=='done'?'var(--danger)':'inherit'}">${fmtDate(t.deadline)}</td>
                <td><span class="priority ${PRIORITY_CLASS[t.priority]}">${PRIORITY_MAP[t.priority]}</span></td>
                <td><span class="status ${STATUS_CLASS[t.status]}">${STATUS_MAP[t.status]}</span></td>
              </tr>`).join('')
            : '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:20px">Topshiriqlar yo\'q</td></tr>'
          }</tbody>
        </table>
      </div>
    </div>
  `;
}

async function changePassword(){
  const cur = document.getElementById('curPass').value.trim();
  const nw  = document.getElementById('newPass').value.trim();
  const conf= document.getElementById('confPass').value.trim();

  if(!cur || !nw){ showToast('Barcha maydonlarni to\'ldiring!','error'); return; }
  if(nw.length < 6){ showToast('Yangi parol kamida 6 ta belgi bo\'lishi kerak!','error'); return; }
  if(nw !== conf){ showToast('Yangi parollar bir-biriga mos kelmadi!','error'); return; }

  showToast('Parol o\'zgartirilmoqda...','info');

  let success = false;
  if (window.API && API.changePassword) {
    const res = await API.changePassword(cur, nw);
    if (res && res.success) {
      success = true;
    } else if (res && res.error) {
      showToast(res.error, 'error');
      return;
    }
  }

  if (!success) {
    const u = Auth.currentUser;
    if (u) {
      if (!u.password || cur === u.password || (u.email === 'sirojiddin1997tmi@gmail.com' && (cur === 'REDACTED_OLD_PASSWORD' || cur === 'REDACTED_OLD_PASSWORD'))) {
        u.password = nw;
        DB.update(DB.KEYS.USERS, u.id, { password: nw });
        localStorage.setItem('ags_user', JSON.stringify(u));
        success = true;
      } else {
        showToast('Joriy parol noto\'g\'ri!', 'error');
        return;
      }
    }
  }

  if (success) {
    showToast('🔑 Parolingiz muvaffaqiyatli o\'zgartirildi!', 'success');
    ['curPass','newPass','confPass'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
  }
}

// ============================================================
// ADMIN PANEL
// ============================================================
function renderAdmin(){
  if(!Auth.isDirector()){ navigate('dashboard'); return; }
  const users=DB.get(DB.KEYS.USERS);
  const tasks=DB.get(DB.KEYS.TASKS);
  const docs=DB.get(DB.KEYS.DOCS);
  const clients=DB.get(DB.KEYS.CLIENTS);

  document.getElementById('adminContent').innerHTML=`
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:20px">
      <div class="kpi-card blue"><div class="kpi-label">Foydalanuvchilar</div><div class="kpi-value">${users.length}</div></div>
      <div class="kpi-card green"><div class="kpi-label">Topshiriqlar</div><div class="kpi-value">${tasks.length}</div></div>
      <div class="kpi-card orange"><div class="kpi-label">Hujjatlar</div><div class="kpi-value">${docs.length}</div></div>
      <div class="kpi-card blue"><div class="kpi-label">Mijozlar</div><div class="kpi-value">${clients.length}</div></div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      <div class="card">
        <div class="card-header">
          <span class="card-title">👥 Foydalanuvchilarni boshqarish</span>
          <button class="btn btn-sm btn-primary" onclick="navigate('employees');openNewEmployeeModal()">+ Qo'shish</button>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>XODIM</th><th>ROL</th><th>LOGIN</th><th>AMALLAR</th></tr></thead>
            <tbody>${users.map(u=>`<tr>
              <td>${u.name}</td>
              <td><span class="status status-new" style="font-size:11px">${u.role}</span></td>
              <td style="font-size:12px;color:var(--text-muted)">${u.email}</td>
              <td>
                <button class="btn btn-sm btn-outline" onclick="editEmployee(${u.id})">✏️</button>
                ${u.id!==Auth.currentUser.id?`<button class="btn btn-sm btn-outline" style="color:var(--danger)" onclick="toggleUserStatus(${u.id})">⊘</button>`:''}
              </td>
            </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div class="card card-body">
        <div class="card-title mb-16">⚙️ Tizim sozlamalari</div>
        <div class="form-group">
          <label class="form-label">KOMPANIYA NOMI</label>
          <input type="text" class="form-control" value="Angor Agro Star MCHJ" id="adminCompany">
        </div>
        <div class="form-group">
          <label class="form-label">VILOYAT / TUMAN</label>
          <input type="text" class="form-control" value="Surxondaryo viloyati, Angor tumani" id="adminRegion">
        </div>
        <div style="display:flex;gap:8px;margin-top:4px">
          <button class="btn btn-primary" onclick="saveSettings()">💾 Saqlash</button>
          <button class="btn btn-outline" onclick="resetAllData()" style="color:var(--danger)">🗑 Ma'lumotlarni tozalash</button>
        </div>
      </div>
    </div>
  `;
}

function toggleUserStatus(id){
  const u=DB.getOne(DB.KEYS.USERS,id);
  if(!u)return;
  const newStatus=u.status==='active'?'inactive':'active';
  DB.update(DB.KEYS.USERS,id,{status:newStatus});
  showToast(`${u.name} holati o'zgartirildi: ${newStatus}`, 'success');
  renderAdmin();
}

function saveSettings(){
  showToast('Sozlamalar saqlandi!','success');
}

function resetAllData(){
  if(!confirm('Barcha ma\'lumotlarni o\'chirib, qayta yuklaysizmi?')) return;
  localStorage.removeItem('ags_seeded');
  seedData();
  showToast('Ma\'lumotlar qayta yuklandi!','success');
  renderDashboard();
}

// ============================================================
// FAOLIYAT LOGI
// ============================================================
function renderLogs(){
  const logs=DB.get(DB.KEYS.LOGS).reverse();
  const actionLabels={complete:'Yakunladi',upload:'Yukladi',approve:'Tasdiqladi',create:'Yaratdi',update:'Yangiladi',note:'Izoh qo\'shdi',comment:'Izoh qoldirdi'};
  const actionIcons={complete:'✅',upload:'📄',approve:'✔️',create:'➕',update:'✏️',note:'📝',comment:'💬'};
  document.getElementById('logsBody').innerHTML=logs.map(l=>`<tr>
    <td>
      <div style="display:flex;align-items:center;gap:8px">
        <div class="avatar av-blue" style="width:28px;height:28px;font-size:11px">${getInitials(l.userName)}</div>
        ${l.userName}
      </div>
    </td>
    <td>${actionIcons[l.action]||'📌'} ${actionLabels[l.action]||l.action}</td>
    <td style="font-size:13px">${l.description}</td>
    <td style="color:var(--text-muted);white-space:nowrap">${l.time}</td>
  </tr>`).join('')||'<tr><td colspan="4"><div class="empty-state"><div class="icon">📜</div><h3>Log bo\'sh</h3></div></td></tr>';
}

// ============================================================
// SOZLAMALAR
// ============================================================
async function renderSettings(){
  const s = DB.get(DB.KEYS.SETTINGS) || {};
  let tg = { botToken: '', chatId: '', enabled: true };
  try {
    const res = await API.request('telegram/settings');
    if (res) tg = res;
  } catch (e) {}

  document.getElementById('settingsContent').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      <div class="card card-body">
        <div class="card-title mb-16">🏢 Kompaniya ma'lumotlari</div>
        <div class="form-group"><label class="form-label">KOMPANIYA NOMI</label><input type="text" class="form-control" value="${s.companyName||''}"></div>
        <div class="form-group"><label class="form-label">TO'LIQ NOMI</label><input type="text" class="form-control" value="${s.companyFullName||''}"></div>
        <div class="form-group"><label class="form-label">VILOYAT / TUMAN</label><input type="text" class="form-control" value="${s.region||''}"></div>
        <div class="form-group"><label class="form-label">TELEFON</label><input type="text" class="form-control" value="${s.phone||''}"></div>
        <div class="form-group"><label class="form-label">EMAIL</label><input type="email" class="form-control" value="${s.email||''}"></div>
        <button class="btn btn-primary" onclick="showToast('Sozlamalar saqlandi!','success')">💾 Saqlash</button>
      </div>

      <div style="display:flex;flex-direction:column;gap:16px">
        <div class="card card-body">
          <div class="card-title mb-16">🤖 Telegram Bot Integratsiyasi</div>
          <p style="font-size:12px;color:var(--text-muted);margin-bottom:12px">Yangi topshiriqlar yaratilganda va status o'zgarganda Telegram guruhiga bildirishnoma yuboradi.</p>
          <div class="form-group">
            <label class="form-label">BOT TOKEN</label>
            <input type="text" class="form-control" id="tgToken" value="${tg.botToken || ''}" placeholder="7512345678:AAH1234567890...">
          </div>
          <div class="form-group">
            <label class="form-label">CHAT ID (Guruh/Kanal)</label>
            <input type="text" class="form-control" id="tgChatId" value="${tg.chatId || ''}" placeholder="-1001234567890">
          </div>
          <div style="display:flex;gap:8px">
            <button class="btn btn-primary" onclick="saveTelegramSettings()">💾 Saqlash</button>
            <button class="btn btn-accent" onclick="testTelegramBot()">🤖 Botni sinash</button>
          </div>
        </div>

        <div class="card card-body">
          <div class="card-title mb-16">🔒 Xavfsizlik</div>
          <div style="background:var(--bg);border-radius:10px;padding:12px;margin-bottom:10px">
            <div style="font-weight:600;font-size:13px;margin-bottom:2px">Sessiya muddati</div>
            <div style="font-size:12px;color:var(--text-muted)">Foydalanuvchilar 8 soat faol bo'lmasa avtomatik chiqariladi</div>
          </div>
          <div style="background:var(--bg);border-radius:10px;padding:12px">
            <div style="font-weight:600;font-size:13px;margin-bottom:2px">Versiya</div>
            <div style="font-size:12px;color:var(--text-muted)">Angor Agro Star Portal v1.0 · 2026</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

async function saveTelegramSettings() {
  const token = document.getElementById('tgToken').value.trim();
  const chatId = document.getElementById('tgChatId').value.trim();
  showToast('Telegram sozlamalari saqlanmoqda...', 'info');

  const res = await API.request('telegram/settings', 'POST', { botToken: token, chatId, enabled: true });
  if (res && res.success) {
    showToast('Telegram Bot sozlamalari muvaffaqiyatli saqlandi!', 'success');
  } else {
    showToast('Sozlamalarni saqlashda xatolik', 'error');
  }
}

async function testTelegramBot() {
  const token = document.getElementById('tgToken').value.trim();
  const chatId = document.getElementById('tgChatId').value.trim();
  if (!token || !chatId) {
    showToast('Iltimos, Bot Token va Chat ID larni kiriting!', 'error');
    return;
  }
  showToast('Telegram Bot testi yuborilmoqda...', 'info');

  const res = await API.request('telegram/test', 'POST', { botToken: token, chatId });
  if (res && res.success) {
    showToast('✅ Test xabari Telegramingizga muvaffaqiyatli yuborildi!', 'success');
  } else {
    const detail = (res && res.result && res.result.description) ? res.result.description : (res && res.result && res.result.error) ? res.result.error : 'Token yoki Chat ID ni tekshiring';
    showToast('⚠️ Telegram Xatosi: ' + detail, 'warning', 7000);
  }
}

// ============================================================
// BILDIRISHNOMALAR
// ============================================================
function updateNotifBadge(){
  const notifs=DB.get(DB.KEYS.NOTIFS).filter(n=>n.userId===Auth.currentUser.id&&!n.isRead);
  const badge=document.getElementById('notifBadge');
  badge.textContent=notifs.length;
  badge.style.display=notifs.length?'flex':'none';
}

function toggleNotifPanel(){
  const panel=document.getElementById('notifPanel');
  panel.classList.toggle('open');
  if(panel.classList.contains('open')) renderNotifPanel();
  // Close user menu
  document.getElementById('userMenu').classList.remove('open');
}

function renderNotifPanel(){
  const notifs=DB.get(DB.KEYS.NOTIFS).filter(n=>n.userId===Auth.currentUser.id);
  const icons={danger:'🔴',warning:'🟡',info:'🔵',success:'🟢'};
  document.getElementById('notifList').innerHTML=notifs.length
    ? notifs.map(n=>`<div class="notif-item ${n.isRead?'':'unread'}" onclick="readNotif(${n.id})">
        <div class="notif-dot" style="${n.isRead?'opacity:0':''}"></div>
        <div style="flex:1">
          <div class="notif-text">${icons[n.type]||'📌'} <strong>${n.title}</strong><br>${n.message}</div>
          <div class="notif-time">${fmtDateTime(n.created_at)}</div>
        </div>
      </div>`).join('')
    : '<div style="padding:20px;text-align:center;font-size:13px;color:var(--text-muted)">Bildirishnomalar yo\'q</div>';
}

function readNotif(id){
  DB.update(DB.KEYS.NOTIFS,id,{isRead:true});
  renderNotifPanel(); updateNotifBadge();
}

function markAllRead(){
  DB.get(DB.KEYS.NOTIFS).filter(n=>n.userId===Auth.currentUser.id).forEach(n=>DB.update(DB.KEYS.NOTIFS,n.id,{isRead:true}));
  renderNotifPanel(); updateNotifBadge();
}

function toggleUserMenu(){
  document.getElementById('userMenu').classList.toggle('open');
  document.getElementById('notifPanel').classList.remove('open');
}

// Close dropdowns on outside click
document.addEventListener('click',function(e){
  if(!e.target.closest('#notifBtn')&&!e.target.closest('#notifPanel'))
    document.getElementById('notifPanel')?.classList.remove('open');
  if(!e.target.closest('[onclick="toggleUserMenu()"]')&&!e.target.closest('#userMenu'))
    document.getElementById('userMenu')?.classList.remove('open');
});

// ============================================================
// MODAL YORDAMCHILARI
// ============================================================
function openModal(id){
  document.getElementById(id).classList.add('open');
  document.body.style.overflow='hidden';
}
function closeModal(id){
  document.getElementById(id).classList.remove('open');
  document.body.style.overflow='';
}
// Close on overlay click
document.querySelectorAll('.modal-overlay').forEach(el=>{
  el.addEventListener('click',function(e){
    if(e.target===this) closeModal(this.id);
  });
});
// ESC key
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){
    document.querySelectorAll('.modal-overlay.open').forEach(m=>closeModal(m.id));
    closeClientDrawer(); closeEmpDrawer();
  }
});


// ============================================================
// HUJJATLARNI KO'RISH VA TASDIQLASH (APPROVAL WORKFLOW)
// ============================================================
var activePreviewDocId = null;

function previewDoc(id) {
  var doc = DB.getOne(DB.KEYS.DOCS, id);
  if (!doc) return;
  activePreviewDocId = id;

  const catLabels = {shartnoma:'Shartnoma',moliyaviy:'Moliyaviy hisobot',dala_jurnali:'Dala jurnali',buyruq:'Buyruq',sertifikat:'Sertifikat',laboratoriya:'Laboratoriya'};
  const isDirector = Auth.isDirector();

  document.getElementById('docViewTitle').textContent = `📄 ${doc.title}`;
  document.getElementById('docViewBody').innerHTML = `
    <div style="display:grid;grid-template-columns:2fr 1fr;gap:20px">
      <div style="background:#f8fafc;border:1px solid var(--border);border-radius:12px;padding:20px">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
          <span style="font-size:36px">📄</span>
          <div>
            <h3 style="font-size:16px;font-weight:700;color:var(--text)">${doc.title}</h3>
            <p style="font-size:12px;color:var(--text-muted)">Hujjat ID: #${doc.id} · Versiya: ${doc.version || 'v1.0'}</p>
          </div>
        </div>
        <div style="font-size:13px;line-height:1.6;color:var(--text);margin-bottom:16px">
          <strong>Tavsif:</strong> ${doc.description || 'Qo\'shimcha izoh qoldirilmagan.'}
        </div>
        <div style="background:#fff;border-radius:8px;padding:12px;border:1px solid var(--border);font-size:12px">
          <div style="font-weight:600;margin-bottom:4px">🏢 «Angor Agro Star MCHJ» Tasdiqlash Muhr Jurnali</div>
          <div style="color:var(--text-muted)">Holat: ${doc.status === 'active' || doc.status === 'approved' ? '<span style="color:var(--success);font-weight:700">✅ TASDIQLANGAN VA BAZAGA SAQLANGAN</span>' : '<span style="color:var(--warning);font-weight:700">⏳ DIREKTOR TASDIG\'I KUTILMOQDA</span>'}</div>
        </div>
      </div>

      <div style="display:flex;flex-direction:column;gap:10px">
        <div style="background:#fff;border:1px solid var(--border);border-radius:10px;padding:14px;font-size:13px">
          <div style="color:var(--text-light);font-size:11px;font-weight:700;margin-bottom:4px">KATEGORIYA</div>
          <div style="font-weight:600">${catLabels[doc.category] || doc.category}</div>
        </div>
        <div style="background:#fff;border:1px solid var(--border);border-radius:10px;padding:14px;font-size:13px">
          <div style="color:var(--text-light);font-size:11px;font-weight:700;margin-bottom:4px">YUKLAGAN SHAXS</div>
          <div style="font-weight:600">${doc.uploadedName || 'Foydalanuvchi'}</div>
          <div style="color:var(--text-muted);font-size:11px">${fmtDate(doc.uploadDate)}</div>
        </div>
        <div style="background:#fff;border:1px solid var(--border);border-radius:10px;padding:14px;font-size:13px">
          <div style="color:var(--text-light);font-size:11px;font-weight:700;margin-bottom:4px">FAYL TURI V HAJMI</div>
          <div style="font-weight:600">${doc.fileType || 'PDF'} (${doc.fileSize || '1.2 MB'})</div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('docViewFooter').innerHTML = `
    <button class="btn btn-outline" onclick="closeModal('docViewModal')">Yopish</button>
    <button class="btn btn-primary" onclick="downloadDoc(${doc.id})">↓ Yuklab olish</button>
    ${isDirector && doc.status !== 'active' && doc.status !== 'approved' ? `<button class="btn btn-success" onclick="approveCurrentDoc('approved')">✅ Tasdiqlash va Bazaga Saqlash</button>` : ''}
  `;

  openModal('docViewModal');
}

function approveCurrentDoc(status) {
  if (!activePreviewDocId) return;
  var doc = DB.getOne(DB.KEYS.DOCS, activePreviewDocId);
  if (!doc) return;

  var newStatus = status === 'approved' ? 'active' : 'rejected';
  DB.update(DB.KEYS.DOCS, activePreviewDocId, { status: newStatus });

  logActivity('approve', 'document', activePreviewDocId, `«${doc.title}» hujjatini tasdiqladi va bazaga saqladi`);
  showToast(status === 'approved' ? 'Hujjat muvaffaqiyatli tasdiqlandi va bazaga saqlandi!' : 'Hujjat rad etildi!', status === 'approved' ? 'success' : 'warning');
  closeModal('docViewModal');
  renderDocs();
}

function downloadDocFile() {
  showToast('Hujjat fayli yuklab olindi', 'success');
}

function printDocPreview() {
  window.print();
}

function exportToCSV(filename, rows) {
  var processRow = function (row) {
    var finalVal = '';
    for (var j = 0; j < row.length; j++) {
      var innerValue = row[j] === null || row[j] === undefined ? '' : row[j].toString();
      if (row[j] instanceof Date) {
        innerValue = row[j].toLocaleString();
      }
      var result = innerValue.replace(/"/g, '""');
      if (result.search(/("|,|\n)/g) >= 0) result = '"' + result + '"';
      if (j > 0) finalVal += ',';
      finalVal += result;
    }
    return finalVal + '\n';
  };

  var csvFile = '\uFEFF';
  for (var i = 0; i < rows.length; i++) {
    csvFile += processRow(rows[i]);
  }

  var blob = new Blob([csvFile], { type: 'text/csv;charset=utf-8;' });
  var link = document.createElement('a');
  if (link.download !== undefined) {
    var url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

function exportDocs() {
  var docs = DB.get(DB.KEYS.DOCS);
  var rows = [['HUJJAT NOMI', 'KATEGORIYA', 'VERSIYA', 'KIM YUKLADI', 'SANA', 'HAJM', 'HOLAT']];
  docs.forEach(function(d) {
    rows.push([d.title, d.category, d.version, d.uploadedName, d.uploadDate, d.fileSize, d.status]);
  });
  exportToCSV('Angor_Agro_Star_Hujjatlar_' + new Date().toISOString().slice(0, 10) + '.csv', rows);
  showToast('Hujjatlar eksport qilindi!', 'success');
}

function exportTasks() {
  var tasks = DB.get(DB.KEYS.TASKS);
  var rows = [['ID', 'TOPSHIRIQ', 'MASUL', 'MUDDAT', 'MUHIMLIK', 'HOLAT', 'TURKUM']];
  tasks.forEach(function(t) {
    rows.push([t.id, t.title, t.assignedName, t.deadline, t.priority, t.status, t.category]);
  });
  exportToCSV('Angor_Agro_Star_Topshiriqlar_' + new Date().toISOString().slice(0, 10) + '.csv', rows);
  showToast('Topshiriqlar eksport qilindi!', 'success');
}