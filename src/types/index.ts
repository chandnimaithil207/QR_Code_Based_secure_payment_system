export type TransactionStatus = 'verified' | 'pending' | 'fraud';

export interface Transaction {
  id: string;
  orderId: string;
  transactionId: string;
  amount: number;
  status: TransactionStatus;
  timestamp: string;
  merchantName?: string;
  customerName?: string | null;
}

export interface QRData {
  id: string;
  orderId: string;
  token: string;
  merchantName: string;
  amount: number;
  expiryTime: string;
  used?: boolean;
}

export interface FraudLog {
  transactionId: string;
  fraudType: string;
  description: string;
  timestamp: string;
}

export interface FraudStats {
  duplicateTransactions: number;
  invalidTokens: number;
  expiredQRCodes: number;
  tamperingAttempts: number;
}

export interface OCRResult {
  transactionId: string;
  amount: string;
  date: string;
  customerName: string | null;
  verified: boolean;
}

export interface DashboardStats {
  totalOrders: number;
  totalTransactions: number;
  verifiedPayments: number;
  fraudAlerts: number;
}
