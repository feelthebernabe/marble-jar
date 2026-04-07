import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendSms, validateTwilioSignature } from "@/lib/twilio";
import { handleIntakeMessage } from "@/lib/agents/intake";

/**
 * POST — Twilio SMS webhook.
 * Receives inbound texts, routes to the intake agent, returns TwiML.
 */
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const from = formData.get("From") as string;
    const body = (formData.get("Body") as string) ?? "";

    // Validate Twilio signature in production
    if (process.env.NODE_ENV === "production") {
      const signature = request.headers.get("X-Twilio-Signature") ?? "";
      const url = `${process.env.NEXT_PUBLIC_APP_URL}/api/sms`;
      const params: Record<string, string> = {};
      formData.forEach((value, key) => {
        params[key] = String(value);
      });

      if (!validateTwilioSignature(url, params, signature)) {
        return new NextResponse("Forbidden", { status: 403 });
      }
    }

    // Look up user by phone number
    const user = await db.user.findUnique({
      where: { phone: from },
    });

    if (!user) {
      // Unknown user — send signup nudge
      await sendSms(
        from,
        "Hey! I don't recognize this number yet. Sign up at marble-jar.app to get started."
      );
      return new NextResponse("<Response></Response>", {
        headers: { "Content-Type": "text/xml" },
      });
    }

    // Route to intake agent
    try {
      await handleIntakeMessage(user, body);
    } catch (error) {
      console.error("Intake agent error:", error);

      // Send fallback text
      await sendSms(
        from,
        "Got your message but I'm having a moment... I'll get back to you shortly."
      );

      // Queue for retry
      await db.retryQueue.create({
        data: {
          type: "intake_message",
          payload: { userId: user.id, body },
          nextRetryAt: new Date(Date.now() + 60_000), // retry in 1 minute
        },
      });
    }

    return new NextResponse("<Response></Response>", {
      headers: { "Content-Type": "text/xml" },
    });
  } catch (error) {
    console.error("SMS webhook error:", error);
    return new NextResponse("<Response></Response>", {
      headers: { "Content-Type": "text/xml" },
    });
  }
}
