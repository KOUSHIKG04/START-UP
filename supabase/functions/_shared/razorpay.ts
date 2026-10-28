export type ProviderEntity = {
  id: string;
  entity?: string;
  amount: number;
  currency: string;
  status: string;
  order_id?: string;
  payment_id?: string;
  receipt?: string;
  captured?: boolean;
  amount_refunded?: number;
  fee?: number;
  fees?: number;
  tax?: number;
  source?: string;
  recipient?: string;
  transfer_id?: string;
  amount_reversed?: number;
  notes?: Record<string, string>;
  settlement_status?: string;
  recipient_settlement_id?: string | null;
};

export type ProviderConfig = {
  keyId: string;
  keySecret: string;
  mode: "test" | "live";
};

export class PaymentError extends Error {
  constructor(
    message: string,
    public status = 400
  ) {
    super(message);
  }
}

export function providerConfig(
  env: (name: string) => string | undefined
): ProviderConfig {
  const keyId = env("RAZORPAY_KEY_ID") ?? "";
  const keySecret = env("RAZORPAY_KEY_SECRET") ?? "";
  const mode = env("RAZORPAY_MODE") ?? "test";
  if (
    !keySecret ||
    !keyId.startsWith(`rzp_${mode}_`) ||
    (mode !== "test" && mode !== "live")
  )
    throw new PaymentError("Payments are temporarily unavailable.", 503);
  if (mode === "live" && env("RAZORPAY_LIVE_ENABLED") !== "true")
    throw new PaymentError("Live payments have not been enabled.", 503);
  return { keyId, keySecret, mode };
}

export async function hmacHex(secret: string, message: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signed = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return Array.from(new Uint8Array(signed), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}

export function secureEqual(expected: string, received: string) {
  if (!/^[a-f0-9]{64}$/i.test(received) || expected.length !== received.length)
    return false;
  let difference = 0;
  for (let index = 0; index < expected.length; index++)
    difference |=
      expected.charCodeAt(index) ^ received.toLowerCase().charCodeAt(index);
  return difference === 0;
}

export async function verifyWebhook(
  raw: string,
  signature: string,
  secrets: string[]
) {
  if (!secrets.length)
    throw new PaymentError("Webhook verification is not configured.", 503);
  for (const secret of secrets)
    if (secureEqual(await hmacHex(secret, raw), signature)) return;
  throw new PaymentError("Invalid webhook signature.", 401);
}

export async function digestHex(raw: string) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw))
    ),
    (byte) => byte.toString(16).padStart(2, "0")
  ).join("");
}

export function providerClient(
  config: ProviderConfig,
  fetcher: typeof fetch = fetch
) {
  return async function request(
    path: string,
    body?: Record<string, unknown>
  ): Promise<ProviderEntity & { items?: ProviderEntity[] }> {
    if (!/^\/(orders|payments|refunds|transfers)(\/|\?|$)/.test(path))
      throw new PaymentError("Invalid provider operation.");
    const response = await fetcher(`https://api.razorpay.com/v1${path}`, {
      method: body ? "POST" : "GET",
      headers: {
        authorization: `Basic ${btoa(`${config.keyId}:${config.keySecret}`)}`,
        "content-type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok)
      throw new PaymentError(
        "The payment provider could not complete this request. Refresh the payment status before retrying.",
        502
      );
    return await response.json();
  };
}

export type ProviderRequest = ReturnType<typeof providerClient>;

export async function fetchRouteProduct(
  config: ProviderConfig,
  accountId: string,
  productId: string,
  fetcher: typeof fetch = fetch
): Promise<Record<string, unknown>> {
  if (
    !/^acc_[A-Za-z0-9]+$/.test(accountId) ||
    !/^acc_prd_[A-Za-z0-9]+$/.test(productId)
  )
    throw new PaymentError("Invalid recipient identifiers.");
  const response = await fetcher(
    `https://api.razorpay.com/v2/accounts/${accountId}/products/${productId}`,
    {
      headers: {
        authorization: `Basic ${btoa(`${config.keyId}:${config.keySecret}`)}`,
      },
      signal: AbortSignal.timeout(15000),
    }
  );
  if (!response.ok)
    throw new PaymentError(
      "Recipient verification failed. Check the Route account in Razorpay.",
      502
    );
  const product = await response.json();
  // Store only activation evidence, never the returned bank/KYC configuration.
  return {
    id: product.id,
    account_id: product.account_id,
    product_name: product.product_name,
    activation_status: product.activation_status,
    tnc: { accepted: product.tnc?.accepted === true },
  };
}
