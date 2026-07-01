import { useState, useEffect } from 'react';
import { Bell, MessageCircle, Send, Save, Loader2, Check, AlertCircle, Smartphone } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';

interface NotificationSettings {
  id: string;
  whatsapp_number: string | null;
  telegram_chat_id: string | null;
  notify_on_payment: boolean;
  notify_on_fraud: boolean;
}

export default function NotificationSettingsPage() {
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [notifyOnPayment, setNotifyOnPayment] = useState(true);
  const [notifyOnFraud, setNotifyOnFraud] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    loadSettings();
  }, [user]);

  const loadSettings = async () => {
    if (!user) return;
    setLoading(true);

    const { data, error: fetchError } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (fetchError) {
      setError('Failed to load settings');
    } else if (data) {
      setWhatsappNumber(data.whatsapp_number || '');
      setTelegramChatId(data.telegram_chat_id || '');
      setNotifyOnPayment(data.notify_on_payment);
      setNotifyOnFraud(data.notify_on_fraud);
    }

    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setError(null);
    setSaved(false);

    const settingsData = {
      whatsapp_number: whatsappNumber.trim() || null,
      telegram_chat_id: telegramChatId.trim() || null,
      notify_on_payment: notifyOnPayment,
      notify_on_fraud: notifyOnFraud,
      user_id: user.id,
    };

    const { error: upsertError } = await supabase
      .from('notification_settings')
      .upsert(settingsData, { onConflict: 'user_id' });

    if (upsertError) {
      setError(upsertError.message);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }

    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 border-2 border-cyber-green/30 border-t-cyber-green rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl lg:text-2xl font-bold text-white">Notification Settings</h1>
        <p className="text-sm text-gray-500 mt-1 font-mono">Get instant alerts when customers pay or fraud is detected</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-surface-900 border border-surface-700 rounded-xl p-5 lg:p-6">
          <div className="flex items-center gap-2 mb-5">
            <Bell className="w-4 h-4 text-cyber-green" />
            <span className="text-xs font-mono text-cyber-green uppercase tracking-widest">Configure Notifications</span>
          </div>

          <form onSubmit={handleSave} className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5 flex items-center gap-2">
                <MessageCircle className="w-3.5 h-3.5" />
                WhatsApp Number
              </label>
              <input
                type="text"
                value={whatsappNumber}
                onChange={e => setWhatsappNumber(e.target.value)}
                placeholder="+1234567890 (with country code)"
                className="w-full bg-surface-800 border border-surface-600 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-cyber-green/50 focus:ring-1 focus:ring-cyber-green/30 transition-all"
              />
              <p className="text-xs text-gray-600 mt-1.5 font-mono">
                Include country code. You'll need a CallMeBot API key to receive messages.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5 flex items-center gap-2">
                <Send className="w-3.5 h-3.5" />
                Telegram Chat ID
              </label>
              <input
                type="text"
                value={telegramChatId}
                onChange={e => setTelegramChatId(e.target.value)}
                placeholder="123456789"
                className="w-full bg-surface-800 border border-surface-600 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-cyber-green/50 focus:ring-1 focus:ring-cyber-green/30 transition-all"
              />
              <p className="text-xs text-gray-600 mt-1.5 font-mono">
                Message @userinfobot on Telegram to get your Chat ID. You'll need a bot token.
              </p>
            </div>

            <div className="pt-4 border-t border-surface-700 space-y-3">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Notification Types</p>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyOnPayment}
                  onChange={e => setNotifyOnPayment(e.target.checked)}
                  className="w-4 h-4 rounded border-surface-600 bg-surface-800 text-cyber-green focus:ring-cyber-green/30 focus:ring-offset-0"
                />
                <span className="text-sm text-gray-300">Payment received alerts</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyOnFraud}
                  onChange={e => setNotifyOnFraud(e.target.checked)}
                  className="w-4 h-4 rounded border-surface-600 bg-surface-800 text-cyber-red focus:ring-cyber-red/30 focus:ring-offset-0"
                />
                <span className="text-sm text-gray-300">Fraud attempt alerts</span>
              </label>
            </div>

            {error && (
              <div className="flex items-start gap-2 bg-cyber-red/10 border border-cyber-red/30 text-cyber-red text-xs font-mono px-3 py-2 rounded-lg">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {saved && (
              <div className="flex items-start gap-2 bg-cyber-green/10 border border-cyber-green/30 text-cyber-green text-xs font-mono px-3 py-2 rounded-lg">
                <Check className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span>Settings saved successfully!</span>
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-cyber-green hover:bg-cyber-green-dark text-surface-950 font-semibold py-2.5 rounded-lg text-sm transition-all duration-200 hover:shadow-lg hover:shadow-cyber-green/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</> : <><Save className="w-4 h-4" />Save Settings</>}
            </button>
          </form>
        </div>

        <div className="bg-surface-900 border border-surface-700 rounded-xl p-5 lg:p-6">
          <div className="flex items-center gap-2 mb-5">
            <Smartphone className="w-4 h-4 text-cyber-blue" />
            <span className="text-xs font-mono text-cyber-blue uppercase tracking-widest">Setup Guide</span>
          </div>

          <div className="space-y-5">
            <div className="p-4 bg-surface-800 rounded-lg">
              <h3 className="text-sm font-semibold text-white mb-2">WhatsApp Setup (CallMeBot)</h3>
              <ol className="text-xs text-gray-400 space-y-2 font-mono">
                <li>1. Go to callmebot.com</li>
                <li>2. Click "WhatsApp" and scan QR code</li>
                <li>3. Copy your API key from the page</li>
                <li>4. Add API key in project secrets</li>
                <li>5. Enter your WhatsApp number above</li>
              </ol>
            </div>

            <div className="p-4 bg-surface-800 rounded-lg">
              <h3 className="text-sm font-semibold text-white mb-2">Telegram Setup</h3>
              <ol className="text-xs text-gray-400 space-y-2 font-mono">
                <li>1. Message @BotFather on Telegram</li>
                <li>2. Create a new bot and copy token</li>
                <li>3. Add token to project secrets</li>
                <li>4. Message @userinfobot to get Chat ID</li>
                <li>5. Enter Chat ID above</li>
              </ol>
            </div>

            <div className="bg-cyber-yellow/10 border border-cyber-yellow/20 rounded-lg p-3">
              <p className="text-xs text-cyber-yellow font-mono">
                Required secrets: WHATSAPP_API_KEY, TELEGRAM_BOT_TOKEN
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
