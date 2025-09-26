// app/api/admin/excel/route.js - Excel management API
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import PaymentRequest from "@/models/PaymentRequest";
import { 
  getExcelFileInfo, 
  downloadDataFile, 
  cleanOldBackups, 
  testExcelExport,
  exportAllPaymentRequests 
} from "@/lib/excelExport";

// GET - Get Excel file information
export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    await connectDB();

    // Check if user is admin
    const user = await User.findById(session.user.id);
    if (!user || user.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    switch (action) {
      case "info":
        const fileInfo = await getExcelFileInfo();
        const dbCount = await PaymentRequest.countDocuments();
        
        return NextResponse.json({
          success: true,
          file: fileInfo,
          database: {
            totalRecords: dbCount,
            exportedRecords: await PaymentRequest.countDocuments({ exportedToExcel: true })
          }
        });

      case "download":
        try {
          const downloadData = await downloadDataFile();
          
          return new NextResponse(downloadData.buffer, {
            status: 200,
            headers: {
              'Content-Type': downloadData.mimeType,
              'Content-Disposition': `attachment; filename="${downloadData.filename}"`,
              'Content-Length': downloadData.buffer.length.toString()
            }
          });
        } catch (error) {
          return NextResponse.json(
            { error: "File not found or cannot be downloaded" },
            { status: 404 }
          );
        }

      case "test":
        const testResult = await testExcelExport();
        return NextResponse.json({
          success: true,
          testResult
        });

      case "cleanup":
        const cleanupResult = await cleanOldBackups();
        return NextResponse.json({
          success: true,
          cleanup: cleanupResult
        });

      default:
        // Default: return file info
        const defaultFileInfo = await getExcelFileInfo();
        return NextResponse.json({
          success: true,
          file: defaultFileInfo
        });
    }

  } catch (error) {
    console.error("Excel management API error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}

// POST - Perform Excel operations
export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    await connectDB();

    // Check if user is admin
    const user = await User.findById(session.user.id);
    if (!user || user.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const { action } = await req.json();

    switch (action) {
      case "export_all":
        console.log("📊 Admin requested bulk export of all payment requests");
        
        const allPaymentRequests = await PaymentRequest.find({})
          .populate("freelancer", "name email")
          .populate("company", "name email profile.companyName")
          .populate("gig", "title budget")
          .sort({ submittedAt: 1 });

        const exportResult = await exportAllPaymentRequests(allPaymentRequests);
        
        if (exportResult.success) {
          // Update all records as exported
          await PaymentRequest.updateMany(
            {},
            {
              exportedToExcel: true,
              excelExportDate: new Date()
            }
          );
        }

        return NextResponse.json({
          success: exportResult.success,
          message: exportResult.success 
            ? `Successfully exported ${exportResult.totalRecords} payment requests`
            : "Export failed",
          result: exportResult
        });

      case "sync_database":
        // Re-export any records that weren't exported
        const unexportedRequests = await PaymentRequest.find({ 
          exportedToExcel: { $ne: true } 
        });

        console.log(`📊 Syncing ${unexportedRequests.length} unxported records`);

        let successCount = 0;
        let errorCount = 0;

        for (const request of unexportedRequests) {
          try {
            const { exportToExcel } = await import("@/lib/excelExport");
            const result = await exportToExcel(request);
            
            if (result.success) {
              successCount++;
            } else {
              errorCount++;
            }
          } catch (error) {
            console.error(`Failed to export ${request.requestId}:`, error);
            errorCount++;
          }
        }

        return NextResponse.json({
          success: true,
          message: `Sync completed: ${successCount} exported, ${errorCount} failed`,
          details: {
            totalProcessed: unexportedRequests.length,
            successful: successCount,
            failed: errorCount
          }
        });

      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error("Excel management POST error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}