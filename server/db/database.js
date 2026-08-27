// ============================================================
// ANGOR AGRO STAR PORTAL — JSON File-based Database Engine
// ============================================================
require('dotenv').config();
const fs   = require('fs');
const path = require('path');

function getDbFilePath() {
  const candidates = [
    path.resolve(__dirname, 'angor_portal.json'),
    path.resolve(process.cwd(), 'server', 'db', 'angor_portal.json'),
    path.resolve(process.cwd(), 'db', 'angor_portal.json')
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return candidates[0];
}

class DatabaseEngine {
  constructor() {
    this.data = {
      users: [],
      tasks: [],
      documents: [],
      clients: [],
      warehouse_items: [],
      warehouse_txn: [],
      notifications: [],
      activity_logs: [],
      settings: {}
    };
    this.load();
  }

  load() {
    try {
      const dbPath = getDbFilePath();
      if (fs.existsSync(dbPath)) {
        const content = fs.readFileSync(dbPath, 'utf8');
        const parsed = JSON.parse(content);
        this.data = { ...this.data, ...parsed };
      }

      // Task 8: Merge bundled git repository users (ONLY seed new missing accounts, NEVER overwrite existing DB passwords!)
      // TODO (ARCHITECTURE NOTE):
      // Current architecture uses JSON file database on Render.com Free Tier without persistent disk volume.
      // Redeploying or restarting free instances may reset local disk files to repository defaults.
      // For long-term production persistence across redeployments, migrate database to PostgreSQL/MySQL (e.g. Render PostgreSQL or Supabase).
      const bundledPath = path.resolve(__dirname, 'angor_portal.json');
      if (fs.existsSync(bundledPath)) {
        try {
          const bundledContent = fs.readFileSync(bundledPath, 'utf8');
          const bundledData = JSON.parse(bundledContent);
          if (bundledData.users && Array.isArray(bundledData.users)) {
            if (!this.data.users) this.data.users = [];
            for (const bu of bundledData.users) {
              const hasUser = this.data.users.find(u => (u.email || '').toLowerCase() === (bu.email || '').toLowerCase());
              if (!hasUser) {
                this.data.users.push(bu);
              }
            }
          }
        } catch (err) {}
      }
    } catch (e) {
      console.error('[DB] Faylni o\'qishda xatolik:', e.message);
    }
  }

  save() {
    try {
      const dbPath = getDbFilePath();
      const dir = path.dirname(dbPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      const tmpPath = dbPath + '.tmp';
      const backupPath = path.join(dir, 'angor_portal.backup.json');
      const jsonStr = JSON.stringify(this.data, null, 2);

      // Atomic write to prevent zero-byte corruptions
      fs.writeFileSync(tmpPath, jsonStr, 'utf8');
      fs.renameSync(tmpPath, dbPath);

      // Automatic backup snapshot
      fs.writeFileSync(backupPath, jsonStr, 'utf8');
    } catch (e) {
      console.error('[DB] Saqlashda xatolik:', e.message);
    }
  }

  nextId(table) {
    const list = this.data[table] || [];
    return list.length ? Math.max(...list.map(x => x.id || 0)) + 1 : 1;
  }

  transaction(fn) {
    return (items) => {
      const res = fn(items);
      this.save();
      return res;
    };
  }

  prepare(sqlStr) {
    const db = this;
    const cleanSql = sqlStr.trim().replace(/\s+/g, ' ');

    return {
      all(...args) {
        // SELECT
        if (/SELECT COUNT\(\*\)/i.test(cleanSql)) {
          const match = cleanSql.match(/FROM\s+([a_z0-9_]+)/i);
          const table = match ? match[1] : 'users';
          return [{ cnt: (db.data[table] || []).length }];
        }

        if (/SELECT \* FROM users/i.test(cleanSql)) {
          if (/WHERE.*email/i.test(cleanSql)) {
            const targetEmail = (args[0] || '').toString().trim().toLowerCase();
            return db.data.users.filter(u => (u.email || '').trim().toLowerCase() === targetEmail);
          }
          if (/WHERE.*id/i.test(cleanSql)) {
            return db.data.users.filter(u => u.id === parseInt(args[0]));
          }
          return db.data.users;
        }

        if (/SELECT \* FROM tasks/i.test(cleanSql)) {
          let list = [...(db.data.tasks || [])];
          if (cleanSql.includes('WHERE assigned_to =')) {
            list = list.filter(t => t.assigned_to === parseInt(args[0]));
          }
          return list.sort((a,b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        }

        if (/SELECT \* FROM clients/i.test(cleanSql)) {
          return [...(db.data.clients || [])].sort((a,b) => (a.name || '').localeCompare(b.name || ''));
        }

        if (/SELECT \* FROM documents/i.test(cleanSql)) {
          let list = [...(db.data.documents || [])];
          if (cleanSql.includes('WHERE category =')) {
            list = list.filter(d => d.category === args[0]);
          }
          return list.sort((a,b) => new Date(b.upload_date || 0) - new Date(a.upload_date || 0));
        }

        if (/SELECT \* FROM warehouse_items/i.test(cleanSql)) {
          return db.data.warehouse_items || [];
        }

        if (/SELECT \* FROM warehouse_txn/i.test(cleanSql)) {
          return [...(db.data.warehouse_txn || [])].sort((a,b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)).slice(0, 20);
        }

        if (/SELECT \* FROM notifications/i.test(cleanSql)) {
          return (db.data.notifications || []).filter(n => n.user_id === parseInt(args[0])).slice(-30).reverse();
        }

        if (/SELECT \* FROM activity_logs/i.test(cleanSql)) {
          return (db.data.activity_logs || []).slice(-50).reverse();
        }

        return [];
      },

      get(...args) {
        if (/SELECT COUNT\(\*\)/i.test(cleanSql)) {
          const match = cleanSql.match(/FROM\s+([a_z0-9_]+)/i);
          const table = match ? match[1] : 'users';
          return { cnt: (db.data[table] || []).length };
        }

        if (/FROM users WHERE.*email/i.test(cleanSql)) {
          const targetEmail = (args[0] || '').toString().trim().toLowerCase();
          return db.data.users.find(u => (u.email || '').trim().toLowerCase() === targetEmail) || null;
        }
        if (/FROM users WHERE.*id/i.test(cleanSql)) {
          return db.data.users.find(u => u.id === parseInt(args[0])) || null;
        }

        if (/FROM tasks WHERE id =/i.test(cleanSql)) {
          return db.data.tasks.find(t => t.id === parseInt(args[0])) || null;
        }

        if (/FROM clients WHERE id =/i.test(cleanSql)) {
          return db.data.clients.find(c => c.id === parseInt(args[0])) || null;
        }

        if (/FROM documents WHERE id =/i.test(cleanSql)) {
          return db.data.documents.find(d => d.id === parseInt(args[0])) || null;
        }

        if (/FROM settings WHERE key =/i.test(cleanSql)) {
          const key = args[0];
          const val = db.data.settings ? db.data.settings[key] : null;
          return val !== undefined && val !== null ? { key, value: val } : null;
        }

        if (/FROM warehouse_items WHERE id =/i.test(cleanSql)) {
          return db.data.warehouse_items.find(w => w.id === parseInt(args[0])) || null;
        }

        return null;
      },

      run(...args) {
        // INSERT INTO users
        if (/INSERT INTO users/i.test(cleanSql)) {
          const u = args[0] && typeof args[0] === 'object' ? args[0] : {
            name: args[0], email: args[1], password: args[2], role: args[3], position: args[4],
            department: args[5], phone: args[6], avatar: args[7], avatar_color: args[8], hire_date: args[9]
          };
          u.id = db.nextId('users');
          u.created_at = new Date().toISOString();
          u.updated_at = new Date().toISOString();
          db.data.users.push(u);
          db.save();
          return { lastInsertRowid: u.id };
        }

        // INSERT INTO tasks
        if (/INSERT INTO tasks/i.test(cleanSql)) {
          const t = args[0] && typeof args[0] === 'object' ? args[0] : {
            title: args[0], description: args[1], assigned_to: parseInt(args[2]), assigned_name: args[3],
            deadline: args[4], priority: args[5], category: args[6], status: 'new', created_by: parseInt(args[7])
          };
          t.id = db.nextId('tasks');
          t.created_at = new Date().toISOString();
          t.updated_at = new Date().toISOString();
          if (t.review_comment === undefined) t.review_comment = null;
          if (t.batch_id === undefined) t.batch_id = null;
          db.data.tasks.push(t);
          db.save();
          return { lastInsertRowid: t.id };
        }

        // INSERT INTO clients
        if (/INSERT INTO clients/i.test(cleanSql)) {
          const c = args[0] && typeof args[0] === 'object' ? args[0] : {
            name: args[0], inn: args[1], country: args[2], city: args[3], contact_person: args[4],
            phone: args[5], email: args[6], contract_number: args[7], ai_risk: args[8], risk_text: args[9], status: 'active', notes: args[10]
          };
          c.id = db.nextId('clients');
          c.created_at = new Date().toISOString();
          db.data.clients.push(c);
          db.save();
          return { lastInsertRowid: c.id };
        }

        // INSERT INTO documents
        if (/INSERT INTO documents/i.test(cleanSql)) {
          const d = args[0] && typeof args[0] === 'object' ? args[0] : {
            title: args[0], category: args[1], version: args[2], file_type: args[3], file_size: args[4],
            file_path: args[5], uploaded_by: parseInt(args[6]), uploaded_name: args[7],
            upload_date: new Date().toISOString().slice(0,10), status: 'active', description: args[8] || '',
            target_user_id: args[9] ? parseInt(args[9]) : null, target_user_name: args[10] || null,
            reply_to_id: args[11] ? parseInt(args[11]) : null, task_id: args[12] ? parseInt(args[12]) : null,
            doc_number: args[13] || null,
            client_id: args[14] ? parseInt(args[14]) : null, client_name: args[15] || null,
            expiry_date: args[16] || null, expiry_notified: false
          };
          d.id = db.nextId('documents');
          d.created_at = new Date().toISOString();
          db.data.documents.push(d);
          db.save();
          return { lastInsertRowid: d.id };
        }

        // INSERT INTO warehouse_items
        if (/INSERT INTO warehouse_items/i.test(cleanSql)) {
          const w = args[0] && typeof args[0] === 'object' ? args[0] : {
            name: args[0], category: args[1], unit: args[2], current_stock: args[3], min_stock: args[4], max_stock: args[5], location: args[6], temperature: args[7], status: args[8]
          };
          w.id = db.nextId('warehouse_items');
          w.updated_at = new Date().toISOString();
          db.data.warehouse_items.push(w);
          db.save();
          return { lastInsertRowid: w.id };
        }

        // INSERT INTO warehouse_txn
        if (/INSERT INTO warehouse_txn/i.test(cleanSql)) {
          const txn = args[0] && typeof args[0] === 'object' ? args[0] : {
            item_id: parseInt(args[0]), item_name: args[1], type: args[2], quantity: parseFloat(args[3]), note: args[4], date: args[5], created_by: parseInt(args[6])
          };
          txn.id = db.nextId('warehouse_txn');
          txn.created_at = new Date().toISOString();
          db.data.warehouse_txn.push(txn);
          db.save();
          return { lastInsertRowid: txn.id };
        }

        // INSERT INTO notifications
        if (/INSERT INTO notifications/i.test(cleanSql)) {
          const n = {
            id: db.nextId('notifications'),
            user_id: parseInt(args[0]),
            title: args[1],
            message: args[2],
            type: args[3] || 'info',
            is_read: 0,
            created_at: new Date().toISOString()
          };
          db.data.notifications.push(n);
          db.save();
          return { lastInsertRowid: n.id };
        }

        // INSERT INTO activity_logs
        if (/INSERT INTO activity_logs/i.test(cleanSql)) {
          const log = {
            id: db.nextId('activity_logs'),
            user_id: parseInt(args[0]),
            user_name: args[1],
            action: args[2],
            model: args[3],
            model_id: parseInt(args[4]),
            description: args[5],
            created_at: new Date().toISOString()
          };
          db.data.activity_logs.push(log);
          db.save();
          return { lastInsertRowid: log.id };
        }

        // INSERT OR REPLACE INTO settings
        if (/INSERT OR REPLACE INTO settings/i.test(cleanSql)) {
          const item = args[0] && typeof args[0] === 'object' ? args[0] : { key: args[0], value: args[1] };
          db.data.settings[item.key] = item.value;
          db.save();
          return {};
        }

        // UPDATE tasks
        if (/UPDATE tasks SET/i.test(cleanSql)) {
          const id = parseInt(args[args.length - 1]);
          const task = db.data.tasks.find(t => t.id === id);
          if (task) {
            try {
              const setPart = cleanSql.substring(cleanSql.search(/SET/i) + 3, cleanSql.search(/WHERE/i)).trim();
              const assignments = setPart.split(',').map(s => s.trim().split('=')[0].trim());
              assignments.forEach((colName, idx) => {
                if (idx < args.length - 1 && colName) {
                  const val = args[idx];
                  task[colName] = val;
                  if (colName === 'assigned_to') task.assignedTo = parseInt(val);
                  if (colName === 'assigned_name') task.assignedName = val;
                }
              });
            } catch (e) {
              if (cleanSql.includes('status = ?')) task.status = args[0];
            }
            task.updated_at = new Date().toISOString();
            db.save();
          }
          return {};
        }

        // UPDATE clients
        if (/UPDATE clients SET/i.test(cleanSql)) {
          const id = parseInt(args[args.length - 1]);
          const client = db.data.clients.find(c => c.id === id);
          if (client) {
            client.updated_at = new Date().toISOString();
            db.save();
          }
          return {};
        }

        // UPDATE users
        if (/UPDATE users SET/i.test(cleanSql)) {
          const target = args[args.length - 1];
          const user = db.data.users.find(u => u.id === parseInt(target) || (typeof target === 'string' && (u.email || '').toLowerCase() === target.toLowerCase()));
          if (user) {
            try {
              const setPart = cleanSql.substring(cleanSql.search(/SET/i) + 3, cleanSql.search(/WHERE/i)).trim();
              const assignments = setPart.split(',').map(s => s.trim().split('=')[0].trim());
              assignments.forEach((colName, idx) => {
                if (idx < args.length - 1 && colName) {
                  const val = args[idx];
                  user[colName] = val;
                  if (colName === 'telegram_chat_id') user.chat_id = val;
                  if (colName === 'chat_id') user.telegram_chat_id = val;
                  if (colName === 'avatar_color') user.avatarColor = val;
                  if (colName === 'hire_date') user.hireDate = val;
                }
              });
            } catch (e) {
              if (cleanSql.includes('password =')) user.password = args[0];
            }
            user.updated_at = new Date().toISOString();
            db.save();
          }
          return {};
        }

        // UPDATE warehouse_items
        if (/UPDATE warehouse_items SET/i.test(cleanSql)) {
          const id = parseInt(args[2]);
          const item = db.data.warehouse_items.find(w => w.id === id);
          if (item) {
            item.current_stock = parseFloat(args[0]);
            item.status = args[1];
            item.updated_at = new Date().toISOString();
            db.save();
          }
          return {};
        }

        // UPDATE notifications SET is_read = 1
        if (/UPDATE notifications SET is_read = 1/i.test(cleanSql)) {
          if (cleanSql.includes('WHERE id =')) {
            const notif = db.data.notifications.find(n => n.id === parseInt(args[0]));
            if (notif) notif.is_read = 1;
          } else {
            const userId = parseInt(args[0]);
            db.data.notifications.forEach(n => { if (n.user_id === userId) n.is_read = 1; });
          }
          db.save();
          return {};
        }

        // UPDATE documents SET expiry_notified
        if (/UPDATE documents SET expiry_notified/i.test(cleanSql)) {
          const id = parseInt(args[1]);
          const doc = db.data.documents.find(d => d.id === id);
          if (doc) {
            doc.expiry_notified = args[0] ? true : false;
            db.save();
          }
          return {};
        }

        // DELETE FROM
        if (/DELETE FROM tasks WHERE id =/i.test(cleanSql)) {
          const id = parseInt(args[0]);
          db.data.tasks = db.data.tasks.filter(t => t.id !== id);
          db.save();
          return {};
        }

        if (/DELETE FROM clients WHERE id =/i.test(cleanSql)) {
          const id = parseInt(args[0]);
          db.data.clients = db.data.clients.filter(c => c.id !== id);
          db.save();
          return {};
        }

        if (/DELETE FROM documents WHERE id =/i.test(cleanSql)) {
          const id = parseInt(args[0]);
          db.data.documents = db.data.documents.filter(d => d.id !== id);
          db.save();
          return {};
        }

        if (/DELETE FROM users WHERE id =/i.test(cleanSql)) {
          const id = parseInt(args[0]);
          db.data.users = db.data.users.filter(u => u.id !== id);
          db.save();
          return {};
        }

        return {};
      }
    };
  }
}

const db = new DatabaseEngine();
module.exports = db;
