
export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE'
}

export enum DebtType {
  OWED_TO_ME = 'OWED_TO_ME', // Someone owes me money
  OWED_BY_ME = 'OWED_BY_ME'  // I owe money to someone
}

export interface Transaction {
  id: string;
  user_id?: string;
  amount: number;
  type: TransactionType;
  category: string;
  date: string;
  note: string;
}

export interface Debt {
  id: string;
  user_id?: string;
  person: string;
  amount: number;
  paidAmount: number; // Added to support partial payments
  type: DebtType;
  dueDate?: string;
  note: string;
  isPaid: boolean;
}

export interface FinancialStats {
  totalBalance: number;
  totalIncome: number;
  totalExpenses: number;
  totalDebtToPay: number;
  totalDebtToReceive: number;
}
