import type { Transaction, FraudLog, FraudStats, DashboardStats } from '../types';

export const dashboardStats: DashboardStats = {
  totalOrders: 1247,
  totalTransactions: 1089,
  verifiedPayments: 956,
  fraudAlerts: 23,
};

export const recentTransactions: Transaction[] = [
  { orderId: 'ORD-7821', transactionId: 'TXN-90123', amount: 2500.00, status: 'verified', timestamp: '2026-06-16 14:32:18' },
  { orderId: 'ORD-7820', transactionId: 'TXN-90122', amount: 1800.50, status: 'pending', timestamp: '2026-06-16 14:28:05' },
  { orderId: 'ORD-7819', transactionId: 'TXN-90121', amount: 4200.00, status: 'fraud', timestamp: '2026-06-16 14:15:42' },
  { orderId: 'ORD-7818', transactionId: 'TXN-90120', amount: 950.00, status: 'verified', timestamp: '2026-06-16 13:58:11' },
  { orderId: 'ORD-7817', transactionId: 'TXN-90119', amount: 3100.75, status: 'verified', timestamp: '2026-06-16 13:45:33' },
  { orderId: 'ORD-7816', transactionId: 'TXN-90118', amount: 675.00, status: 'pending', timestamp: '2026-06-16 13:30:07' },
  { orderId: 'ORD-7815', transactionId: 'TXN-90117', amount: 5500.00, status: 'verified', timestamp: '2026-06-16 13:12:45' },
  { orderId: 'ORD-7814', transactionId: 'TXN-90116', amount: 1250.00, status: 'fraud', timestamp: '2026-06-16 12:55:20' },
];

export const allTransactions: Transaction[] = [
  ...recentTransactions,
  { orderId: 'ORD-7813', transactionId: 'TXN-90115', amount: 890.00, status: 'verified', timestamp: '2026-06-16 12:40:12' },
  { orderId: 'ORD-7812', transactionId: 'TXN-90114', amount: 2300.00, status: 'verified', timestamp: '2026-06-16 12:22:38' },
  { orderId: 'ORD-7811', transactionId: 'TXN-90113', amount: 1500.00, status: 'pending', timestamp: '2026-06-16 11:58:05' },
  { orderId: 'ORD-7810', transactionId: 'TXN-90112', amount: 3800.00, status: 'fraud', timestamp: '2026-06-16 11:30:15' },
  { orderId: 'ORD-7809', transactionId: 'TXN-90111', amount: 725.00, status: 'verified', timestamp: '2026-06-16 11:15:42' },
  { orderId: 'ORD-7808', transactionId: 'TXN-90110', amount: 2100.00, status: 'verified', timestamp: '2026-06-16 10:50:33' },
];

export const fraudStats: FraudStats = {
  duplicateTransactions: 8,
  invalidTokens: 5,
  expiredQRCodes: 12,
  tamperingAttempts: 3,
};

export const fraudLogs: FraudLog[] = [
  { transactionId: 'TXN-90121', fraudType: 'Duplicate Payment', description: 'Same QR code used for multiple payments within 2 minutes', timestamp: '2026-06-16 14:15:42' },
  { transactionId: 'TXN-90116', fraudType: 'Invalid Token', description: 'Token signature verification failed - possible token forgery', timestamp: '2026-06-16 12:55:20' },
  { transactionId: 'TXN-90112', fraudType: 'Expired QR', description: 'Payment attempted 45 minutes after QR code expiry', timestamp: '2026-06-16 11:30:15' },
  { transactionId: 'TXN-90098', fraudType: 'Tampering', description: 'Amount field modified in QR payload - mismatch with server record', timestamp: '2026-06-16 09:22:18' },
  { transactionId: 'TXN-90089', fraudType: 'Duplicate Payment', description: 'Identical transaction ID submitted from different device', timestamp: '2026-06-16 08:15:33' },
  { transactionId: 'TXN-90076', fraudType: 'Invalid Token', description: 'Token reuse detected - previously consumed token resubmitted', timestamp: '2026-06-15 22:40:12' },
  { transactionId: 'TXN-90065', fraudType: 'Expired QR', description: 'QR code used 2 hours after generation - far beyond 15-min window', timestamp: '2026-06-15 20:18:45' },
  { transactionId: 'TXN-90051', fraudType: 'Tampering', description: 'Merchant name field altered in decoded QR data', timestamp: '2026-06-15 17:05:22' },
];

export const transactionTrend = [
  { date: 'Jun 10', verified: 82, pending: 12, fraud: 3 },
  { date: 'Jun 11', verified: 78, pending: 15, fraud: 5 },
  { date: 'Jun 12', verified: 91, pending: 8, fraud: 2 },
  { date: 'Jun 13', verified: 85, pending: 11, fraud: 4 },
  { date: 'Jun 14', verified: 95, pending: 6, fraud: 1 },
  { date: 'Jun 15', verified: 88, pending: 9, fraud: 3 },
  { date: 'Jun 16', verified: 93, pending: 7, fraud: 2 },
];

let orderCounter = 7822;
let tokenCounter = 100;

export function generateOrderId(): string {
  return `ORD-${orderCounter++}`;
}

export function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 16; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `TKN-${result}`;
}

export function generateTransactionId(): string {
  return `TXN-${90000 + tokenCounter++}`;
}

export function getExpiryTime(minutes: number = 15): string {
  const now = new Date();
  now.setMinutes(now.getMinutes() + minutes);
  return now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function simulatePayment(): { transactionId: string; amount: number; status: 'verified' } {
  return {
    transactionId: generateTransactionId(),
    amount: 0,
    status: 'verified',
  };
}
