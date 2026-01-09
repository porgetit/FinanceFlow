
const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const headers = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

export const supabase = {
  // --- Transacciones ---
  async getTransactions() {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/transactions?order=date.desc`, { headers });
    if (!res.ok) throw new Error('Error al obtener transacciones');
    return res.json();
  },

  async createTransaction(data: any) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/transactions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });
    const result = await res.json();
    return result[0];
  },

  async updateTransaction(id: string, data: any) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/transactions?id=eq.${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async deleteTransaction(id: string) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/transactions?id=eq.${id}`, {
      method: 'DELETE',
      headers
    });
    if (!res.ok) throw new Error('Error al eliminar');
    return true;
  },

  // --- Deudas ---
  async getDebts() {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/debts?order=created_at.desc`, { headers });
    if (!res.ok) throw new Error('Error al obtener deudas');
    return res.json();
  },

  async createDebt(data: any) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/debts`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });
    const result = await res.json();
    return result[0];
  },

  async updateDebt(id: string, data: any) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/debts?id=eq.${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(data)
    });
    const result = await res.json();
    return result[0];
  },

  async deleteDebt(id: string) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/debts?id=eq.${id}`, {
      method: 'DELETE',
      headers
    });
    if (!res.ok) throw new Error('Error al eliminar');
    return true;
  }
};
