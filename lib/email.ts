import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = "Russeartister.no <noreply@russeartister.no>";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "russeartister@gmail.com";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://russeartister.no";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PurchaseEmailData {
  orderNumber: string;
  itemTitle: string;
  producerName: string;
  itemType: "beat" | "remake" | "sample";
  amountNok: number;
  customerEmail: string;
  downloadUrl: string;
  fileSignedUrl: string;
}

type EmailPayload = { from: string; to: string; subject: string; html: string };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function itemTypeLabel(t: string) {
  if (t === "remake") return "Prosjekt";
  if (t === "sample") return "Sample / Preset";
  return "Låt";
}

function formatNok(amount: number) {
  return `kr ${amount.toLocaleString("nb-NO")}`;
}

// ─── Batch sender ─────────────────────────────────────────────────────────────

/** Send all emails in one Resend batch API call — avoids rate limits. */
export async function sendBatch(emails: EmailPayload[]) {
  if (emails.length === 0) return;
  const { error } = await resend.batch.send(emails);
  if (error) throw new Error(`Resend batch failed: ${JSON.stringify(error)}`);
}

// ─── Payload builders (no network calls) ─────────────────────────────────────

export function buildPurchaseReceiptEmail(data: PurchaseEmailData): EmailPayload {
  const label = itemTypeLabel(data.itemType);
  const complaintDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleString("nb-NO", {
    dateStyle: "long",
    timeStyle: "short",
  });

  return {
    from: FROM,
    to: data.customerEmail,
    subject: `Takk for kjøpet! Bestilling ${data.orderNumber}`,
    html: `
<!DOCTYPE html>
<html lang="no">
<body style="font-family:sans-serif;background:#080808;color:#f5f5f7;margin:0;padding:32px;">
  <div style="max-width:520px;margin:0 auto;">
    <h1 style="font-size:22px;margin-bottom:4px;">Takk for kjøpet!</h1>
    <p style="color:#86868b;margin-top:0;">Bestilling ${data.orderNumber}</p>

    <div style="background:#141414;border:1px solid #2a2a2a;border-radius:12px;padding:20px;margin:24px 0;">
      <p style="margin:0 0 4px;color:#86868b;font-size:12px;text-transform:uppercase;letter-spacing:.05em;">${label}</p>
      <p style="margin:0 0 8px;font-size:18px;font-weight:600;">${data.itemTitle}</p>
      <p style="margin:0;color:#86868b;">Produsert av ${data.producerName}</p>
      <p style="margin:8px 0 0;font-size:20px;font-weight:700;">${formatNok(data.amountNok)}</p>
    </div>

    <a href="${data.downloadUrl}"
       style="display:block;text-align:center;background:#f5f5f7;color:#080808;font-weight:600;font-size:15px;padding:14px 24px;border-radius:10px;text-decoration:none;margin-bottom:24px;">
      Last ned filen
    </a>

    <p style="color:#86868b;font-size:13px;">Nedlastningslenken er gyldig i 7 dager. Du kan alltid laste ned igjen fra <a href="${APP_URL}/nedlastninger" style="color:#818cf8;">Mine nedlastninger</a>.</p>

    <hr style="border:none;border-top:1px solid #2a2a2a;margin:28px 0;" />

    <p style="color:#3a3a3a;font-size:12px;">
      Fikk du ikke det du kjøpte, eller mottok du noe annet? Du kan klage på kjøpet innen 24 timer (frist: ${complaintDeadline}).
      <a href="${APP_URL}/klage?order=${data.orderNumber}" style="color:#818cf8;">Klikk her for å sende klage</a>.
    </p>
  </div>
</body>
</html>`,
  };
}

export function buildProducerSaleEmail({
  producerEmail,
  orderNumber,
  itemTitle,
  itemType,
  amountNok,
  platformFeeNok,
}: {
  producerEmail: string;
  orderNumber: string;
  itemTitle: string;
  itemType: "beat" | "remake" | "sample";
  amountNok: number;
  platformFeeNok: number;
}): EmailPayload {
  const label = itemTypeLabel(itemType);
  const payoutNok = amountNok - platformFeeNok;

  return {
    from: FROM,
    to: producerEmail,
    subject: `Du solgte "${itemTitle}"! Bestilling ${orderNumber}`,
    html: `
<!DOCTYPE html>
<html lang="no">
<body style="font-family:sans-serif;background:#080808;color:#f5f5f7;margin:0;padding:32px;">
  <div style="max-width:520px;margin:0 auto;">
    <h1 style="font-size:22px;margin-bottom:4px;">Du fikk et salg!</h1>
    <p style="color:#86868b;margin-top:0;">Bestilling ${orderNumber}</p>

    <div style="background:#141414;border:1px solid #2a2a2a;border-radius:12px;padding:20px;margin:24px 0;">
      <p style="margin:0 0 4px;color:#86868b;font-size:12px;text-transform:uppercase;letter-spacing:.05em;">${label}</p>
      <p style="margin:0 0 16px;font-size:18px;font-weight:600;">${itemTitle}</p>
      <table style="width:100%;font-size:14px;border-collapse:collapse;">
        <tr><td style="color:#86868b;padding:4px 0;">Salgspris</td><td style="text-align:right;">${formatNok(amountNok)}</td></tr>
        <tr><td style="color:#86868b;padding:4px 0;">Plattformavgift (15%)</td><td style="text-align:right;">- ${formatNok(platformFeeNok)}</td></tr>
        <tr style="border-top:1px solid #2a2a2a;">
          <td style="padding-top:8px;font-weight:600;">Din utbetaling</td>
          <td style="text-align:right;padding-top:8px;font-weight:600;color:#34d399;">${formatNok(payoutNok)}</td>
        </tr>
      </table>
    </div>

    <p style="color:#86868b;font-size:13px;">Utbetalingen frigis innen 48 timer etter kjøpet, forutsatt at ingen klage er mottatt.</p>
  </div>
</body>
</html>`,
  };
}

export function buildAdminSaleEmail({
  orderNumber,
  itemTitle,
  itemType,
  producerName,
  customerEmail,
  amountNok,
  fileSignedUrl,
}: {
  orderNumber: string;
  itemTitle: string;
  itemType: "beat" | "remake" | "sample";
  producerName: string;
  customerEmail: string;
  amountNok: number;
  fileSignedUrl: string;
}): EmailPayload {
  const label = itemTypeLabel(itemType);

  return {
    from: FROM,
    to: ADMIN_EMAIL,
    subject: `Nytt salg ${orderNumber}: ${itemTitle} (${formatNok(amountNok)})`,
    html: `
<!DOCTYPE html>
<html lang="no">
<body style="font-family:sans-serif;background:#080808;color:#f5f5f7;margin:0;padding:32px;">
  <div style="max-width:520px;margin:0 auto;">
    <h1 style="font-size:20px;margin-bottom:4px;">Nytt salg</h1>
    <p style="color:#86868b;margin-top:0;">${orderNumber}</p>

    <div style="background:#141414;border:1px solid #2a2a2a;border-radius:12px;padding:20px;margin:24px 0;font-size:14px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="color:#86868b;padding:4px 0;width:140px;">Type</td><td>${label}</td></tr>
        <tr><td style="color:#86868b;padding:4px 0;">Tittel</td><td>${itemTitle}</td></tr>
        <tr><td style="color:#86868b;padding:4px 0;">Produsent</td><td>${producerName}</td></tr>
        <tr><td style="color:#86868b;padding:4px 0;">Kjøper</td><td>${customerEmail}</td></tr>
        <tr><td style="color:#86868b;padding:4px 0;">Beløp</td><td>${formatNok(amountNok)}</td></tr>
      </table>
    </div>

    ${fileSignedUrl ? `<a href="${fileSignedUrl}"
       style="display:block;text-align:center;background:#2a2a2a;color:#f5f5f7;font-weight:600;font-size:14px;padding:12px 24px;border-radius:10px;text-decoration:none;">
      Last ned filen som ble levert (7 dager)
    </a>` : `<p style="color:#3a3a3a;font-size:13px;">Ingen fil tilgjengelig for denne bestillingen.</p>`}
  </div>
</body>
</html>`,
  };
}

export function buildComplaintConfirmationEmail({
  customerEmail,
  orderNumber,
  itemTitle,
}: {
  customerEmail: string;
  orderNumber: string;
  itemTitle: string;
}): EmailPayload {
  return {
    from: FROM,
    to: customerEmail,
    subject: `Vi har mottatt klagen din for bestilling ${orderNumber}`,
    html: `
<!DOCTYPE html>
<html lang="no">
<body style="font-family:sans-serif;background:#080808;color:#f5f5f7;margin:0;padding:32px;">
  <div style="max-width:520px;margin:0 auto;">
    <h1 style="font-size:22px;margin-bottom:4px;">Klage mottatt</h1>
    <p>Vi har mottatt klagen din for bestilling <strong>${orderNumber}</strong> (${itemTitle}).</p>
    <p>Vi undersøker saken og gir deg tilbakemelding så snart som mulig. Utbetalingen til produsenten er satt på vent.</p>
    <p style="color:#86868b;font-size:13px;">Har du spørsmål? Send e-post til <a href="mailto:russeartister@gmail.com" style="color:#818cf8;">russeartister@gmail.com</a>.</p>
  </div>
</body>
</html>`,
  };
}

export function buildPayoutReleasedEmail({
  producerEmail,
  orderNumber,
  itemTitle,
  payoutNok,
}: {
  producerEmail: string;
  orderNumber: string;
  itemTitle: string;
  payoutNok: number;
}): EmailPayload {
  return {
    from: FROM,
    to: producerEmail,
    subject: `Utbetaling sendt for bestilling ${orderNumber}`,
    html: `
<!DOCTYPE html>
<html lang="no">
<body style="font-family:sans-serif;background:#080808;color:#f5f5f7;margin:0;padding:32px;">
  <div style="max-width:520px;margin:0 auto;">
    <h1 style="font-size:22px;margin-bottom:4px;">Utbetaling sendt</h1>
    <p>Utbetalingen for <strong>${itemTitle}</strong> (bestilling ${orderNumber}) er frigitt.</p>
    <div style="background:#141414;border:1px solid #2a2a2a;border-radius:12px;padding:20px;margin:24px 0;text-align:center;">
      <p style="margin:0;color:#86868b;font-size:13px;">Din utbetaling</p>
      <p style="margin:8px 0 0;font-size:28px;font-weight:700;color:#34d399;">${formatNok(payoutNok)}</p>
    </div>
    <p style="color:#86868b;font-size:13px;">Pengene er på vei til bankkontoen din via Stripe. Forventet ankomsttid: 2-3 bankdager.</p>
  </div>
</body>
</html>`,
  };
}

// ─── Legacy single-send wrappers (kept for any one-off uses) ──────────────────

export async function sendComplaintConfirmationEmail(args: { customerEmail: string; orderNumber: string; itemTitle: string }) {
  await sendBatch([buildComplaintConfirmationEmail(args)]);
}

export async function sendPayoutReleasedEmail(args: { producerEmail: string; orderNumber: string; itemTitle: string; payoutNok: number }) {
  await sendBatch([buildPayoutReleasedEmail(args)]);
}
