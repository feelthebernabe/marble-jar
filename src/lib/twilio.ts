import twilio from "twilio";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

const FROM = process.env.TWILIO_PHONE_NUMBER!;

export async function sendSms(
  to: string,
  body: string,
  mediaUrl?: string
): Promise<void> {
  await client.messages.create({
    to,
    from: FROM,
    body,
    ...(mediaUrl ? { mediaUrl: [mediaUrl] } : {}),
  });
}

export function validateTwilioSignature(
  url: string,
  params: Record<string, string>,
  signature: string
): boolean {
  return twilio.validateRequest(
    process.env.TWILIO_AUTH_TOKEN!,
    signature,
    url,
    params
  );
}
