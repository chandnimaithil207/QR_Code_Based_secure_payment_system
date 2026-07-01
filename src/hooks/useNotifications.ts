import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './useAuth';

interface PendingNotification {
  id: string;
  payload: {
    transactionId: string;
    merchantId: string;
    amount?: number;
    customerName?: string;
    orderId?: string;
    fraudDetails?: { fraudType: string; description: string };
    type: 'payment' | 'fraud';
  };
  type: 'payment' | 'fraud';
}

export function useNotificationProcessor() {
  const { user } = useAuth();
  const processingRef = useRef(false);

  useEffect(() => {
    if (!user) return;

    const processNotifications = async () => {
      if (processingRef.current) return;
      processingRef.current = true;

      try {
        const { data: pending, error } = await supabase
          .from('pending_notifications')
          .select('id, payload, type')
          .eq('processed', false)
          .limit(10);

        if (error || !pending || pending.length === 0) {
          processingRef.current = false;
          return;
        }

        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        for (const notification of pending as PendingNotification[]) {
          try {
            const response = await fetch(`${supabaseUrl}/functions/v1/payment-notification`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseAnonKey}`,
              },
              body: JSON.stringify({
                ...notification.payload,
                merchantId: notification.payload.merchantId || user.id,
              }),
            });

            if (response.ok) {
              await supabase
                .from('pending_notifications')
                .update({ processed: true })
                .eq('id', notification.id);
            }
          } catch (err) {
            console.error('Failed to send notification:', err);
          }
        }
      } finally {
        processingRef.current = false;
      }
    };

    processNotifications();

    const interval = setInterval(processNotifications, 30000);

    const channel = supabase
      .channel('notification-processor')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'pending_notifications' },
        () => {
          processNotifications();
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [user]);
}
