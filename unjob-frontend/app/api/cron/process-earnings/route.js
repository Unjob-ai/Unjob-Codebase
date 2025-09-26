import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { processAllPendingEarnings } from "@/lib/walletUtils";

export const dynamic = "force-dynamic";


export async function GET(req) {
  try {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const results = await processAllPendingEarnings();

    return NextResponse.json({
      success: true,
      message: "Auto-processed pending earnings",
      results: results,
      processed: results.length,
      successful: results.filter((r) => r.success).length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Earnings cron job error:", error);
    return NextResponse.json(
      {
        error: "Failed to process earnings",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
