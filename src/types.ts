export interface ExpertHeader {
  expertName: string;
  field: string;
  licenseNumber: string;
  mobileNumber: string;
  date: string;
  number: string;
  attachment: string;
  courtName: string;
  branch: string;
  caseNumber: string;
  plaintiff: string;
  defendant: string;
}

export interface ContractItem {
  id: string;
  subject: string;
  date: string;
  amount: number;
  description: string;
}

export interface TransactionItem {
  id: string;
  description: string;
  date: string;
  paymentMethod: "کارت به کارت" | "چک" | "حواله" | "نقدی" | "سایر";
  amount: number; // For simplicity in default template
  sourceAccount?: string;
  destinationAccount?: string;
}

export interface ClaimedGoodItem {
  id: string;
  subject: string;
  count: string;
  amount: number;
}

export interface ReconciliationRow {
  id: string;
  subject: string;
  plaintiffClaim: string;
  defendantDefense: string;
  assessment: string;
}

export interface ChequeRow {
  id: string;
  chequeNumber: string;
  dueDate: string;
  amount: number;
  status: string;
}

export interface ScenarioItem {
  title: string;
  text: string;
}

export interface ExpertReport {
  header: ExpertHeader;
  caseSubject: string; // ۱- موضوع پرونده
  expertDecree: string; // ۲- قرار کارشناسی
  investigationMethod: string; // ۳- نحوه بررسی اسناد و مدارک
  limitations: string; // ۴- محدودیت‌های رسیدگی
  plaintiffStatements: string; // ۵-۱- اظهارات خواهان
  plaintiffStatementsDate: string;
  defendantStatements: string; // ۵-۲- اظهارات خوانده
  defendantStatementsDate: string;
  lawyerStatements: string; // ۵-۴- اظهارات وکیل
  lawyerStatementsTitle: string; // e.g. اظهارات وکیل خواهان
  contracts: ContractItem[];
  transactions: TransactionItem[];
  claimedGoods?: ClaimedGoodItem[];
  reconciliationRows?: ReconciliationRow[];
  chequeRows?: ChequeRow[];
  scenarios?: ScenarioItem[];
  expertOpinion: string; // ۶- اظهار نظر نهایی کارشناسی
}
