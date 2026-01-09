import React, { useState, useEffect, useMemo } from 'react';
import { Session } from '@supabase/supabase-js';
import { 
  Transaction, 
  TransactionType, 
  Debt, 
  DebtType, 
  FinancialStats 
} from './types';
import { CATEGORIES, ICONS } from './constants';
import { supabaseClient } from './services/supabaseClient';
import { supabase } from './services/supabaseService';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from 'recharts';

// --- Componentes Atómicos ---

const StatCard: React.FC<{
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
  onClick?: () => void;
}> = ({ title, value, subtitle, icon, color, onClick }) => {
  const content = (
    <>
      <div className={`p-3.5 rounded-2xl ${color}`}>
        {icon}
      </div>
      <div className="overflow-hidden">
        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.15em] mb-1">{title}</p>
        <h3 className="text-2xl font-black text-slate-800 truncate leading-tight">{value}</h3>
        {subtitle && <p className="text-[10px] text-slate-400 mt-1 font-medium truncate">{subtitle}</p>}
      </div>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="w-full text-left bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 flex items-start gap-4 transition-all hover:shadow-md hover:-translate-y-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
      >
        {content}
      </button>
    );
  }

  return (
    <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 flex items-start gap-4 transition-all hover:shadow-md hover:-translate-y-1">
      {content}
    </div>
  );
};

// --- Componente Principal ---

type TabType = 'dashboard' | 'income' | 'expenses' | 'debts' | 'config';
type CurrencyType = 'COP' | 'USD' | 'EUR';

const App: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [showModal, setShowModal] = useState<'transaction' | 'debt' | 'payment' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedDebtId, setSelectedDebtId] = useState<string | null>(null);
  const [currency, setCurrency] = useState<CurrencyType>('USD');
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);
  const [loginData, setLoginData] = useState({ email: '', password: '' });

  // Form states
  const [formData, setFormData] = useState({
    amount: '',
    type: TransactionType.EXPENSE,
    category: CATEGORIES.EXPENSE[0],
    note: '',
    person: '',
    debtType: DebtType.OWED_BY_ME,
    paymentAmount: ''
  });

  useEffect(() => {
    let isMounted = true;
    supabaseClient.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      setSession(data.session);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthLoading(false);
    });
    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const fetchData = async () => {
    if (!session) return;
    setIsLoading(true);
    try {
      const [txData, debtData] = await Promise.all([
        supabase.getTransactions(),
        supabase.getDebts()
      ]);
      
      setTransactions(txData);
      setDebts(debtData.map((d: any) => ({
        ...d,
        paidAmount: Number(d.paid_amount || 0),
        isPaid: !!d.is_paid
      })));
    } catch (error) {
      console.error('Error de conexión:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const savedCurrency = localStorage.getItem('ff_currency');
    if (savedCurrency) setCurrency(savedCurrency as CurrencyType);
  }, []);

  useEffect(() => {
    if (!session) {
      setTransactions([]);
      setDebts([]);
      setIsLoading(false);
      return;
    }
    fetchData();
  }, [session]);

  const currencySymbol = useMemo(() => {
    switch (currency) {
      case 'COP': return '$';
      case 'EUR': return '€';
      default: return '$';
    }
  }, [currency]);

  const formatValue = (val: number) => {
    const formatted = val.toLocaleString(undefined, { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
    return `${currencySymbol}${formatted}${currency === 'COP' ? ' COP' : ''}`;
  };

  const stats: FinancialStats = useMemo(() => {
    const income = transactions.filter(t => t.type === TransactionType.INCOME).reduce((sum, t) => sum + Number(t.amount), 0);
    const expenses = transactions.filter(t => t.type === TransactionType.EXPENSE).reduce((sum, t) => sum + Number(t.amount), 0);
    const toPay = debts.filter(d => d.type === DebtType.OWED_BY_ME && !d.isPaid).reduce((sum, d) => sum + (Number(d.amount) - Number(d.paidAmount || 0)), 0);
    const toReceive = debts.filter(d => d.type === DebtType.OWED_TO_ME && !d.isPaid).reduce((sum, d) => sum + (Number(d.amount) - Number(d.paidAmount || 0)), 0);

    return { totalBalance: income - expenses, totalIncome: income, totalExpenses: expenses, totalDebtToPay: toPay, totalDebtToReceive: toReceive };
  }, [transactions, debts]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsAuthSubmitting(true);
    const { error } = await supabaseClient.auth.signInWithPassword({
      email: loginData.email,
      password: loginData.password
    });
    if (error) {
      setAuthError(error.message);
    }
    setIsAuthSubmitting(false);
  };

  const handleLogout = async () => {
    await supabaseClient.auth.signOut();
    setTransactions([]);
    setDebts([]);
    setActiveTab('dashboard');
  };

  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(formData.amount);
    if (isNaN(amountNum)) return;

    try {
      const payload = {
        amount: amountNum,
        type: formData.type,
        category: formData.category,
        note: formData.note,
        date: new Date().toISOString()
      };

      if (editingId) {
        await supabase.updateTransaction(editingId, payload);
        setTransactions(prev => prev.map(t => t.id === editingId ? { ...t, ...payload } : t));
      } else {
        const newTx = await supabase.createTransaction(payload);
        setTransactions(prev => [newTx, ...prev]);
      }
      closeModals();
    } catch (err) {
      alert("Error al guardar.");
    }
  };

  const handleSaveDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(formData.amount);
    if (isNaN(amountNum)) return;

    try {
      const payload = {
        amount: amountNum,
        person: formData.person,
        type: formData.debtType,
        note: formData.note,
        is_paid: false,
        paid_amount: 0
      };

      if (editingId) {
        await supabase.updateDebt(editingId, payload);
        setDebts(prev => prev.map(d => d.id === editingId ? { ...d, ...payload, paidAmount: payload.paid_amount, isPaid: payload.is_paid } : d));
      } else {
        const newDebt = await supabase.createDebt(payload);
        setDebts(prev => [{ ...newDebt, paidAmount: 0, isPaid: false }, ...prev]);
      }
      closeModals();
    } catch (err) {
      alert("Error al guardar deuda.");
    }
  };

  const handlePartialPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDebtId) return;
    const payVal = parseFloat(formData.paymentAmount);
    if (isNaN(payVal) || payVal <= 0) return;

    try {
      const debt = debts.find(d => d.id === selectedDebtId);
      if (!debt) return;

      const newPaid = Number(debt.paidAmount || 0) + payVal;
      const fullyPaid = newPaid >= Number(debt.amount);
      
      await supabase.updateDebt(selectedDebtId, { 
        paid_amount: fullyPaid ? debt.amount : newPaid,
        is_paid: fullyPaid
      });

      const txPayload = {
        amount: payVal,
        type: debt.type === DebtType.OWED_BY_ME ? TransactionType.EXPENSE : TransactionType.INCOME,
        category: 'Pagos/Cobros',
        note: `Abono de: ${debt.person}`,
        date: new Date().toISOString()
      };
      const newTx = await supabase.createTransaction(txPayload);

      setDebts(prev => prev.map(d => d.id === selectedDebtId ? { ...d, paidAmount: fullyPaid ? d.amount : newPaid, isPaid: fullyPaid } : d));
      setTransactions(prev => [newTx, ...prev]);
      closeModals();
    } catch (err) {
      alert("Error al procesar.");
    }
  };

  const deleteTransaction = async (id: string) => {
    if (!window.confirm('¿Eliminar registro?')) return;
    try {
      await supabase.deleteTransaction(id);
      setTransactions(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      alert("Error al eliminar.");
    }
  };

  const deleteDebt = async (id: string) => {
    if (!window.confirm('¿Eliminar deuda?')) return;
    try {
      await supabase.deleteDebt(id);
      setDebts(prev => prev.filter(d => d.id !== id));
    } catch (err) {
      alert("Error al eliminar.");
    }
  };

  const closeModals = () => {
    setShowModal(null);
    setEditingId(null);
    setSelectedDebtId(null);
    setFormData({ amount: '', type: TransactionType.EXPENSE, category: CATEGORIES.EXPENSE[0], note: '', person: '', debtType: DebtType.OWED_BY_ME, paymentAmount: '' });
  };

  const startEditTransaction = (tx: Transaction) => {
    setEditingId(tx.id);
    setFormData({ ...formData, amount: tx.amount.toString(), type: tx.type, category: tx.category, note: tx.note });
    setShowModal('transaction');
  };

  const startEditDebt = (debt: Debt) => {
    setEditingId(debt.id);
    setFormData({ ...formData, amount: debt.amount.toString(), debtType: debt.type, person: debt.person, note: debt.note });
    setShowModal('debt');
  };

  const renderTransactionsSection = (type: TransactionType) => {
    const filtered = transactions.filter(t => t.type === type);
    return (
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/20">
          <div>
            <h3 className="text-xl font-black text-slate-800">{type === TransactionType.INCOME ? 'Mis Ingresos' : 'Mis Gastos'}</h3>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Historial en la nube</p>
          </div>
          <button 
            onClick={() => { setFormData({ ...formData, type, category: type === TransactionType.INCOME ? CATEGORIES.INCOME[0] : CATEGORIES.EXPENSE[0] }); setShowModal('transaction'); }}
            className="bg-indigo-600 text-white px-6 py-3 rounded-2xl text-sm font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center gap-2"
          >
            <ICONS.Plus /> Nuevo
          </button>
        </div>
        <div className="divide-y divide-slate-50">
          {filtered.length === 0 ? (
            <div className="p-24 text-center text-slate-300 flex flex-col items-center">
              <div className="w-12 h-12 mb-4 opacity-20"><ICONS.History /></div>
              <p className="font-black text-slate-400 uppercase tracking-widest text-[10px]">Sin movimientos registrados</p>
            </div>
          ) : (
            filtered.map(tx => (
              <div key={tx.id} className="p-6 hover:bg-slate-50/50 transition-all flex justify-between items-center group">
                <div className="flex items-center gap-5">
                  <div className={`p-4 rounded-2xl ${tx.type === TransactionType.INCOME ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    {tx.type === TransactionType.INCOME ? <ICONS.TrendUp /> : <ICONS.TrendDown />}
                  </div>
                  <div>
                    <p className="font-black text-slate-800">{tx.category}</p>
                    <p className="text-sm text-slate-400 font-medium">{tx.note || 'Sin detalles'}</p>
                    <p className="text-[10px] text-slate-300 mt-1 font-black uppercase tracking-widest">{new Date(tx.date).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-8">
                  <p className={`font-black text-xl ${tx.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-slate-800'}`}>
                    {tx.type === TransactionType.INCOME ? '+' : '-'}{formatValue(Number(tx.amount))}
                  </p>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => startEditTransaction(tx)} className="p-2 text-slate-300 hover:text-indigo-600 transition-colors"><ICONS.Edit /></button>
                    <button onClick={() => deleteTransaction(tx.id)} className="p-2 text-slate-300 hover:text-rose-600 transition-colors"><ICONS.Trash /></button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  const chartData = useMemo(() => [
    { name: 'Ingresos', value: stats.totalIncome, color: '#10b981' },
    { name: 'Gastos', value: stats.totalExpenses, color: '#ef4444' }
  ], [stats]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fcfdfe]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin"></div>
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em]">Cargando sesion</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex flex-col bg-[#fcfdfe]">
        <header className="sticky top-0 z-[60] bg-white/80 backdrop-blur-2xl border-b border-slate-100">
          <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-100">
                <ICONS.Wallet />
              </div>
              <div>
                <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none mb-1">FinanceFlow</h1>
                <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em]">Acceso privado</p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8">
            <div className="mb-8">
              <h2 className="text-2xl font-black text-slate-900">Iniciar sesion</h2>
              <p className="text-sm text-slate-400 font-medium mt-2">Ingresa con tu usuario y contrasena.</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Usuario</label>
                <input
                  type="email"
                  autoComplete="username"
                  value={loginData.email}
                  onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                  className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-800 focus:ring-2 focus:ring-indigo-600 outline-none"
                  placeholder="usuario@dominio.com"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Contrasena</label>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={loginData.password}
                  onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                  className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-800 focus:ring-2 focus:ring-indigo-600 outline-none"
                  placeholder="********"
                  required
                />
              </div>
              {authError && (
                <p className="text-xs text-rose-500 font-bold">{authError}</p>
              )}
              <button
                type="submit"
                disabled={isAuthSubmitting}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isAuthSubmitting ? 'Ingresando...' : 'Ingresar'}
              </button>
            </form>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#fcfdfe]">
      <header className="sticky top-0 z-[60] bg-white/80 backdrop-blur-2xl border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="w-11 h-11 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-100">
              <ICONS.Wallet />
            </div>
            <div>
              <h1
                className="text-xl font-black text-slate-900 tracking-tight leading-none mb-1"
                onClick={(event) => {
                  event.stopPropagation();
                  setActiveTab('dashboard');
                }}
              >
                FinanceFlow
              </h1>
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'}`}></div>
                <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em]">{isLoading ? 'Sincronizando' : 'Nube Conectada'}</p>
              </div>
            </div>
          </div>

          <nav className="hidden lg:flex items-center bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: <ICONS.Wallet /> },
              { id: 'income', label: 'Ingresos', icon: <ICONS.TrendUp /> },
              { id: 'expenses', label: 'Gastos', icon: <ICONS.TrendDown /> },
              { id: 'debts', label: 'Deudas', icon: <ICONS.Debt /> },
            ].map((item) => (
              <button 
                key={item.id}
                onClick={() => setActiveTab(item.id as TabType)}
                className={`flex items-center gap-2.5 px-6 py-2.5 rounded-xl transition-all font-black text-xs uppercase tracking-widest ${activeTab === item.id ? 'bg-white text-indigo-600 shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <button onClick={() => setActiveTab('config')} className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-slate-400 hover:text-indigo-600 transition-colors">
              <ICONS.Settings />
            </button>
            <button onClick={handleLogout} className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-2xl text-slate-400 hover:text-rose-600 font-black text-xs uppercase tracking-widest transition-colors">
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-12">
        {isLoading && activeTab === 'dashboard' && transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-48">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 bg-indigo-50 rounded-full animate-pulse"></div>
              </div>
            </div>
            <p className="mt-6 text-slate-400 font-black text-[10px] tracking-[0.3em] uppercase">Estableciendo conexión segura</p>
          </div>
        ) : (
          <div className="animate-fade-in space-y-12">
            {activeTab === 'dashboard' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatCard title="Tu Balance" value={formatValue(stats.totalBalance)} icon={<ICONS.Wallet />} color="bg-indigo-600 text-white shadow-xl shadow-indigo-100" />
                  <StatCard title="Ingresos" value={formatValue(stats.totalIncome)} icon={<ICONS.TrendUp />} color="bg-emerald-50 text-emerald-600" onClick={() => setActiveTab('income')} />
                  <StatCard title="Gastos" value={formatValue(stats.totalExpenses)} icon={<ICONS.TrendDown />} color="bg-rose-50 text-rose-600" onClick={() => setActiveTab('expenses')} />
                  <StatCard title="Deudas" value={formatValue(stats.totalDebtToPay)} icon={<ICONS.Debt />} color="bg-amber-50 text-amber-600" onClick={() => setActiveTab('debts')} />
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-center mb-8">
                      <div>
                        <h3 className="text-xl font-black text-slate-800">Análisis Mensual</h3>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Comparativa Ingresos vs Gastos</p>
                      </div>
                    </div>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 700}} />
                          <YAxis hide />
                          <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)'}} />
                          <Bar dataKey="value" radius={[12, 12, 12, 12]} barSize={60}>
                            {chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center">
                    <h3 className="text-xl font-black text-slate-800 mb-2">Distribución</h3>
                    <div className="h-[200px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={chartData}
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-4 space-y-2 w-full">
                      <div className="flex justify-between items-center text-sm font-bold">
                        <span className="text-emerald-500">Ingresos</span>
                        <span className="text-slate-800">{stats.totalIncome > 0 ? ((stats.totalIncome / (stats.totalIncome + stats.totalExpenses)) * 100).toFixed(0) : 0}%</span>
                      </div>
                      <div className="flex justify-between items-center text-sm font-bold">
                        <span className="text-rose-500">Gastos</span>
                        <span className="text-slate-800">{stats.totalExpenses > 0 ? ((stats.totalExpenses / (stats.totalIncome + stats.totalExpenses)) * 100).toFixed(0) : 0}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'income' && renderTransactionsSection(TransactionType.INCOME)}
            {activeTab === 'expenses' && renderTransactionsSection(TransactionType.EXPENSE)}

            {activeTab === 'debts' && (
              <div className="space-y-8">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Mis Deudas</h2>
                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em] mt-1">Control de préstamos y cobros</p>
                  </div>
                  <button 
                    onClick={() => { setFormData({ ...formData, debtType: DebtType.OWED_BY_ME }); setShowModal('debt'); }}
                    className="bg-indigo-600 text-white px-8 py-4 rounded-2xl text-sm font-black hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center gap-2"
                  >
                    <ICONS.Plus /> Nueva Deuda
                  </button>
                </div>

                <div className="grid lg:grid-cols-2 gap-8">
                  {/* Deudas por Pagar */}
                  <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-8 border-b border-rose-50 bg-rose-50/20">
                      <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                        <span className="text-rose-500"><ICONS.TrendDown /></span> Debo pagar
                      </h3>
                    </div>
                    <div className="divide-y divide-slate-50">
                      {debts.filter(d => d.type === DebtType.OWED_BY_ME).length === 0 ? (
                        <p className="p-12 text-center text-slate-300 font-bold text-xs uppercase tracking-widest">Sin deudas pendientes</p>
                      ) : (
                        debts.filter(d => d.type === DebtType.OWED_BY_ME).map(debt => (
                          <div key={debt.id} className={`p-6 hover:bg-slate-50/50 transition-all flex justify-between items-center group ${debt.isPaid ? 'opacity-50' : ''}`}>
                            <div className="flex items-center gap-4">
                              <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
                                <ICONS.Debt />
                              </div>
                              <div>
                                <p className="font-black text-slate-800">{debt.person}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-rose-500" 
                                      style={{ width: `${(debt.paidAmount / debt.amount) * 100}%` }}
                                    ></div>
                                  </div>
                                  <p className="text-[10px] text-slate-400 font-black uppercase">{((debt.paidAmount / debt.amount) * 100).toFixed(0)}%</p>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-6">
                              <div className="text-right">
                                <p className="font-black text-slate-800">{formatValue(debt.amount - debt.paidAmount)}</p>
                                <p className="text-[10px] text-slate-300 font-black uppercase">Faltante</p>
                              </div>
                              <div className="flex gap-1">
                                {!debt.isPaid && (
                                  <button onClick={() => { setSelectedDebtId(debt.id); setShowModal('payment'); }} className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg"><ICONS.Pay /></button>
                                )}
                                <button onClick={() => startEditDebt(debt)} className="p-2 text-slate-300 hover:text-indigo-600"><ICONS.Edit /></button>
                                <button onClick={() => deleteDebt(debt.id)} className="p-2 text-slate-300 hover:text-rose-600"><ICONS.Trash /></button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Deudas por Cobrar */}
                  <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-8 border-b border-emerald-50 bg-emerald-50/20">
                      <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                        <span className="text-emerald-500"><ICONS.TrendUp /></span> Me deben
                      </h3>
                    </div>
                    <div className="divide-y divide-slate-50">
                      {debts.filter(d => d.type === DebtType.OWED_TO_ME).length === 0 ? (
                        <p className="p-12 text-center text-slate-300 font-bold text-xs uppercase tracking-widest">Nadie me debe nada</p>
                      ) : (
                        debts.filter(d => d.type === DebtType.OWED_TO_ME).map(debt => (
                          <div key={debt.id} className={`p-6 hover:bg-slate-50/50 transition-all flex justify-between items-center group ${debt.isPaid ? 'opacity-50' : ''}`}>
                            <div className="flex items-center gap-4">
                              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                                <ICONS.Wallet />
                              </div>
                              <div>
                                <p className="font-black text-slate-800">{debt.person}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-emerald-500" 
                                      style={{ width: `${(debt.paidAmount / debt.amount) * 100}%` }}
                                    ></div>
                                  </div>
                                  <p className="text-[10px] text-slate-400 font-black uppercase">{((debt.paidAmount / debt.amount) * 100).toFixed(0)}%</p>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-6">
                              <div className="text-right">
                                <p className="font-black text-emerald-600">{formatValue(debt.amount - debt.paidAmount)}</p>
                                <p className="text-[10px] text-slate-300 font-black uppercase">Pendiente</p>
                              </div>
                              <div className="flex gap-1">
                                {!debt.isPaid && (
                                  <button onClick={() => { setSelectedDebtId(debt.id); setShowModal('payment'); }} className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg"><ICONS.Pay /></button>
                                )}
                                <button onClick={() => startEditDebt(debt)} className="p-2 text-slate-300 hover:text-indigo-600"><ICONS.Edit /></button>
                                <button onClick={() => deleteDebt(debt.id)} className="p-2 text-slate-300 hover:text-rose-600"><ICONS.Trash /></button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'config' && (
              <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Configuración</h2>
                <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm space-y-8">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Moneda Principal</label>
                    <div className="grid grid-cols-3 gap-4">
                      {['USD', 'COP', 'EUR'].map((curr) => (
                        <button 
                          key={curr}
                          onClick={() => { setCurrency(curr as CurrencyType); localStorage.setItem('ff_currency', curr); }}
                          className={`py-6 rounded-2xl font-black transition-all border-2 ${currency === curr ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-50 bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                        >
                          {curr}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-8 border-t border-slate-100">
                    <p className="text-sm text-slate-500 font-medium">FinanceFlow está conectado directamente a tu base de datos de Supabase. Todos los cambios se guardan en tiempo real.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* --- Modales --- */}

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center">
              <h3 className="text-2xl font-black text-slate-800">
                {showModal === 'transaction' ? (editingId ? 'Editar Movimiento' : 'Nuevo Movimiento') : 
                 showModal === 'debt' ? (editingId ? 'Editar Deuda' : 'Nueva Deuda') : 'Registrar Pago'}
              </h3>
              <button onClick={closeModals} className="p-2 text-slate-300 hover:text-slate-600 transition-colors"><ICONS.Trash /></button>
            </div>

            <form onSubmit={showModal === 'transaction' ? handleSaveTransaction : showModal === 'debt' ? handleSaveDebt : handlePartialPayment} className="p-8 space-y-6">
              {showModal === 'transaction' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <button type="button" onClick={() => setFormData({ ...formData, type: TransactionType.INCOME, category: CATEGORIES.INCOME[0] })} className={`py-4 rounded-2xl font-black text-sm transition-all border-2 ${formData.type === TransactionType.INCOME ? 'border-emerald-500 bg-emerald-50 text-emerald-600' : 'border-slate-50 bg-slate-50 text-slate-400'}`}>Ingreso</button>
                    <button type="button" onClick={() => setFormData({ ...formData, type: TransactionType.EXPENSE, category: CATEGORIES.EXPENSE[0] })} className={`py-4 rounded-2xl font-black text-sm transition-all border-2 ${formData.type === TransactionType.EXPENSE ? 'border-rose-500 bg-rose-50 text-rose-600' : 'border-slate-50 bg-slate-50 text-slate-400'}`}>Gasto</button>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Categoría</label>
                    <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-800 focus:ring-2 focus:ring-indigo-600 outline-none">
                      {(formData.type === TransactionType.INCOME ? CATEGORIES.INCOME : CATEGORIES.EXPENSE).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </>
              )}

              {showModal === 'debt' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <button type="button" onClick={() => setFormData({ ...formData, debtType: DebtType.OWED_BY_ME })} className={`py-4 rounded-2xl font-black text-sm transition-all border-2 ${formData.debtType === DebtType.OWED_BY_ME ? 'border-rose-500 bg-rose-50 text-rose-600' : 'border-slate-50 bg-slate-50 text-slate-400'}`}>Debo pagar</button>
                    <button type="button" onClick={() => setFormData({ ...formData, debtType: DebtType.OWED_TO_ME })} className={`py-4 rounded-2xl font-black text-sm transition-all border-2 ${formData.debtType === DebtType.OWED_TO_ME ? 'border-emerald-500 bg-emerald-50 text-emerald-600' : 'border-slate-50 bg-slate-50 text-slate-400'}`}>Me deben</button>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Persona / Institución</label>
                    <input type="text" value={formData.person} onChange={(e) => setFormData({ ...formData, person: e.target.value })} placeholder="Ej. Banco, Juan Pérez" className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-800 focus:ring-2 focus:ring-indigo-600 outline-none" required />
                  </div>
                </>
              )}

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{showModal === 'payment' ? 'Monto del Abono' : 'Monto Total'}</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black">{currencySymbol}</span>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={showModal === 'payment' ? formData.paymentAmount : formData.amount} 
                    onChange={(e) => setFormData({ ...formData, [showModal === 'payment' ? 'paymentAmount' : 'amount']: e.target.value })} 
                    className="w-full p-4 pl-10 bg-slate-50 border-none rounded-2xl font-black text-2xl text-slate-800 focus:ring-2 focus:ring-indigo-600 outline-none" 
                    placeholder="0.00" 
                    required 
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nota (Opcional)</label>
                <input type="text" value={formData.note} onChange={(e) => setFormData({ ...formData, note: e.target.value })} placeholder="Añadir detalle..." className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-800 focus:ring-2 focus:ring-indigo-600 outline-none" />
              </div>

              <div className="pt-4 flex gap-4">
                <button type="button" onClick={closeModals} className="flex-1 py-4 bg-slate-50 text-slate-400 rounded-2xl font-black hover:bg-slate-100 transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
