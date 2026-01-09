import { supabaseClient } from './supabaseClient';

export const supabase = {
  // --- Transacciones ---
  async getTransactions() {
    const { data, error } = await supabaseClient
      .from('transactions')
      .select('*')
      .order('date', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async createTransaction(payload: any) {
    const { data, error } = await supabaseClient
      .from('transactions')
      .insert(payload)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  },

  async updateTransaction(id: string, payload: any) {
    const { data, error } = await supabaseClient
      .from('transactions')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  },

  async deleteTransaction(id: string) {
    const { error } = await supabaseClient
      .from('transactions')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  },

  // --- Deudas ---
  async getDebts() {
    const { data, error } = await supabaseClient
      .from('debts')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async createDebt(payload: any) {
    const { data, error } = await supabaseClient
      .from('debts')
      .insert(payload)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  },

  async updateDebt(id: string, payload: any) {
    const { data, error } = await supabaseClient
      .from('debts')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  },

  async deleteDebt(id: string) {
    const { error } = await supabaseClient
      .from('debts')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  }
};
