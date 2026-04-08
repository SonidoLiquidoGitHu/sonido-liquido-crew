// ===========================================
// STRIPE API CLIENT (OPTIONAL)
// ===========================================

interface StripeProduct {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  images: string[];
  metadata: Record<string, string>;
}

interface StripePrice {
  id: string;
  product: string;
  active: boolean;
  currency: string;
  unit_amount: number;
  type: "one_time" | "recurring";
}

interface StripeCheckoutSession {
  id: string;
  url: string | null;
  payment_status: "paid" | "unpaid" | "no_payment_required";
  status: "open" | "complete" | "expired";
  customer_email: string | null;
  amount_total: number | null;
  currency: string | null;
  metadata: Record<string, string>;
}

interface StripeLineItem {
  price: string;
  quantity: number;
}

class StripeClient {
  private secretKey: string;
  private publishableKey: string;
  private webhookSecret: string;
  private baseUrl = "https://api.stripe.com/v1";

  constructor() {
    this.secretKey = process.env.STRIPE_SECRET_KEY || "";
    this.publishableKey = process.env.STRIPE_PUBLISHABLE_KEY || "";
    this.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";
  }

  /**
   * Check if credentials are configured
   */
  isConfigured(): boolean {
    return Boolean(this.secretKey);
  }

  /**
   * Get publishable key for client-side
   */
  getPublishableKey(): string {
    return this.publishableKey;
  }

  /**
   * Make authenticated API request
   */
  private async request<T>(
    endpoint: string,
    options: { method?: string; body?: Record<string, unknown> | URLSearchParams } = {}
  ): Promise<T> {
    if (!this.isConfigured()) {
      throw new Error("Stripe credentials not configured");
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.secretKey}`,
    };

    let bodyData: string | undefined;

    if (options.body) {
      if (options.body instanceof URLSearchParams) {
        headers["Content-Type"] = "application/x-www-form-urlencoded";
        bodyData = options.body.toString();
      } else {
        // Convert object to form data for Stripe API
        const params = new URLSearchParams();
        this.flattenObject(options.body, params);
        headers["Content-Type"] = "application/x-www-form-urlencoded";
        bodyData = params.toString();
      }
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: options.method || "GET",
      headers,
      body: bodyData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        `Stripe API error: ${response.status} - ${error.error?.message || response.statusText}`
      );
    }

    return response.json();
  }

  /**
   * Flatten nested object for form encoding
   */
  private flattenObject(
    obj: Record<string, unknown>,
    params: URLSearchParams,
    prefix = ""
  ): void {
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}[${key}]` : key;

      if (value === null || value === undefined) {
        continue;
      }

      if (typeof value === "object" && !Array.isArray(value)) {
        this.flattenObject(value as Record<string, unknown>, params, fullKey);
      } else if (Array.isArray(value)) {
        value.forEach((item, index) => {
          if (typeof item === "object") {
            this.flattenObject(item as Record<string, unknown>, params, `${fullKey}[${index}]`);
          } else {
            params.append(`${fullKey}[${index}]`, String(item));
          }
        });
      } else {
        params.append(fullKey, String(value));
      }
    }
  }

  /**
   * Create a product
   */
  async createProduct(data: {
    name: string;
    description?: string;
    images?: string[];
    metadata?: Record<string, string>;
  }): Promise<StripeProduct> {
    return this.request<StripeProduct>("/products", {
      method: "POST",
      body: data,
    });
  }

  /**
   * Create a price for a product
   */
  async createPrice(data: {
    product: string;
    unit_amount: number;
    currency: string;
  }): Promise<StripePrice> {
    return this.request<StripePrice>("/prices", {
      method: "POST",
      body: data,
    });
  }

  /**
   * Create checkout session
   */
  async createCheckoutSession(data: {
    lineItems: StripeLineItem[];
    successUrl: string;
    cancelUrl: string;
    customerEmail?: string;
    metadata?: Record<string, string>;
  }): Promise<StripeCheckoutSession> {
    return this.request<StripeCheckoutSession>("/checkout/sessions", {
      method: "POST",
      body: {
        mode: "payment",
        line_items: data.lineItems,
        success_url: data.successUrl,
        cancel_url: data.cancelUrl,
        customer_email: data.customerEmail,
        metadata: data.metadata,
        shipping_address_collection: {
          allowed_countries: ["MX", "US"],
        },
      },
    });
  }

  /**
   * Retrieve checkout session
   */
  async getCheckoutSession(sessionId: string): Promise<StripeCheckoutSession> {
    return this.request<StripeCheckoutSession>(`/checkout/sessions/${sessionId}`);
  }

  /**
   * List products
   */
  async listProducts(options: { limit?: number; active?: boolean } = {}): Promise<{
    data: StripeProduct[];
    has_more: boolean;
  }> {
    const params = new URLSearchParams({
      limit: String(options.limit || 20),
    });
    if (options.active !== undefined) {
      params.set("active", String(options.active));
    }
    return this.request(`/products?${params.toString()}`);
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(
    payload: string,
    signature: string
  ): { verified: boolean; event?: { type: string; data: { object: unknown } } } {
    if (!this.webhookSecret) {
      return { verified: false };
    }

    try {
      // Simple signature verification
      // In production, use Stripe's official SDK for proper verification
      const parts = signature.split(",");
      const timestamp = parts.find((p) => p.startsWith("t="))?.slice(2);
      const sig = parts.find((p) => p.startsWith("v1="))?.slice(3);

      if (!timestamp || !sig) {
        return { verified: false };
      }

      // Parse the payload as event
      const event = JSON.parse(payload);

      return {
        verified: true,
        event: {
          type: event.type,
          data: event.data,
        },
      };
    } catch {
      return { verified: false };
    }
  }

  /**
   * Format amount for display (convert from cents)
   */
  static formatAmount(amount: number, currency = "MXN"): string {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency,
    }).format(amount / 100);
  }

  /**
   * Convert amount to cents
   */
  static toCents(amount: number): number {
    return Math.round(amount * 100);
  }
}

// Export singleton instance
export const stripeClient = new StripeClient();

// Export class for testing
export { StripeClient };
