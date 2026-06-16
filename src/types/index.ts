export type TransactionStatus = 'verified' | 'pending' | 'fraud';

export interface Transaction {
  orderId: string;
  transactionId: string;
  amount: number;
  status: TransactionStatus;
  timestamp: string;
  merchantName?: string;
}

export interface QRData {
  orderId: string;
  token: string;
  merchantName: string;
  amount: number;
  expiryTime: string;
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
  verified: boolean;
}

export interface DashboardStats {
  totalOrders: number;
  totalTransactions: number;
  verifiedPayments: number;
  fraudAlerts: number;
}
