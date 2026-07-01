import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface NotificationRequest {
  transactionId: string;
  merchantId: string;
  amount: number;
  customerName: string;
  orderId: string;
  type: "payment" | "fraud";
  fraudDetails?: { fraudType: string; description: string };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const body: NotificationRequest = await req.json();
    const { transactionId, merchantId, amount, customerName, orderId, type, fraudDetails } = body;

    if (!merchantId || !transactionId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: merchantId, transactionId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client with service role for full access
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get merchant notification settings
    const { data: settings, error: settingsError } = await supabase
      .from("notification_settings")
      .select("*")
      .eq("user_id", merchantId)
      .maybeSingle();

    if (settingsError) {
      console.error("Error fetching notification settings:", settingsError);
    }

    const notifications: { whatsapp: boolean; telegram: boolean } = { whatsapp: false, telegram: false };

    if (settings) {
      const shouldNotify = type === "payment" ? settings.notify_on_payment : settings.notify_on_fraud;

      if (shouldNotify) {
        const message = type === "payment"
          ? `Payment Received!\n\nTransaction ID: ${transactionId}\nOrder: ${orderId}\nAmount: $${amount.toFixed(2)}\nCustomer: ${customerName || "N/A"}\n\nPowered by SecureQR`
          : `Fraud Alert!\n\nType: ${fraudDetails?.fraudType || "Unknown"}\nDescription: ${fraudDetails?.description || "N/A"}\nTransaction: ${transactionId}\n\nPowered by SecureQR`;

        // Send WhatsApp notification via CallMeBot (free for personal use)
        // Format: https://api.callmebot.com/whatsapp.php?phone=[phone]&text=[text]&apikey=[key]
        if (settings.whatsapp_number) {
          try {
            const whatsappApiUrl = Deno.env.get("WHATSAPP_API_URL") || "https://api.callmebot.com/whatsapp.php";
            const whatsappApiKey = Deno.env.get("WHATSAPP_API_KEY");

            if (whatsappApiKey) {
              const whatsappUrl = new URL(whatsappApiUrl);
              whatsappUrl.searchParams.set("phone", settings.whatsapp_number);
              whatsappUrl.searchParams.set("text", message);
              whatsappUrl.searchParams.set("apikey", whatsappApiKey);

              await fetch(whatsappUrl.toString(), { method: "GET" });
              notifications.whatsapp = true;
            }
          } catch (err) {
            console.error("WhatsApp notification failed:", err);
          }
        }

        // Send Telegram notification
        if (settings.telegram_chat_id) {
          try {
            const telegramBotToken = Deno.env.get("TELEGRAM_BOT_TOKEN");

            if (telegramBotToken) {
              const telegramUrl = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;
              await fetch(telegramUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  chat_id: settings.telegram_chat_id,
                  text: message,
                  parse_mode: "HTML",
                }),
              });
              notifications.telegram = true;
            }
          } catch (err) {
            console.error("Telegram notification failed:", err);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        notifications,
        message: settings ? "Notifications processed" : "No notification settings found",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
