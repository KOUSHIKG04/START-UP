import { withSupabase } from "npm:@supabase/server@1";
import { AccessToken } from "npm:livekit-server-sdk@2.19.1";

type JoinContext = { appointment_id: string; room_name: string; role: "patient" | "doctor" };

export default {
  fetch: withSupabase({ auth: "user" }, async (request, ctx) => {
    if (request.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405 });
    const body = await request.json().catch(() => null) as { appointmentId?: unknown } | null;
    const appointmentId = body?.appointmentId;
    if (typeof appointmentId !== "string" || !/^[0-9a-f]{8}-[0-9a-f-]{27,36}$/i.test(appointmentId)) {
      return Response.json({ error: "Invalid appointment" }, { status: 400 });
    }
    const { data, error } = await ctx.supabase.rpc("get_online_join_context", { p_appointment_id: appointmentId });
    if (error) return Response.json({ error: "Could not verify appointment" }, { status: 500 });
    const context = data as JoinContext | null;
    if (!context) return Response.json({ error: "Online consultation is not available to this account now" }, { status: 403 });

    const serverUrl = Deno.env.get("LIVEKIT_URL");
    const apiKey = Deno.env.get("LIVEKIT_API_KEY");
    const apiSecret = Deno.env.get("LIVEKIT_API_SECRET");
    if (!serverUrl || !apiKey || !apiSecret || !serverUrl.startsWith("wss://")) {
      return Response.json({ error: "Video service is not configured" }, { status: 503 });
    }
    const subject = ctx.userClaims?.id;
    if (!subject) return Response.json({ error: "Not signed in" }, { status: 401 });
    const token = new AccessToken(apiKey, apiSecret, {
      identity: `${context.role}-${subject}`,
      ttl: "20m",
    });
    token.addGrant({ roomJoin: true, room: context.room_name, canPublish: true, canSubscribe: true, canPublishData: false });
    return Response.json({ serverUrl, participantToken: await token.toJwt() }, {
      headers: { "cache-control": "no-store" },
    });
  }),
};
