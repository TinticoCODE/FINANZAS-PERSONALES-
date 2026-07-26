export type TransactionType = "INCOME" | "EXPENSE" | "PAYMENT_TO_CARD";

export type StatCardData = {
  id: string;
  title: string;
  value: number;
  previousValue: number;
  icon: string;
  color: string;
  gradient: string;
  /** Si es falso, oculta la fila de variación del mes en curso. */
  showComparison?: boolean;
  comparisonLabel?: string;
};

export type Transaction = {
  id: string;
  date: string;
  amount: number;
  type: TransactionType;
  category: string;
  categoryColor: string;
  account: string;
  paymentMethod: string;
  description: string;
  tags: string[];
  installments?: number;
  currentInstallment?: number;
  isInstallments?: boolean;
  installmentAmount?: number;
  hasZeroInterest?: boolean;
  creditCardId?: string;
  fundSource: string;
};

export type CreditCardData = {
  id: string;
  bank: string;
  name: string;
  lastFourDigits: string;
  creditLimit: number;
  usedBalance: number;
  interestRate: number;
  cutOffDate: number;
  paymentDueDate: number;
  color: string;
  paymentToAvoidInterest?: number;
  singleInstallmentDue?: number;
  deferredInstallmentsDue?: number;
  msiInstallmentsDue?: number;
  minPayment?: number;
  /** Días hasta el próximo corte (recalculado con zona horaria del usuario). */
  daysToCutoff?: number;
  /** Días hasta el próximo vencimiento de pago. */
  daysToPayment?: number;
  nextCutoffDate?: string;
  nextPaymentDueDate?: string;
  activeCycleStart?: string;
  activeCycleEnd?: string;
  /** Deuda real proyectada según cuotas pendientes (motor inmutable). */
  projectedRemainingDebt?: number;
  /** Cuota total proyectada del ciclo actual. */
  projectedPaymentDueThisCycle?: number;
  /** Saldo usedBalance almacenado en Prisma (referencia contable). */
  storedUsedBalance?: number;
};

export type BudgetData = {
  id: string;
  category: string;
  categoryColor: string;
  budget: number;
  spent: number;
  month: number;
  year: number;
};

export type AccountData = {
  id: string;
  name: string;
  type: string;
  balance: number;
  color: string;
  icon: string;
};

export type SavingsGoalData = {
  id: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
  targetDate?: string;
  color: string;
};

export type ReminderData = {
  id: string;
  title: string;
  description?: string;
  type: string;
  dueDate: string;
  isRead: boolean;
};

export type RecurringTransactionData = {
  id: string;
  type: "INCOME" | "EXPENSE";
  amount: number;
  description?: string;
  category: string;
  categoryColor: string;
  categoryId: string;
  accountId?: string;
  creditCardId?: string;
  fundSource: string;
  paymentMethod: string;
  frequency: string;
  frequencyRaw: string;
  dayOfMonth?: number;
  dayOfWeek?: number;
  monthOfYear?: number;
  installments: number;
  nextRunAt: string;
  lastRunAt?: string;
  isActive: boolean;
};

export type LoanPaymentData = {
  id: string;
  amount: number;
  principalPaid: number;
  interestPaid: number;
  paymentDate: string;
  destinationAccount: string;
  notes?: string;
};

export type LoanData = {
  id: string;
  debtorName: string;
  principalAmount: number;
  outstandingBalance: number;
  interestRate: number;
  interestType: string;
  expectedReturnAmount: number;
  totalInterest: number;
  loanDate: string;
  dueDate: string;
  status: string;
  sourceAccount: string;
  sourceAccountId: string;
  notes?: string;
  collectedAmount: number;
  principalCollected: number;
  interestCollected: number;
  progressPercent: number;
  daysUntilDue: number;
  isOverdue: boolean;
  payments: LoanPaymentData[];
};

/** Obsoleto. Usar LoanData */
export type AccountReceivableData = LoanData;

/** Obsoleto. Usar LoanPaymentData */
export type ReceivablePaymentData = LoanPaymentData;

export type LoansSummaryData = {
  totalOutstanding: number;
  totalPrincipalLent: number;
  totalExpectedReturn: number;
  totalCollected: number;
  activeLoans: number;
  paidLoans: number;
};

export type ChartDataPoint = {
  name: string;
  value: number;
  color?: string;
  percent?: number;
};

export type MonthlyDataPoint = {
  month: string;
  income: number;
  expenses: number;
  savings: number;
  isMissing?: boolean;
  isLive?: boolean;
};

export type MonthlySnapshotData = {
  id?: string;
  month: number;
  year: number;
  totalAssets: number;
  totalLiabilities: number;
  totalIncome: number;
  totalExpense: number;
  netWorth: number;
  isLive: boolean;
  isMissing?: boolean;
  createdAt?: string;
};

export type ReportsPageData = {
  year: number;
  month: number;
  periodLabel: string;
  snapshots: MonthlySnapshotData[];
  monthlyEvolution: MonthlyDataPoint[];
  selectedSnapshot: MonthlySnapshotData | null;
  expenseByCategory: ChartDataPoint[];
};

export type BusinessData = {
  id: string;
  name: string;
  slug: string;
  businessType: string;
  status: string;
  currency: string;
  description?: string;
};

export type BusinessListItem = BusinessData & {
  cashOnHand: number;
  accountsReceivable: number;
  ownerCapital: number;
};

export type BusinessKpiData = StatCardData & {
  subtitle?: string;
};

export type BusinessProductData = {
  id: string;
  name: string;
  sku?: string;
  salePrice: number;
  unit: string;
  stock: number;
  unitCost: number;
  inventoryValue: number;
  isInventoryTracked: boolean;
  supplierName?: string;
  supplierPhone?: string;
  supplierWhatsApp?: string;
  supplierEmail?: string;
};

export type BusinessCustomerData = {
  id: string;
  name: string;
  documentId?: string;
  phone?: string;
  riskLevel: string;
  totalOutstanding: number;
  overdueDaysMax: number;
};

export type SaleInstallmentData = {
  id: string;
  installmentNo: number;
  dueDate: string;
  expectedAmount: number;
  paidAmount: number;
  status: string;
  overdueDays: number;
};

export type BusinessSaleData = {
  id: string;
  saleNumber: string;
  saleDate: string;
  customerName?: string;
  customerPhone?: string;
  totalAmount: number;
  cashReceived: number;
  paymentTerms: string;
  installments: SaleInstallmentData[];
};

export type OverdueInstallmentData = SaleInstallmentData & {
  saleNumber: string;
  customerName?: string;
};

export type PendingInstallmentData = SaleInstallmentData & {
  saleNumber: string;
  customerName?: string;
  customerPhone?: string;
};

export type BusinessDashboardData = {
  business: BusinessData;
  kpis: BusinessKpiData[];
  cashFlow: {
    cashOnHand: number;
    capitalInjected: number;
    cashCollections: number;
    supplierPayments: number;
    operatingExpenses: number;
    ownerWithdrawals: number;
    computedCash: number;
    accountsPayable: number;
    isCashConsistent: boolean;
    accountsReceivable: number;
    totalLiquidPosition: number;
    overdueReceivable: number;
    collectionRate: number;
  };
  profitability: {
    grossRevenue: number;
    cogs: number;
    grossProfit: number;
    grossMarginPct: number;
    operatingExpenses: number;
    netProfit: number;
    netMarginPct: number;
    ownerInvestment: number;
    ownerWithdrawals: number;
    roiPct: number;
    inventoryValue: number;
  };
  products: BusinessProductData[];
  customers: BusinessCustomerData[];
  expenseCategories: { id: string; name: string; color: string }[];
  recentSales: BusinessSaleData[];
  overdueInstallments: OverdueInstallmentData[];
  pendingInstallments: PendingInstallmentData[];
  personalAccounts: { id: string; name: string }[];
};
