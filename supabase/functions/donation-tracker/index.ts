import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const CAGNOTTE_URL = "https://www.onparticipe.fr/c/Gzkylzap";

function formatEuro(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",") + " €";
}

async function scrapeCagnotte(url: string): Promise<{ amountCents: number; participantCount: number }> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; DonationMonitor/1.0)",
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch page: ${res.status}`);
  }

  const html = await res.text();

  // Extract amount in cents from centsAnimation(XXXXX, 'kitty-block-amount-value')
  const amountMatch = html.match(/centsAnimation\((\d+),\s*['"]kitty-block-amount-value['"]\)/);
  if (!amountMatch) {
    throw new Error("Could not extract amount from page");
  }
  const amountCents = parseInt(amountMatch[1], 10);

  // Extract participant count from the participation-count section
  // The HTML looks like: data-component-id="kitty::participation.participation-count" ... <span class="h4 mb-0"> 17 </span>
  const participantSection = html.split("participation.participation-count")[1] ?? "";
  const participantMatch = participantSection.match(/<span[^>]*h4[^>]*>\s*(\d+)\s*<\/span>/);
  if (!participantMatch) {
    throw new Error("Could not extract participant count from page");
  }
  const participantCount = parseInt(participantMatch[1], 10);

  return { amountCents, participantCount };
}

async function sendTelegramNotification(
  botToken: string,
  chatId: string,
  message: string
): Promise<void> {
  const res = await fetch(
    `https://api.telegram.org/bot${botToken}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Telegram API error: ${res.status} ${errText}`);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // Read configuration from environment
    const telegramBotToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const telegramChatId = Deno.env.get("TELEGRAM_CHAT_ID");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: "Supabase configuration missing" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Scrape the cagnotte page
    const { amountCents, participantCount } = await scrapeCagnotte(CAGNOTTE_URL);

    // Connect to Supabase
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the latest snapshot
    const { data: latest, error: fetchError } = await supabase
      .from("donation_snapshots")
      .select("amount_cents, participant_count")
      .eq("cagnotte_url", CAGNOTTE_URL)
      .order("checked_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      throw new Error(`DB fetch error: ${fetchError.message}`);
    }

    const prevAmount = latest?.amount_cents ?? 0;
    const prevParticipants = latest?.participant_count ?? 0;

    const amountIncreased = amountCents > prevAmount;
    const participantsIncreased = participantCount > prevParticipants;
    const isNewEntry = !latest;

    let notificationSent = false;

    if ((amountIncreased || participantsIncreased) && !isNewEntry && telegramBotToken && telegramChatId) {
      const amountDiff = amountCents - prevAmount;
      const participantDiff = participantCount - prevParticipants;

      let message = `🔔 <b>Nouvelle entrée</b>\n\n`;
      if (amountIncreased) {
        message += `💵 +${formatEuro(amountDiff)}\n`;
      }
      if (participantsIncreased) {
        message += `📈 +${participantDiff} client(s)\n`;
      }
      message += `\n💼 Bénéfice cumulé : <b>${formatEuro(amountCents)}</b>\n`;
      message += `👥 Clients : <b>${participantCount}</b>`;

      try {
        await sendTelegramNotification(telegramBotToken, telegramChatId, message);
        notificationSent = true;
      } catch (tgErr) {
        console.error("Telegram notification failed:", tgErr.message);
      }
    }

    // Insert the new snapshot
    const { error: insertError } = await supabase
      .from("donation_snapshots")
      .insert({
        cagnotte_url: CAGNOTTE_URL,
        amount_cents: amountCents,
        participant_count: participantCount,
      });

    if (insertError) {
      throw new Error(`DB insert error: ${insertError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        cagnotte_url: CAGNOTTE_URL,
        amount_cents: amountCents,
        amount_euros: formatEuro(amountCents),
        participant_count: participantCount,
        previous_amount_cents: prevAmount,
        previous_participant_count: prevParticipants,
        amount_changed: amountIncreased,
        participants_changed: participantsIncreased,
        notification_sent: notificationSent,
        is_first_check: isNewEntry,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err.message);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
