// ============================================================
// ANGOR AGRO STAR PORTAL — Boshlang'ich Ma'lumotlar
// ============================================================
const db = require('./database');
const bcrypt = require('bcryptjs');

function hash(pwd) {
  return bcrypt.hashSync(pwd, 10);
}

function seedDatabase() {
  const insertUser = db.prepare(`
    INSERT INTO users (name, email, password, role, position, department, phone, avatar, avatar_color, hire_date, efficiency, status)
    VALUES (@name, @email, @password, @role, @position, @department, @phone, @avatar, @avatar_color, @hire_date, @efficiency, @status)
  `);

  const users = [
    { name:'Aziz Karimov',    email:'aziz@angor.uz',    password: hash('REDACTED_OLD_PASSWORD'), role:'director', position:'Direktor',          department:'Boshqaruv',      phone:'+998 90 111-22-33', avatar:'AK', avatar_color:'#C8922A', hire_date:'2021-03-01', efficiency:98, status:'active' },
    { name:'Sirojiddin Faxriddinovich', email:'sirojiddin1997tmi@gmail.com', password: hash('REDACTED_OLD_PASSWORD'), role:'employee', position:'Bosh agronom', department:'Ishlab chiqarish', phone:'+998 90 123-45-67', avatar:'SF', avatar_color:'#C8922A', hire_date:'2026-08-21', efficiency:95, status:'active' }
  ];

  for (const u of users) {
    const existingUser = db.data.users.find(x => (x.email || '').trim().toLowerCase() === u.email.trim().toLowerCase());
    if (!existingUser) {
      insertUser.run(u);
    } else {
      existingUser.name = u.name;
      existingUser.role = u.role;
      existingUser.position = u.position;
      existingUser.status = 'active';
    }
  }
  db.save();

  // --- Sozlamalar ---
  const setSetting = db.prepare(`INSERT OR REPLACE INTO settings (key, value) VALUES (@key, @value)`);
  setSetting.run({ key: 'companyName',     value: 'Angor Agro Star MCHJ' });
  setSetting.run({ key: 'companyFullName', value: '«Uzagrostar xolding» kompaniyasi' });
  setSetting.run({ key: 'region',          value: "O'zbekiston Respublikasi · Surxondaryo viloyati · Angor tumani" });
  setSetting.run({ key: 'phone',           value: '+998 76 XXX-XX-XX' });
  setSetting.run({ key: 'email',           value: 'info@angoragrostar.uz' });

  console.log('[Seed] ✅ Ishlab chiqarish tizimi muvaffaqiyatli tayyorlandi!');
}

module.exports = { seedDatabase };

module.exports = { seedDatabase };
