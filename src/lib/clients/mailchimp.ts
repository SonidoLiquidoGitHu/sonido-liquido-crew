// ===========================================
// MAILCHIMP API CLIENT
// ===========================================

import { createHash } from "crypto";
import { defaultStyleSettings } from "@/lib/style-config";

interface MailchimpMember {
  id: string;
  email_address: string;
  status: "subscribed" | "unsubscribed" | "cleaned" | "pending";
  merge_fields: Record<string, string>;
  tags: { id: number; name: string }[];
  timestamp_signup: string;
  timestamp_opt: string;
}

interface MailchimpList {
  id: string;
  name: string;
  stats: {
    member_count: number;
    unsubscribe_count: number;
    cleaned_count: number;
    open_rate: number;
    click_rate: number;
  };
}

interface MailchimpCampaign {
  id: string;
  web_id: number;
  type: string;
  status: string;
  emails_sent: number;
  send_time: string;
  settings: {
    subject_line: string;
    preview_text: string;
    title: string;
  };
  report_summary?: {
    opens: number;
    unique_opens: number;
    open_rate: number;
    clicks: number;
    subscriber_clicks: number;
    click_rate: number;
  };
}

interface MailchimpError {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  errors?: Array<{ field: string; message: string }>;
}

// Default tag for all subscribers from sonidoliquido.com
const DEFAULT_TAG = "sonidoliquido.com";

class MailchimpClient {
  private envApiKey: string;
  private envServerPrefix: string;
  private envAudienceId: string;

  // DB-cached credentials (loaded lazily)
  private dbApiKey: string | null = null;
  private dbServerPrefix: string | null = null;
  private dbAudienceId: string | null = null;
  private dbCredentialsLoaded = false;
  private dbCredentialsExpiry = 0;
  private static DB_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.envApiKey = (process.env.MAILCHIMP_API_KEY || "").trim();
    this.envServerPrefix = (process.env.MAILCHIMP_SERVER_PREFIX || "").trim();
    this.envAudienceId = (process.env.MAILCHIMP_AUDIENCE_ID || "").trim();
  }

  /**
   * Get the active API key (DB-first, then env fallback)
   */
  private get apiKey(): string {
    return this.dbApiKey || this.envApiKey;
  }

  /**
   * Get the active server prefix (DB-first, then env fallback)
   */
  private get serverPrefix(): string {
    return this.dbServerPrefix || this.envServerPrefix;
  }

  /**
   * Get the active audience ID (DB-first, then env fallback)
   */
  private get audienceId(): string {
    return this.dbAudienceId || this.envAudienceId;
  }

  /**
   * Get the base URL derived from the active server prefix
   */
  private get baseUrl(): string {
    return this.serverPrefix ? `https://${this.serverPrefix}.api.mailchimp.com/3.0` : "";
  }

  /**
   * Load credentials from the database (site_settings table)
   */
  private async loadDbCredentials(): Promise<void> {
    if (this.dbCredentialsLoaded && Date.now() < this.dbCredentialsExpiry) return;

    try {
      const { db, isDatabaseConfigured } = await import("@/db/client");
      const { siteSettings } = await import("@/db/schema");
      const { inArray } = await import("drizzle-orm");

      if (!isDatabaseConfigured()) return;

      const results = await db
        .select()
        .from(siteSettings)
        .where(inArray(siteSettings.key, [
          "mailchimp_api_key",
          "mailchimp_server_prefix",
          "mailchimp_audience_id",
        ]));

      for (const row of results) {
        if (row.key === "mailchimp_api_key" && row.value) this.dbApiKey = row.value;
        if (row.key === "mailchimp_server_prefix" && row.value) this.dbServerPrefix = row.value;
        if (row.key === "mailchimp_audience_id" && row.value) this.dbAudienceId = row.value;
      }

      this.dbCredentialsLoaded = true;
      this.dbCredentialsExpiry = Date.now() + MailchimpClient.DB_CACHE_TTL;
      console.log("[Mailchimp] DB credentials loaded:", {
        hasApiKey: !!this.dbApiKey,
        hasPrefix: !!this.dbServerPrefix,
        hasAudienceId: !!this.dbAudienceId,
      });
    } catch (err) {
      console.warn("[Mailchimp] Failed to load DB credentials:", err);
    }
  }

  /**
   * Clear the DB credential cache (call after saving new credentials)
   */
  clearCredentialCache(): void {
    this.dbCredentialsLoaded = false;
    this.dbCredentialsExpiry = 0;
    this.dbApiKey = null;
    this.dbServerPrefix = null;
    this.dbAudienceId = null;
    console.log("[Mailchimp] Credential cache cleared");
  }

  /**
   * Check if credentials are configured (sync check — may use stale DB cache or env vars)
   */
  isConfigured(): boolean {
    return Boolean(this.apiKey && this.serverPrefix && this.audienceId);
  }

  /**
   * Async check that loads DB credentials first
   */
  async isConfiguredAsync(): Promise<boolean> {
    await this.loadDbCredentials();
    return this.isConfigured();
  }

  /**
   * Get configuration status for debugging
   */
  getConfigStatus(): { configured: boolean; hasApiKey: boolean; hasPrefix: boolean; hasAudienceId: boolean } {
    return {
      configured: this.isConfigured(),
      hasApiKey: Boolean(this.apiKey),
      hasPrefix: Boolean(this.serverPrefix),
      hasAudienceId: Boolean(this.audienceId),
    };
  }

  /**
   * Make authenticated API request
   */
  private async request<T>(
    endpoint: string,
    options: { method?: string; body?: Record<string, unknown> } = {}
  ): Promise<T> {
    // Ensure DB credentials are loaded before checking
    await this.loadDbCredentials();

    if (!this.isConfigured()) {
      throw new Error("Mailchimp credentials not configured. Configúralas en Email Studio → Config o agrega MAILCHIMP_API_KEY, MAILCHIMP_SERVER_PREFIX, y MAILCHIMP_AUDIENCE_ID en Netlify.");
    }

    const url = `${this.baseUrl}${endpoint}`;
    console.log(`[Mailchimp] ${options.method || "GET"} ${endpoint}`);

    const response = await fetch(url, {
      method: options.method || "GET",
      headers: {
        Authorization: `Basic ${Buffer.from(`anystring:${this.apiKey}`).toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      // Try to parse error body — Mailchimp sometimes returns empty bodies for errors
      let error: MailchimpError;
      try {
        const text = await response.text();
        error = text ? JSON.parse(text) : {
          type: "unknown",
          title: "Unknown error",
          status: response.status,
          detail: response.statusText,
          instance: endpoint,
        };
      } catch {
        error = {
          type: "unknown",
          title: "Unknown error",
          status: response.status,
          detail: response.statusText,
          instance: endpoint,
        };
      }

      console.error(`[Mailchimp] Error: ${error.title} - ${error.detail}`, error.errors || "");

      // Build a more detailed error message including field-specific errors
      let detailMsg = `Mailchimp API error: ${error.title} - ${error.detail}`;
      if (error.errors && error.errors.length > 0) {
        const fieldErrors = error.errors.map(e => `${e.field}: ${e.message}`).join(", ");
        detailMsg += ` (${fieldErrors})`;
      }
      throw new Error(detailMsg);
    }

    // Many Mailchimp action endpoints (send, schedule, unschedule, etc.)
    // return 204 No Content. Trying response.json() on an empty body throws
    // "Unexpected end of JSON input", so we handle it explicitly.
    const contentLength = response.headers.get("content-length");
    if (response.status === 204 || contentLength === "0") {
      return {} as T;
    }

    // Some responses may have a body but still not be valid JSON
    const text = await response.text();
    if (!text || text.trim() === "") {
      return {} as T;
    }
    return JSON.parse(text) as T;
  }

  /**
   * Get audience/list information
   */
  async getAudience(): Promise<MailchimpList> {
    return this.request<MailchimpList>(`/lists/${this.audienceId}`);
  }

  /**
   * Add subscriber to audience with the "sonidoliquido.com" tag
   */
  async addSubscriber(
    email: string,
    options: { name?: string; tags?: string[]; source?: string } = {}
  ): Promise<MailchimpMember> {
    const mergeFields: Record<string, string> = {};

    if (options.name) {
      const nameParts = options.name.split(" ");
      mergeFields.FNAME = nameParts[0] || "";
      mergeFields.LNAME = nameParts.slice(1).join(" ") || "";
    }

    // Add source to merge fields if provided
    if (options.source) {
      mergeFields.SOURCE = options.source;
    }

    // Always include the default tag, plus any additional tags
    const allTags = [DEFAULT_TAG, ...(options.tags || [])];
    const uniqueTags = [...new Set(allTags)]; // Remove duplicates

    console.log(`[Mailchimp] Adding subscriber: ${email.substring(0, 3)}*** with tags: ${uniqueTags.join(", ")}`);

    // First, add or update the member
    const subscriberHash = this.getSubscriberHash(email);

    try {
      // Try to add new member
      const member = await this.request<MailchimpMember>(`/lists/${this.audienceId}/members`, {
        method: "POST",
        body: {
          email_address: email,
          status: "subscribed",
          merge_fields: mergeFields,
          tags: uniqueTags,
        },
      });

      console.log(`[Mailchimp] Successfully added new subscriber: ${email.substring(0, 3)}***`);
      return member;
    } catch (error) {
      // If member already exists, update them instead
      if ((error as Error).message.includes("Member Exists")) {
        console.log(`[Mailchimp] Member already exists, updating...`);

        // Update the existing member
        const member = await this.request<MailchimpMember>(
          `/lists/${this.audienceId}/members/${subscriberHash}`,
          {
            method: "PATCH",
            body: {
              status: "subscribed",
              merge_fields: mergeFields,
            },
          }
        );

        // Add tags separately (Mailchimp API requires separate call for tags on existing members)
        await this.addTagsToMember(email, uniqueTags);

        console.log(`[Mailchimp] Successfully updated existing subscriber: ${email.substring(0, 3)}***`);
        return member;
      }
      throw error;
    }
  }

  /**
   * Add tags to an existing member
   */
  async addTagsToMember(email: string, tags: string[]): Promise<void> {
    const subscriberHash = this.getSubscriberHash(email);

    await this.request(`/lists/${this.audienceId}/members/${subscriberHash}/tags`, {
      method: "POST",
      body: {
        tags: tags.map(tag => ({ name: tag, status: "active" })),
      },
    });

    console.log(`[Mailchimp] Added tags to member: ${tags.join(", ")}`);
  }

  /**
   * Update subscriber
   */
  async updateSubscriber(
    email: string,
    data: { status?: MailchimpMember["status"]; mergeFields?: Record<string, string> }
  ): Promise<MailchimpMember> {
    const subscriberHash = this.getSubscriberHash(email);

    return this.request<MailchimpMember>(
      `/lists/${this.audienceId}/members/${subscriberHash}`,
      {
        method: "PATCH",
        body: {
          status: data.status,
          merge_fields: data.mergeFields,
        },
      }
    );
  }

  /**
   * Get subscriber by email
   */
  async getSubscriber(email: string): Promise<MailchimpMember | null> {
    try {
      const subscriberHash = this.getSubscriberHash(email);
      return await this.request<MailchimpMember>(
        `/lists/${this.audienceId}/members/${subscriberHash}`
      );
    } catch (error) {
      if ((error as Error).message.includes("404") || (error as Error).message.includes("Resource Not Found")) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Unsubscribe member
   */
  async unsubscribe(email: string): Promise<void> {
    await this.updateSubscriber(email, { status: "unsubscribed" });
    console.log(`[Mailchimp] Unsubscribed: ${email.substring(0, 3)}***`);
  }

  /**
   * Get all subscribers
   */
  async getSubscribers(
    options: { count?: number; offset?: number; status?: string } = {}
  ): Promise<{ members: MailchimpMember[]; total_items: number }> {
    const params = new URLSearchParams({
      count: String(options.count || 100),
      offset: String(options.offset || 0),
    });

    if (options.status) {
      params.set("status", options.status);
    }

    return this.request(`/lists/${this.audienceId}/members?${params.toString()}`);
  }

  /**
   * Get campaigns
   */
  async getCampaigns(
    options: { count?: number; status?: string } = {}
  ): Promise<{ campaigns: MailchimpCampaign[]; total_items: number }> {
    const params = new URLSearchParams({
      count: String(options.count || 20),
      list_id: this.audienceId,
    });

    if (options.status) {
      // Mailchimp uses "save" for drafts, but our UI uses "draft" for consistency.
      // Translate "draft" → "save" for the API call.
      const apiStatus = options.status === "draft" ? "save" : options.status;
      params.set("status", apiStatus);
    }

    return this.request(`/campaigns?${params.toString()}`);
  }

  /**
   * Create campaign draft
   */
  async createCampaign(data: {
    subject: string;
    previewText?: string;
    title: string;
    segmentId?: number;
    tagIds?: number[];
    tags?: string[];
  }): Promise<MailchimpCampaign> {
    const recipients: Record<string, unknown> = {
      list_id: this.audienceId,
    };

    // If a saved segment ID is provided, use it directly
    if (data.segmentId) {
      recipients.segment_opts = {
        saved_segment_id: data.segmentId,
      };
    }
    // If tag IDs are provided, create a segment condition with numeric IDs
    else if (data.tagIds && data.tagIds.length > 0) {
      recipients.segment_opts = {
        match: "any",
        conditions: data.tagIds.map((tagId) => ({
          condition_type: "StaticSegment",
          field: "static_segment",
          op: "static_is",
          value: tagId,
        })),
      };
    }
    // Legacy: if tag names are provided, resolve them to IDs first
    else if (data.tags && data.tags.length > 0) {
      try {
        const tagData = await this.getTags();
        const tagIdMap = new Map(tagData.tags.map(t => [t.name, t.id]));
        const resolvedIds = data.tags
          .map(name => tagIdMap.get(name))
          .filter((id): id is number => id !== undefined);

        if (resolvedIds.length > 0) {
          recipients.segment_opts = {
            match: "any",
            conditions: resolvedIds.map((tagId) => ({
              condition_type: "StaticSegment",
              field: "static_segment",
              op: "static_is",
              value: tagId,
            })),
          };
        }
      } catch (err) {
        console.warn("[Mailchimp] Failed to resolve tag names to IDs, sending to full list:", err);
      }
    }

    return this.request<MailchimpCampaign>("/campaigns", {
      method: "POST",
      body: {
        type: "regular",
        recipients,
        settings: {
          subject_line: data.subject,
          preview_text: data.previewText || "",
          title: data.title,
          from_name: "Sonido Líquido Crew",
          reply_to: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "info@sonidoliquido.com",
        },
      },
    });
  }

  /**
   * Set campaign HTML content
   */
  async setCampaignContent(campaignId: string, htmlContent: string): Promise<void> {
    await this.request(`/campaigns/${campaignId}/content`, {
      method: "PUT",
      body: {
        html: htmlContent,
      },
    });
    console.log(`[Mailchimp] Campaign content set for: ${campaignId}`);
  }

  /**
   * Send campaign immediately
   */
  async sendCampaign(campaignId: string): Promise<void> {
    await this.request(`/campaigns/${campaignId}/actions/send`, {
      method: "POST",
    });
    console.log(`[Mailchimp] Campaign sent: ${campaignId}`);
  }

  /**
   * Schedule campaign for later
   */
  async scheduleCampaign(campaignId: string, scheduleTime: Date): Promise<void> {
    await this.request(`/campaigns/${campaignId}/actions/schedule`, {
      method: "POST",
      body: {
        schedule_time: scheduleTime.toISOString(),
      },
    });
    console.log(`[Mailchimp] Campaign scheduled: ${campaignId} for ${scheduleTime.toISOString()}`);
  }

  /**
   * Get campaign report
   */
  async getCampaignReport(campaignId: string): Promise<{
    id: string;
    emails_sent: number;
    opens: { total_opens: number; unique_opens: number; open_rate: number };
    clicks: { clicks_total: number; unique_clicks: number; click_rate: number };
    bounces: { hard_bounces: number; soft_bounces: number };
    unsubscribed: number;
  }> {
    return this.request(`/reports/${campaignId}`);
  }

  /**
   * Create and send a full email campaign
   */
  async createAndSendCampaign(data: {
    subject: string;
    previewText?: string;
    title: string;
    htmlContent: string;
    tags?: string[];
    scheduleTime?: Date;
  }): Promise<{ campaignId: string; webId: number; status: "sent" | "scheduled" }> {
    // Step 1: Create campaign
    const campaign = await this.createCampaign({
      subject: data.subject,
      previewText: data.previewText,
      title: data.title,
      tags: data.tags,
    });

    // Step 2: Set content
    await this.setCampaignContent(campaign.id, data.htmlContent);

    // Step 3: Send or schedule
    if (data.scheduleTime) {
      await this.scheduleCampaign(campaign.id, data.scheduleTime);
      return { campaignId: campaign.id, webId: campaign.web_id, status: "scheduled" };
    } else {
      await this.sendCampaign(campaign.id);
      return { campaignId: campaign.id, webId: campaign.web_id, status: "sent" };
    }
  }

  /**
   * Generate HTML email from template
   */
  generateEmailHTML(data: {
    title: string;
    artistName: string;
    releaseDate: string;
    presaveUrl: string;
    coverImageUrl?: string;
    body: string;
  }): string {
    const { title, artistName, releaseDate, presaveUrl, coverImageUrl, body } = data;

    // Convert markdown-like formatting to HTML
    const formattedBody = body
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\n\n/g, "</p><p>")
      .replace(/\n/g, "<br>")
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" style="color: #ff6b00; text-decoration: underline;">$1</a>')
      .replace(/^### (.*?)$/gm, '<h3 style="color: #ff6b00; margin: 20px 0 10px;">$1</h3>')
      .replace(/^# (.*?)$/gm, '<h1 style="color: #ff6b00; margin: 20px 0 10px;">$1</h1>');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - ${artistName}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #1a1a1a; border-radius: 16px; overflow: hidden; max-width: 100%;">

          <!-- Header -->
          <tr>
            <td style="padding: 30px 40px; text-align: center; background: linear-gradient(135deg, #ff6b00 0%, #ff8f00 100%);">
              <img src="https://sonidoliquido.com/images/logo-white.png" alt="Sonido Líquido Crew" width="180" style="max-width: 100%;">
            </td>
          </tr>

          ${coverImageUrl ? `
          <!-- Cover Image -->
          <tr>
            <td style="padding: 30px 40px 0;">
              <img src="${coverImageUrl}" alt="${title}" style="width: 100%; max-width: 400px; display: block; margin: 0 auto; border-radius: 8px; box-shadow: 0 4px 20px rgba(255, 107, 0, 0.3);">
            </td>
          </tr>
          ` : ""}

          <!-- Content -->
          <tr>
            <td style="padding: 30px 40px; color: #ffffff;">
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #cccccc;">
                ${formattedBody}
              </p>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td style="padding: 0 40px 30px; text-align: center;">
              <a href="${presaveUrl}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #ff6b00 0%, #ff8f00 100%); color: #ffffff; text-decoration: none; font-weight: bold; font-size: 18px; border-radius: 50px; text-transform: uppercase; letter-spacing: 1px;">
                PRE-SAVE AHORA
              </a>
            </td>
          </tr>

          <!-- Release Info -->
          <tr>
            <td style="padding: 20px 40px; background-color: #111111; text-align: center;">
              <p style="margin: 0; color: #888888; font-size: 14px;">
                <strong style="color: #ff6b00;">${title}</strong> by ${artistName}<br>
                Fecha de lanzamiento: ${releaseDate}
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #0a0a0a; text-align: center;">
              <p style="margin: 0 0 15px; color: #666666; font-size: 12px;">
                Sonido Líquido Crew - Hip Hop México desde 1999
              </p>
              <p style="margin: 0; color: #444444; font-size: 11px;">
                <a href="https://sonidoliquido.com" style="color: #ff6b00; text-decoration: none;">sonidoliquido.com</a> |
                <a href="|UNSUB|" style="color: #666666; text-decoration: none;">Darse de baja</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
  }

  /**
   * Test the connection to Mailchimp
   */
  async testConnection(): Promise<{ success: boolean; audienceName?: string; memberCount?: number; error?: string }> {
    try {
      const audience = await this.getAudience();
      return {
        success: true,
        audienceName: audience.name,
        memberCount: audience.stats.member_count,
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Get a single campaign's details
   */
  async getCampaignDetails(campaignId: string): Promise<MailchimpCampaign> {
    return this.request<MailchimpCampaign>(`/campaigns/${campaignId}`);
  }

  /**
   * Get campaign HTML content
   */
  async getCampaignContent(campaignId: string): Promise<{ html: string }> {
    return this.request<{ html: string }>(`/campaigns/${campaignId}/content`);
  }

  /**
   * Delete a campaign draft
   */
  async deleteCampaign(campaignId: string): Promise<void> {
    await this.request(`/campaigns/${campaignId}`, { method: "DELETE" });
    console.log(`[Mailchimp] Campaign deleted: ${campaignId}`);
  }

  /**
   * Unschedule a scheduled campaign
   */
  async unscheduleCampaign(campaignId: string): Promise<void> {
    await this.request(`/campaigns/${campaignId}/actions/unschedule`, {
      method: "POST",
    });
    console.log(`[Mailchimp] Campaign unscheduled: ${campaignId}`);
  }

  /**
   * Cancel a campaign send (for campaigns in "sending" state)
   */
  async cancelCampaign(campaignId: string): Promise<void> {
    await this.request(`/campaigns/${campaignId}/actions/cancel-send`, {
      method: "POST",
    });
    console.log(`[Mailchimp] Campaign cancelled: ${campaignId}`);
  }

  /**
   * Replicate an existing campaign (create a copy)
   */
  async replicateCampaign(campaignId: string): Promise<MailchimpCampaign> {
    return this.request<MailchimpCampaign>(`/campaigns/${campaignId}/actions/replicate`, {
      method: "POST",
    });
  }

  /**
   * Get tags for the audience with accurate member counts.
   * The /tag-search endpoint may not return reliable member counts per tag,
   * so we fetch all subscribed members and count per tag ourselves.
   */
  async getTags(): Promise<{ tags: { id: number; name: string; count: number }[]; total_items: number }> {
    // First, get the tag list from tag-search
    const tagSearchResult = await this.request<{
      tags: { id: number; name: string; count?: number; total_items?: number }[];
      total_items: number;
    }>(`/lists/${this.audienceId}/tag-search`);

    // If no tags, return early
    if (!tagSearchResult.tags || tagSearchResult.tags.length === 0) {
      return { tags: [], total_items: 0 };
    }

    // Build a map of tag id -> tag data
    const tagMap = new Map<number, { id: number; name: string; count: number }>();
    for (const tag of tagSearchResult.tags) {
      // Try both 'count' and 'total_items' fields (API version dependent)
      const memberCount = tag.count ?? tag.total_items ?? 0;
      tagMap.set(tag.id, { id: tag.id, name: tag.name, count: memberCount });
    }

    // Fetch all subscribed members and count per tag for accuracy
    try {
      const allMembers = await this.getAllMembers();
      // Reset all counts to 0
      for (const [id] of tagMap) {
        const existing = tagMap.get(id)!;
        tagMap.set(id, { ...existing, count: 0 });
      }
      // Count members per tag
      for (const member of allMembers) {
        if (member.tags && Array.isArray(member.tags)) {
          for (const tag of member.tags) {
            const tagData = tagMap.get(tag.id);
            if (tagData) {
              tagMap.set(tag.id, { ...tagData, count: tagData.count + 1 });
            }
          }
        }
      }
    } catch (err) {
      // If member fetch fails, keep the tag-search counts as fallback
      console.warn("[Mailchimp] Failed to fetch members for tag counts, using tag-search counts:", err);
    }

    return {
      tags: Array.from(tagMap.values()),
      total_items: tagSearchResult.total_items || tagMap.size,
    };
  }

  /**
   * Get ALL subscribed members (handles pagination automatically)
   */
  private async getAllMembers(): Promise<MailchimpMember[]> {
    const allMembers: MailchimpMember[] = [];
    let offset = 0;
    const batchSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const result = await this.request<{ members: MailchimpMember[]; total_items: number }>(
        `/lists/${this.audienceId}/members?count=${batchSize}&offset=${offset}&status=subscribed&fields=members.id,members.tags`
      );

      if (result.members && result.members.length > 0) {
        allMembers.push(...result.members);
        offset += result.members.length;
        hasMore = allMembers.length < result.total_items;
      } else {
        hasMore = false;
      }
    }

    return allMembers;
  }

  /**
   * Get segments for the audience
   */
  async getSegments(): Promise<{
    segments: {
      id: number;
      name: string;
      type: string;
      member_count: number;
      created_at: string;
      updated_at: string;
    }[];
    total_items: number;
  }> {
    return this.request(`/lists/${this.audienceId}/segments`);
  }

  /**
   * Get audience growth history (last 12 months)
   */
  async getGrowthHistory(): Promise<{
    history: {
      month: string;
      existing: number;
      imports: number;
      optins: number;
    }[];
  }> {
    return this.request(`/lists/${this.audienceId}/growth-history?count=12`);
  }

  /**
   * Get recent activity for the audience
   */
  async getActivity(): Promise<{
    activity: {
      day: string;
      emails_sent: number;
      unique_opens: number;
      recipient_clicks: number;
      hard_bounce: number;
      soft_bounce: number;
      subs: number;
      unsubs: number;
    }[];
  }> {
    return this.request(`/lists/${this.audienceId}/activity?count=30`);
  }

  /**
   * Generate a custom HTML email template (not release-specific)
   * Now accepts and uses styleSettings for visual customization
   */
  generateCustomEmailHTML(data: {
    title: string;
    body: string;
    ctaText?: string;
    ctaUrl?: string;
    coverImageUrl?: string;
    styleSettings?: Partial<import("@/lib/style-config").StyleSettings> | null;
  }): string {
    const { title, body, ctaText, ctaUrl, coverImageUrl, styleSettings } = data;

    // Merge with defaults
    const s = { ...defaultStyleSettings, ...styleSettings };

    // Resolve colors
    const primaryColor = s.primaryColor || "#f97316";
    const secondaryColor = s.secondaryColor || "#ea580c";
    const accentColor = s.accentColor || "#22c55e";
    const textColor = s.textColor || "#ffffff";
    const darkMode = s.darkMode !== false; // default true

    // Background colors based on darkMode
    const bgColor = darkMode ? "#0a0a0a" : "#f5f5f5";
    const cardBgColor = darkMode ? "#1a1a1a" : "#ffffff";
    const footerBgColor = darkMode ? "#0a0a0a" : "#eeeeee";
    const bodyTextColor = darkMode ? "#cccccc" : "#555555";
    const footerTextColor = darkMode ? "#666666" : "#999999";
    const footerSubTextColor = darkMode ? "#444444" : "#aaaaaa";
    const headerTextColor = "#ffffff"; // Header always has white text on gradient

    // Font mapping for email (Google Font family names)
    const fontMap: Record<string, string> = {
      "oswald": "'Oswald', sans-serif",
      "bebas": "'Bebas Neue', sans-serif",
      "anton": "'Anton', sans-serif",
      "archivo-black": "'Archivo Black', sans-serif",
      "righteous": "'Righteous', sans-serif",
      "black-ops-one": "'Black Ops One', sans-serif",
      "bangers": "'Bangers', sans-serif",
      "permanent-marker": "'Permanent Marker', sans-serif",
      "inter": "'Inter', sans-serif",
      "montserrat": "'Montserrat', sans-serif",
      "poppins": "'Poppins', sans-serif",
      "raleway": "'Raleway', sans-serif",
      "space-grotesk": "'Space Grotesk', sans-serif",
      "dm-sans": "'DM Sans', sans-serif",
      "outfit": "'Outfit', sans-serif",
      "sora": "'Sora', sans-serif",
      "playfair": "'Playfair Display', serif",
      "libre-baskerville": "'Libre Baskerville', serif",
      "cormorant": "'Cormorant Garamond', serif",
      "cinzel": "'Cinzel', serif",
      "merriweather": "'Merriweather', serif",
      "roboto-mono": "'Roboto Mono', monospace",
      "jetbrains-mono": "'JetBrains Mono', monospace",
      "fira-code": "'Fira Code', monospace",
      "source-code": "'Source Code Pro', monospace",
      "dancing-script": "'Dancing Script', sans-serif",
      "pacifico": "'Pacifico', sans-serif",
      "caveat": "'Caveat', sans-serif",
    };

    const titleFontFamily = fontMap[s.titleFont] || "'Oswald', sans-serif";
    const bodyFontFamily = fontMap[s.bodyFont] || "'Inter', sans-serif";

    // Build Google Fonts link for used fonts
    const googleFontUrl = this.buildGoogleFontsLink(s.titleFont, s.bodyFont);

    // Button style mapping for email (inline CSS)
    const buttonRoundedMap: Record<string, string> = {
      "none": "0px",
      "sm": "4px",
      "md": "6px",
      "lg": "8px",
      "full": "50px",
    };
    const buttonRadius = buttonRoundedMap[s.buttonRounded] || "8px";

    let buttonStyle = "";
    switch (s.buttonStyle) {
      case "solid":
        buttonStyle = `background: ${primaryColor}; color: #ffffff; border: none;`;
        break;
      case "gradient":
        buttonStyle = `background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%); color: #ffffff; border: none;`;
        break;
      case "outline":
        buttonStyle = `background: transparent; border: 2px solid ${primaryColor}; color: ${primaryColor};`;
        break;
      case "glass":
        buttonStyle = `background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #ffffff;`;
        break;
      default:
        buttonStyle = `background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%); color: #ffffff; border: none;`;
    }

    // Cover image shadow color
    const coverShadowColor = darkMode
      ? `rgba(${parseInt(primaryColor.slice(1,3),16)}, ${parseInt(primaryColor.slice(3,5),16)}, ${parseInt(primaryColor.slice(5,7),16)}, 0.3)`
      : `rgba(0, 0, 0, 0.1)`;

    const formattedBody = body
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\n\n/g, "</p><p>")
      .replace(/\n/g, "<br>")
      .replace(/\[(.*?)\]\((.*?)\)/g, `<a href="$2" style="color: ${primaryColor}; text-decoration: underline;">$1</a>`)
      .replace(/^### (.*?)$/gm, `<h3 style="color: ${primaryColor}; margin: 20px 0 10px;">$1</h3>`)
      .replace(/^# (.*?)$/gm, `<h1 style="color: ${primaryColor}; margin: 20px 0 10px;">$1</h1>`);

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  ${googleFontUrl ? `<link href="${googleFontUrl}" rel="stylesheet">` : ""}
  <!--[if mso]>
  <style type="text/css">
    body, table, td { font-family: ${bodyFontFamily.replace(/'/g, "")} !important; }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: ${bgColor}; font-family: ${bodyFontFamily}, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${bgColor};">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: ${cardBgColor}; border-radius: 16px; overflow: hidden; max-width: 100%;">

          <!-- Header -->
          <tr>
            <td style="padding: 30px 40px; text-align: center; background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%);">
              <h1 style="margin: 0; color: ${headerTextColor}; font-size: 24px; font-family: ${titleFontFamily}, sans-serif;">SONIDO LIQUIDO CREW</h1>
            </td>
          </tr>

          ${coverImageUrl ? `
          <!-- Cover Image -->
          <tr>
            <td style="padding: 30px 40px 0;">
              <img src="${coverImageUrl}" alt="${title}" style="width: 100%; max-width: 500px; display: block; margin: 0 auto; border-radius: 8px; box-shadow: 0 4px 20px ${coverShadowColor};">
            </td>
          </tr>
          ` : ""}

          <!-- Title -->
          <tr>
            <td style="padding: 30px 40px 10px; text-align: center;">
              <h1 style="margin: 0; color: ${primaryColor}; font-size: 28px; font-weight: bold; font-family: ${titleFontFamily}, sans-serif;">${title}</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 10px 40px 30px; color: ${textColor};">
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: ${bodyTextColor}; font-family: ${bodyFontFamily}, sans-serif;">
                ${formattedBody}
              </p>
            </td>
          </tr>

          ${ctaText && ctaUrl ? `
          <!-- CTA Button -->
          <tr>
            <td style="padding: 0 40px 30px; text-align: center;">
              <a href="${ctaUrl}" style="display: inline-block; padding: 16px 40px; ${buttonStyle} text-decoration: none; font-weight: bold; font-size: 18px; border-radius: ${buttonRadius}; text-transform: uppercase; letter-spacing: 1px; font-family: ${titleFontFamily}, sans-serif;">
                ${ctaText}
              </a>
            </td>
          </tr>
          ` : ""}

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: ${footerBgColor}; text-align: center;">
              <p style="margin: 0 0 15px; color: ${footerTextColor}; font-size: 12px;">
                Sonido Liquido Crew - Hip Hop Mexico desde 1999
              </p>
              <p style="margin: 0; color: ${footerSubTextColor}; font-size: 11px;">
                <a href="https://sonidoliquido.com" style="color: ${primaryColor}; text-decoration: none;">sonidoliquido.com</a> |
                <a href="|UNSUB|" style="color: ${footerTextColor}; text-decoration: none;">Darse de baja</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
  }

  /**
   * Build a Google Fonts CSS link for the given font values
   */
  private buildGoogleFontsLink(titleFont?: string, bodyFont?: string): string {
    const fontUrlMap: Record<string, string> = {
      "oswald": "Oswald:wght@400;500;600;700",
      "bebas": "Bebas+Neue",
      "anton": "Anton",
      "archivo-black": "Archivo+Black",
      "righteous": "Righteous",
      "black-ops-one": "Black+Ops+One",
      "bangers": "Bangers",
      "permanent-marker": "Permanent+Marker",
      "inter": "Inter:wght@400;500;600;700",
      "montserrat": "Montserrat:wght@400;500;600;700",
      "poppins": "Poppins:wght@400;500;600;700",
      "raleway": "Raleway:wght@400;500;600;700",
      "space-grotesk": "Space+Grotesk:wght@400;500;600;700",
      "dm-sans": "DM+Sans:wght@400;500;600;700",
      "outfit": "Outfit:wght@400;500;600;700",
      "sora": "Sora:wght@400;500;600;700",
      "playfair": "Playfair+Display:wght@400;500;600;700",
      "libre-baskerville": "Libre+Baskerville:wght@400;700",
      "cormorant": "Cormorant+Garamond:wght@400;500;600;700",
      "cinzel": "Cinzel:wght@400;500;600;700",
      "merriweather": "Merriweather:wght@400;700",
      "roboto-mono": "Roboto+Mono:wght@400;500;600;700",
      "jetbrains-mono": "JetBrains+Mono:wght@400;500;600;700",
      "fira-code": "Fira+Code:wght@400;500;600;700",
      "source-code": "Source+Code+Pro:wght@400;500;600;700",
      "dancing-script": "Dancing+Script:wght@400;500;600;700",
      "pacifico": "Pacifico",
      "caveat": "Caveat:wght@400;500;600;700",
    };

    const families: string[] = [];
    const seen = new Set<string>();
    for (const font of [titleFont, bodyFont]) {
      if (font && fontUrlMap[font] && !seen.has(font)) {
        families.push(`family=${fontUrlMap[font]}`);
        seen.add(font);
      }
    }

    if (families.length === 0) return "";
    return `https://fonts.googleapis.com/css2?${families.join("&")}&display=swap`;
  }

  /**
   * Get MD5 hash of email for subscriber ID (Mailchimp requires lowercase MD5)
   */
  private getSubscriberHash(email: string): string {
    return createHash("md5").update(email.toLowerCase()).digest("hex");
  }
}

// Export singleton instance
export const mailchimpClient = new MailchimpClient();

// Export class for testing
export { MailchimpClient };

// Export default tag constant
export const MAILCHIMP_DEFAULT_TAG = DEFAULT_TAG;
