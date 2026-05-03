import { NextRequest, NextResponse } from "next/server";
import { processReminders } from "@/lib/reminders";

export const dynamic = "force-dynamic";

// This endpoint acts as a cron job trigger.
// Call it every 5 minutes via an external cron service (e.g., cron-job.org, Vercel Cron, etc.)
// Protect it with a secret header to prevent unauthorized access.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expectedSecret = `Bearer ${process.env.CRON_SECRET || "bookora-cron-secret"}`;

  if (authHeader !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await processReminders();
    return NextResponse.json({ success: true, message: "Reminders processed" });
  } catch (error) {
    console.error("Cron reminder error:", error);
    return NextResponse.json({ error: "Failed to process reminders" }, { status: 500 });
  }
}
