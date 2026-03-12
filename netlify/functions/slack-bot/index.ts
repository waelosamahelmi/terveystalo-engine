// ============================================================================
// SUUN TERVEYSTALO - Slack Bot Slash Commands Handler
// Handles incoming Slack slash commands for campaign management
// ============================================================================

import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Slack signing secret for verification
const slackSigningSecret = process.env.SLACK_SIGNING_SECRET;

interface SlackCommand {
  token: string;
  team_id: string;
  team_domain: string;
  channel_id: string;
  channel_name: string;
  user_id: string;
  user_name: string;
  command: string;
  text: string;
  response_url: string;
  trigger_id: string;
}

interface SlackResponse {
  response_type?: "ephemeral" | "in_channel";
  text?: string;
  blocks?: any[];
  attachments?: any[];
}

// Parse form-encoded body
function parseBody(body: string): SlackCommand {
  const params = new URLSearchParams(body);
  return {
    token: params.get("token") || "",
    team_id: params.get("team_id") || "",
    team_domain: params.get("team_domain") || "",
    channel_id: params.get("channel_id") || "",
    channel_name: params.get("channel_name") || "",
    user_id: params.get("user_id") || "",
    user_name: params.get("user_name") || "",
    command: params.get("command") || "",
    text: params.get("text") || "",
    response_url: params.get("response_url") || "",
    trigger_id: params.get("trigger_id") || "",
  };
}

// Format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("fi-FI", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

// Format date
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("fi-FI", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// Get campaign status emoji
function getStatusEmoji(status: string): string {
  const emojis: Record<string, string> = {
    draft: "📝",
    pending: "⏳",
    active: "▶️",
    paused: "⏸️",
    completed: "✅",
    cancelled: "❌",
  };
  return emojis[status] || "❓";
}

// Handler for /kampanja command
async function handleCampaignCommand(text: string): Promise<SlackResponse> {
  const args = text.trim().split(/\s+/);
  const subCommand = args[0]?.toLowerCase();

  switch (subCommand) {
    case "lista":
    case "list":
      return await listCampaigns(args.slice(1));
    
    case "tila":
    case "status":
      return await getCampaignStatus(args[1]);
    
    case "yhteenveto":
    case "summary":
      return await getCampaignSummary();
    
    case "aktiiviset":
    case "active":
      return await listActiveCampaigns();
    
    case "apua":
    case "help":
    default:
      return getHelpMessage();
  }
}

// List campaigns
async function listCampaigns(args: string[]): Promise<SlackResponse> {
  try {
    const limit = parseInt(args[0]) || 5;
    
    const { data: campaigns, error } = await supabase
      .from("campaigns")
      .select("id, name, status, budget, start_date, end_date")
      .order("created_at", { ascending: false })
      .limit(Math.min(limit, 10));

    if (error) throw error;

    if (!campaigns || campaigns.length === 0) {
      return {
        response_type: "ephemeral",
        text: "Ei kampanjoita löytynyt.",
      };
    }

    const blocks: any[] = [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "📋 Viimeisimmät kampanjat",
          emoji: true,
        },
      },
      { type: "divider" },
    ];

    campaigns.forEach((campaign) => {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `${getStatusEmoji(campaign.status)} *${campaign.name}*\n` +
            `Budjetti: ${formatCurrency(campaign.budget || 0)} | ` +
            `${formatDate(campaign.start_date)} - ${formatDate(campaign.end_date)}`,
        },
        accessory: {
          type: "button",
          text: {
            type: "plain_text",
            text: "Avaa",
            emoji: true,
          },
          url: `${process.env.VITE_APP_URL}/campaigns/${campaign.id}`,
          action_id: `open_campaign_${campaign.id}`,
        },
      });
    });

    return {
      response_type: "in_channel",
      blocks,
    };
  } catch (error) {
    console.error("Error listing campaigns:", error);
    return {
      response_type: "ephemeral",
      text: "❌ Virhe kampanjoiden haussa. Yritä myöhemmin uudelleen.",
    };
  }
}

// Get campaign status
async function getCampaignStatus(campaignId: string): Promise<SlackResponse> {
  if (!campaignId) {
    return {
      response_type: "ephemeral",
      text: "❌ Anna kampanjan ID: `/kampanja tila [kampanja-id]`",
    };
  }

  try {
    const { data: campaign, error } = await supabase
      .from("campaigns")
      .select("*")
      .eq("id", campaignId)
      .single();

    if (error || !campaign) {
      return {
        response_type: "ephemeral",
        text: `❌ Kampanjaa ID:llä "${campaignId}" ei löytynyt.`,
      };
    }

    // Get campaign stats
    const { data: stats } = await supabase
      .from("campaign_daily_stats")
      .select("impressions, clicks, cost")
      .eq("campaign_id", campaignId);

    const totalImpressions = stats?.reduce((sum, s) => sum + (s.impressions || 0), 0) || 0;
    const totalClicks = stats?.reduce((sum, s) => sum + (s.clicks || 0), 0) || 0;
    const totalCost = stats?.reduce((sum, s) => sum + (s.cost || 0), 0) || 0;
    const ctr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : "0.00";

    return {
      response_type: "in_channel",
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: `${getStatusEmoji(campaign.status)} ${campaign.name}`,
            emoji: true,
          },
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*Tila:*\n${campaign.status}`,
            },
            {
              type: "mrkdwn",
              text: `*Budjetti:*\n${formatCurrency(campaign.budget || 0)}`,
            },
            {
              type: "mrkdwn",
              text: `*Käytetty:*\n${formatCurrency(totalCost)}`,
            },
            {
              type: "mrkdwn",
              text: `*Jäljellä:*\n${formatCurrency((campaign.budget || 0) - totalCost)}`,
            },
          ],
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*Näyttökerrat:*\n${totalImpressions.toLocaleString("fi-FI")}`,
            },
            {
              type: "mrkdwn",
              text: `*Klikkaukset:*\n${totalClicks.toLocaleString("fi-FI")}`,
            },
            {
              type: "mrkdwn",
              text: `*CTR:*\n${ctr}%`,
            },
            {
              type: "mrkdwn",
              text: `*Aikataulu:*\n${formatDate(campaign.start_date)} - ${formatDate(campaign.end_date)}`,
            },
          ],
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "📊 Avaa kampanja",
                emoji: true,
              },
              url: `${process.env.VITE_APP_URL}/campaigns/${campaign.id}`,
              style: "primary",
            },
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "📈 Analytiikka",
                emoji: true,
              },
              url: `${process.env.VITE_APP_URL}/analytics?campaign=${campaign.id}`,
            },
          ],
        },
      ],
    };
  } catch (error) {
    console.error("Error getting campaign status:", error);
    return {
      response_type: "ephemeral",
      text: "❌ Virhe kampanjan tilan haussa.",
    };
  }
}

// Get overall campaign summary
async function getCampaignSummary(): Promise<SlackResponse> {
  try {
    // Get campaign counts by status
    const { data: campaigns } = await supabase
      .from("campaigns")
      .select("status, budget");

    const statusCounts: Record<string, number> = {
      active: 0,
      paused: 0,
      draft: 0,
      completed: 0,
    };

    let totalBudget = 0;
    let activeBudget = 0;

    campaigns?.forEach((c) => {
      statusCounts[c.status] = (statusCounts[c.status] || 0) + 1;
      totalBudget += c.budget || 0;
      if (c.status === "active") {
        activeBudget += c.budget || 0;
      }
    });

    // Get this week's stats
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const { data: weekStats } = await supabase
      .from("campaign_daily_stats")
      .select("impressions, clicks, cost")
      .gte("date", weekAgo.toISOString().split("T")[0]);

    const weekImpressions = weekStats?.reduce((sum, s) => sum + (s.impressions || 0), 0) || 0;
    const weekClicks = weekStats?.reduce((sum, s) => sum + (s.clicks || 0), 0) || 0;
    const weekCost = weekStats?.reduce((sum, s) => sum + (s.cost || 0), 0) || 0;

    return {
      response_type: "in_channel",
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "📊 Kampanjoiden yhteenveto",
            emoji: true,
          },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "*Kampanjat tilannekuva*",
          },
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*▶️ Aktiiviset:* ${statusCounts.active}`,
            },
            {
              type: "mrkdwn",
              text: `*⏸️ Tauolla:* ${statusCounts.paused}`,
            },
            {
              type: "mrkdwn",
              text: `*📝 Luonnokset:* ${statusCounts.draft}`,
            },
            {
              type: "mrkdwn",
              text: `*✅ Päättyneet:* ${statusCounts.completed}`,
            },
          ],
        },
        { type: "divider" },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "*Tämän viikon suorituskyky*",
          },
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*Näyttökerrat:*\n${weekImpressions.toLocaleString("fi-FI")}`,
            },
            {
              type: "mrkdwn",
              text: `*Klikkaukset:*\n${weekClicks.toLocaleString("fi-FI")}`,
            },
            {
              type: "mrkdwn",
              text: `*Käytetty:*\n${formatCurrency(weekCost)}`,
            },
            {
              type: "mrkdwn",
              text: `*Aktiivinen budjetti:*\n${formatCurrency(activeBudget)}`,
            },
          ],
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "🏠 Avaa Dashboard",
                emoji: true,
              },
              url: `${process.env.VITE_APP_URL}/`,
              style: "primary",
            },
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "📈 Analytiikka",
                emoji: true,
              },
              url: `${process.env.VITE_APP_URL}/analytics`,
            },
          ],
        },
      ],
    };
  } catch (error) {
    console.error("Error getting summary:", error);
    return {
      response_type: "ephemeral",
      text: "❌ Virhe yhteenvedon haussa.",
    };
  }
}

// List active campaigns
async function listActiveCampaigns(): Promise<SlackResponse> {
  try {
    const { data: campaigns, error } = await supabase
      .from("campaigns")
      .select("id, name, budget, start_date, end_date")
      .eq("status", "active")
      .order("start_date", { ascending: true });

    if (error) throw error;

    if (!campaigns || campaigns.length === 0) {
      return {
        response_type: "in_channel",
        text: "ℹ️ Ei aktiivisia kampanjoita tällä hetkellä.",
      };
    }

    const blocks: any[] = [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `▶️ Aktiiviset kampanjat (${campaigns.length})`,
          emoji: true,
        },
      },
      { type: "divider" },
    ];

    for (const campaign of campaigns) {
      // Get current spend
      const { data: stats } = await supabase
        .from("campaign_daily_stats")
        .select("cost")
        .eq("campaign_id", campaign.id);

      const spent = stats?.reduce((sum, s) => sum + (s.cost || 0), 0) || 0;
      const remaining = (campaign.budget || 0) - spent;
      const spentPercentage = campaign.budget ? ((spent / campaign.budget) * 100).toFixed(0) : "0";

      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${campaign.name}*\n` +
            `📅 ${formatDate(campaign.start_date)} - ${formatDate(campaign.end_date)}\n` +
            `💰 Budjetti: ${formatCurrency(campaign.budget || 0)} | Käytetty: ${spentPercentage}%`,
        },
        accessory: {
          type: "button",
          text: {
            type: "plain_text",
            text: "Avaa",
          },
          url: `${process.env.VITE_APP_URL}/campaigns/${campaign.id}`,
        },
      });
    }

    return {
      response_type: "in_channel",
      blocks,
    };
  } catch (error) {
    console.error("Error listing active campaigns:", error);
    return {
      response_type: "ephemeral",
      text: "❌ Virhe aktiivisten kampanjoiden haussa.",
    };
  }
}

// Get help message
function getHelpMessage(): SlackResponse {
  return {
    response_type: "ephemeral",
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "📚 Suun Terveystalo - Slack Bot Ohjeet",
          emoji: true,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "Käytettävissä olevat komennot:",
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*`/kampanja lista [määrä]`*\nNäytä viimeisimmät kampanjat (oletus: 5)",
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*`/kampanja aktiiviset`*\nNäytä kaikki aktiiviset kampanjat",
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*`/kampanja tila [kampanja-id]`*\nNäytä kampanjan yksityiskohtainen tila",
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*`/kampanja yhteenveto`*\nNäytä kaikkien kampanjoiden yhteenveto",
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*`/kampanja apua`*\nNäytä tämä ohje",
        },
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: "💡 _Vinkki: Voit myös käyttää englanninkielisiä komentoja (list, active, status, summary, help)_",
          },
        ],
      },
    ],
  };
}

// Main handler
export const handler: Handler = async (
  event: HandlerEvent,
  context: HandlerContext
) => {
  // Only accept POST requests
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: "Method Not Allowed",
    };
  }

  try {
    // Parse the command
    const command = parseBody(event.body || "");
    
    // Verify this is from Slack (in production, you should verify the signature)
    if (!command.command) {
      return {
        statusCode: 400,
        body: "Invalid request",
      };
    }

    console.log(`Received Slack command: ${command.command} ${command.text} from ${command.user_name}`);

    let response: SlackResponse;

    // Route based on command
    if (command.command === "/kampanja" || command.command === "/campaign") {
      response = await handleCampaignCommand(command.text);
    } else {
      response = {
        response_type: "ephemeral",
        text: `❓ Tuntematon komento: ${command.command}`,
      };
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error("Slack command handler error:", error);
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        response_type: "ephemeral",
        text: "❌ Virhe komennon käsittelyssä. Yritä myöhemmin uudelleen.",
      }),
    };
  }
};
