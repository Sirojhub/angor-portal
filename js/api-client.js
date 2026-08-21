// ============================================================
// ANGOR AGRO STAR PORTAL — Node.js / Express API Client Layer
// ============================================================

const API = {
  baseUrl: '/api',
  useBackend: true,

  async request(endpoint, method = 'GET', data = null) {
    if (!this.useBackend) return null;
    try {
      const headers = { 'Content-Type': 'application/json' };
      const token = localStorage.getItem('ags_token') || sessionStorage.getItem('ags_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const options = { method, headers };
      if (data && method !== 'GET') {
        options.body = JSON.stringify(data);
      }

      const res = await fetch(`${this.baseUrl}/${endpoint}`, options);
      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson.error || `HTTP ${res.status}`);
      }
      return await res.json();
    } catch (e) {
      console.warn(`[API] ${endpoint} ga ulanishda xato:`, e.message);
      return null;
    }
  },

  // Auth API
  async login(email, password) {
    const res = await this.request('auth/login', 'POST', { email, password });
    if (res && res.token) {
      localStorage.setItem('ags_token', res.token);
      localStorage.setItem('ags_user', JSON.stringify(res.user));
    }
    return res;
  },

  async getMe() {
    return await this.request('auth/me');
  },

  // Tasks API
  async getTasks(status = 'all') {
    return await this.request(`tasks?status=${status}`);
  },
  async createTask(taskData) {
    return await this.request('tasks', 'POST', taskData);
  },
  async updateTask(id, changes) {
    return await this.request(`tasks/${id}`, 'PUT', changes);
  },
  async deleteTask(id) {
    return await this.request(`tasks/${id}`, 'DELETE');
  },

  // Documents API
  async getDocs(category = 'all') {
    return await this.request(`documents?category=${category}`);
  },
  async createDoc(docDataOrFormData) {
    if (!this.useBackend) return null;
    try {
      const token = localStorage.getItem('ags_token') || sessionStorage.getItem('ags_token');
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      let options = { method: 'POST', headers };

      if (typeof FormData !== 'undefined' && docDataOrFormData instanceof FormData) {
        options.body = docDataOrFormData;
      } else {
        headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(docDataOrFormData);
      }

      const res = await fetch(`${this.baseUrl}/documents`, options);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP ${res.status}`);
      }
      return await res.json();
    } catch (e) {
      console.warn('[API] Hujjat saqlashda xato:', e.message);
      return null;
    }
  },
  async deleteDoc(id) {
    return await this.request(`documents/${id}`, 'DELETE');
  },

  // Clients API
  async getClients() {
    return await this.request('clients');
  },
  async createClient(clientData) {
    return await this.request('clients', 'POST', clientData);
  },
  async updateClient(id, clientData) {
    return await this.request(`clients/${id}`, 'PUT', clientData);
  },
  async deleteClient(id) {
    return await this.request(`clients/${id}`, 'DELETE');
  },

  // Warehouse API
  async getWarehouse() {
    return await this.request('warehouse');
  },
  async addWarehouseTxn(txnData) {
    return await this.request('warehouse/txn', 'POST', txnData);
  },

  // Employees API
  async getEmployees() {
    return await this.request('employees');
  },
  async createEmployee(empData) {
    return await this.request('employees', 'POST', empData);
  },
  async updateEmployee(id, empData) {
    return await this.request(`employees/${id}`, 'PUT', empData);
  },
  async deleteEmployee(id) {
    return await this.request(`employees/${id}`, 'DELETE');
  },

  // Notifications
  async getNotifications() {
    return await this.request('notifications');
  },
  async markNotificationRead(id) {
    return await this.request(`notifications/${id}/read`, 'PUT');
  },

  // Logs
  async getLogs() {
    return await this.request('logs');
  }
};
