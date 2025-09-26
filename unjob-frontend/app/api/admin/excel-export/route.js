// api/admin/excel-export/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import PaymentRequest from "@/models/PaymentRequest";
import {
  exportAllPaymentRequests,
  getExcelFileInfo,
  downloadDataFile,
  cleanOldBackups,
} from "@/lib/excelExport";

// GET - Get Excel file information
export async function GET(req) {
  try {
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    await connectDB();

    // Check if user is admin (you can modify this based on your admin check logic)
    const user = await User.findById(session.user.id);
    if (!user || (user.role !== "admin" && user.role !== "hiring")) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    if (action === "download") {
      try {
        const { buffer, filename, mimeType } = await downloadDataFile();

        return new NextResponse(buffer, {
          status: 200,
          headers: {
            "Content-Type": mimeType,
            "Content-Disposition": `attachment; filename="${filename}"`,
            "Content-Length": buffer.length.toString(),
          },
        });
      } catch (error) {
        return NextResponse.json(
          {
            error: "Failed to download Excel file",
            details: error.message,
          },
          { status: 500 }
        );
      }
    }

    if (action === "validate") {
      try {
        // Basic validation using getExcelFileInfo
        const validation = await getExcelFileInfo();
        return NextResponse.json({
          success: true,
          validation: {
            isValid: validation.exists && validation.isAccessible,
            fileExists: validation.exists,
            isAccessible: validation.isAccessible,
            recordCount: validation.totalRecords || 0,
            fileSize: validation.fileSize || 0,
            lastModified: validation.lastModified,
            headers: validation.headers || [],
          },
        });
      } catch (error) {
        return NextResponse.json(
          {
            error: "Failed to validate Excel file",
            details: error.message,
          },
          { status: 500 }
        );
      }
    }

    // Default: Get file info
    const fileInfo = await getExcelFileInfo();
    const totalRequests = await PaymentRequest.countDocuments();
    const exportedRequests = await PaymentRequest.countDocuments({
      exportedToExcel: true,
    });
    const pendingExport = totalRequests - exportedRequests;

    return NextResponse.json({
      success: true,
      fileInfo,
      statistics: {
        totalRequests,
        exportedRequests,
        pendingExport,
        exportPercentage:
          totalRequests > 0
            ? Math.round((exportedRequests / totalRequests) * 100)
            : 0,
      },
    });
  } catch (error) {
    console.error("Excel info fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch Excel information" },
      { status: 500 }
    );
  }
}

// POST - Export operations
export async function POST(req) {
  try {
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    await connectDB();

    // Check if user is admin
    const user = await User.findById(session.user.id);
    if (!user || (user.role !== "admin" && user.role !== "hiring")) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const { action, requestIds } = await req.json();

    if (action === "export_all") {
      try {
        // Get all payment requests with populated fields
        const paymentRequests = await PaymentRequest.find({})
          .populate("freelancer", "name email")
          .populate("company", "name email profile.companyName")
          .populate("gig", "title budget")
          .sort({ submittedAt: -1 });

        const result = await exportAllPaymentRequests(paymentRequests);

        // Clean old backups after successful export
        if (result.success) {
          await cleanOldBackups();
        }

        return NextResponse.json({
          success: true,
          message: "All payment requests exported to Excel successfully",
          result,
        });
      } catch (error) {
        return NextResponse.json(
          {
            error: "Failed to export all records",
            details: error.message,
          },
          { status: 500 }
        );
      }
    }

    if (action === "export_selected" && requestIds) {
      try {
        const results = [];

        for (const requestId of requestIds) {
          const paymentRequest = await PaymentRequest.findById(requestId)
            .populate("freelancer", "name email")
            .populate("company", "name email profile.companyName")
            .populate("gig", "title budget");

          if (paymentRequest) {
            const { exportToExcel } = await import("@/lib/excelExport");
            const result = await exportToExcel(paymentRequest);
            results.push({
              requestId: paymentRequest.requestId,
              success: result.success,
              result,
            });
          } else {
            results.push({
              requestId,
              success: false,
              error: "Payment request not found",
            });
          }
        }

        const successCount = results.filter((r) => r.success).length;
        const failureCount = results.length - successCount;

        // Clean old backups after successful exports
        if (successCount > 0) {
          await cleanOldBackups();
        }

        return NextResponse.json({
          success: true,
          message: `Export completed: ${successCount} successful, ${failureCount} failed`,
          results,
          summary: {
            total: results.length,
            successful: successCount,
            failed: failureCount,
          },
        });
      } catch (error) {
        return NextResponse.json(
          {
            error: "Failed to export selected records",
            details: error.message,
          },
          { status: 500 }
        );
      }
    }

    if (action === "cleanup_backups") {
      try {
        const result = await cleanOldBackups();
        return NextResponse.json({
          success: true,
          message: "Backup cleanup completed",
          result,
        });
      } catch (error) {
        return NextResponse.json(
          {
            error: "Failed to cleanup backups",
            details: error.message,
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      {
        error: "Invalid action",
        validActions: ["export_all", "export_selected", "cleanup_backups"],
      },
      { status: 400 }
    );
  } catch (error) {
    console.error("Excel export operation error:", error);
    return NextResponse.json(
      { error: "Failed to perform export operation" },
      { status: 500 }
    );
  }
}

// DELETE - Delete Excel file (admin only)
export async function DELETE(req) {
  try {
    const session = await getServerSession();
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

    if (action === "reset_export_flags") {
      try {
        // Reset all export flags in database
        const result = await PaymentRequest.updateMany(
          {},
          {
            $unset: {
              exportedToExcel: "",
              excelExportDate: "",
              excelRowNumber: "",
            },
          }
        );

        return NextResponse.json({
          success: true,
          message: "Export flags reset successfully",
          modifiedCount: result.modifiedCount,
        });
      } catch (error) {
        return NextResponse.json(
          {
            error: "Failed to reset export flags",
            details: error.message,
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      {
        error: "Invalid delete action",
        validActions: ["reset_export_flags"],
      },
      { status: 400 }
    );
  } catch (error) {
    console.error("Excel delete operation error:", error);
    return NextResponse.json(
      { error: "Failed to perform delete operation" },
      { status: 500 }
    );
  }
}
