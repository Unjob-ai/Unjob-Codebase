// lib/excelExport.js - Updated for reliable data.xlsx export
import * as XLSX from "xlsx";
import fs from "fs/promises";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const EXCEL_FILE_PATH = path.join(DATA_DIR, "data.xlsx");
const BACKUP_DIR = path.join(DATA_DIR, "backups");

// Ensure directories exist
async function ensureDirectories() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.mkdir(BACKUP_DIR, { recursive: true });
    console.log("✅ Directories ensured: /data and /data/backups");
  } catch (error) {
    console.error("❌ Error creating directories:", error);
    throw error;
  }
}

// Create backup of existing data.xlsx
async function createBackup() {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPath = path.join(BACKUP_DIR, `data-backup-${timestamp}.xlsx`);

    try {
      await fs.access(EXCEL_FILE_PATH);
      await fs.copyFile(EXCEL_FILE_PATH, backupPath);
      console.log(`✅ Backup created: ${backupPath}`);
      return backupPath;
    } catch (error) {
      console.log("ℹ️ No existing data.xlsx to backup");
      return null;
    }
  } catch (error) {
    console.error("⚠️ Backup creation failed:", error);
    return null;
  }
}

// Get Excel headers for payment requests
function getPaymentRequestHeaders() {
  return [
    "Request ID",
    "Date Submitted",
    "Time Submitted",
    "Freelancer Name",
    "Freelancer Email",
    "Freelancer Phone",
    "Freelancer Location",
    "Company Name",
    "Company Email",
    "Gig Title",
    "Gig Budget",
    "Freelancer Amount",
    "Platform Commission",
    "Account Holder Name",
    "Account Number",
    "IFSC Code",
    "Bank Name",
    "Branch Name",
    "UPI ID",
    "PAN Number",
    "Project Description",
    "Deliverables",
    "Work Duration",
    "Completed Date",
    "Client Rating",
    "Status",
    "Urgency Level",
    "Additional Notes",
    "Export Date",
    "Export Time",
    "Row Number",
  ];
}

// Format payment request data for Excel
function formatPaymentRequestData(paymentRequest, rowNumber) {
  const submittedDate = new Date(paymentRequest.submittedAt);
  const completedDate = new Date(paymentRequest.workDetails.completedDate);
  const exportDate = new Date();

  return {
    "Request ID": paymentRequest.requestId || `PR${Date.now()}`,
    "Date Submitted": submittedDate.toLocaleDateString("en-IN"),
    "Time Submitted": submittedDate.toLocaleTimeString("en-IN"),
    "Freelancer Name": paymentRequest.freelancerName || "",
    "Freelancer Email": paymentRequest.freelancerEmail || "",
    "Freelancer Phone": paymentRequest.freelancerPhone || "",
    "Freelancer Location": paymentRequest.freelancerLocation || "N/A",
    "Company Name": paymentRequest.companyName || "",
    "Company Email": paymentRequest.companyEmail || "",
    "Gig Title": paymentRequest.gigTitle || "",
    "Gig Budget": paymentRequest.gigBudget || 0,
    "Freelancer Amount": paymentRequest.freelancerReceivableAmount || 0,
    "Platform Commission": paymentRequest.platformCommission || 0,
    "Account Holder Name": paymentRequest.bankDetails?.accountHolderName || "",
    "Account Number": paymentRequest.bankDetails?.accountNumber || "N/A",
    "IFSC Code": paymentRequest.bankDetails?.ifscCode || "N/A",
    "Bank Name": paymentRequest.bankDetails?.bankName || "N/A",
    "Branch Name": paymentRequest.bankDetails?.branchName || "N/A",
    "UPI ID": paymentRequest.bankDetails?.upiId || "N/A",
    "PAN Number": paymentRequest.bankDetails?.panNumber || "",
    "Project Description": paymentRequest.workDetails?.projectDescription || "",
    Deliverables: Array.isArray(paymentRequest.workDetails?.deliverables)
      ? paymentRequest.workDetails.deliverables.join("; ")
      : paymentRequest.workDetails?.deliverables || "N/A",
    "Work Duration": paymentRequest.workDetails?.workDuration || "",
    "Completed Date": completedDate.toLocaleDateString("en-IN"),
    "Client Rating": paymentRequest.workDetails?.clientSatisfactionRating || 5,
    Status: (paymentRequest.status || "pending").toUpperCase(),
    "Urgency Level": (paymentRequest.urgencyLevel || "normal").toUpperCase(),
    "Additional Notes": paymentRequest.additionalNotes || "N/A",
    "Export Date": exportDate.toLocaleDateString("en-IN"),
    "Export Time": exportDate.toLocaleTimeString("en-IN"),
    "Row Number": rowNumber,
  };
}

// Main export function - saves to /data/data.xlsx
export async function exportToExcel(paymentRequest) {
  let backupPath = null;

  try {
    console.log(`📊 Starting Excel export for: ${paymentRequest.requestId}`);

    // Ensure directories exist
    await ensureDirectories();

    // Create backup before modifying
    backupPath = await createBackup();

    let workbook;
    let existingData = [];
    let nextRowNumber = 1;

    // Try to read existing data.xlsx file
    try {
      const fileBuffer = await fs.readFile(EXCEL_FILE_PATH);
      workbook = XLSX.read(fileBuffer, { type: "buffer" });

      if (workbook.SheetNames.length > 0) {
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        existingData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        nextRowNumber = existingData.length; // Next row (excluding header)
        console.log(
          `📄 Existing data.xlsx found with ${existingData.length - 1} records`
        );
      }
    } catch (error) {
      console.log("📄 Creating new data.xlsx file");
      workbook = XLSX.utils.book_new();

      // Create headers for new file
      const headers = getPaymentRequestHeaders();
      existingData = [headers];
      nextRowNumber = 2; // Row 2 (after header)
    }

    // Format the payment request data
    const formattedData = formatPaymentRequestData(
      paymentRequest,
      nextRowNumber - 1
    );

    // Convert formatted data to array matching headers
    const headers = existingData[0] || getPaymentRequestHeaders();
    const newRow = headers.map((header) => formattedData[header] || "");

    // Add new row to existing data
    existingData.push(newRow);

    // Create new worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(existingData);

    // Set column widths for better readability
    worksheet["!cols"] = [
      { wch: 15 }, // Request ID
      { wch: 12 }, // Date Submitted
      { wch: 12 }, // Time Submitted
      { wch: 25 }, // Freelancer Name
      { wch: 30 }, // Freelancer Email
      { wch: 15 }, // Freelancer Phone
      { wch: 20 }, // Freelancer Location
      { wch: 25 }, // Company Name
      { wch: 30 }, // Company Email
      { wch: 30 }, // Gig Title
      { wch: 12 }, // Gig Budget
      { wch: 12 }, // Freelancer Amount
      { wch: 12 }, // Platform Commission
      { wch: 25 }, // Account Holder Name
      { wch: 20 }, // Account Number
      { wch: 12 }, // IFSC Code
      { wch: 20 }, // Bank Name
      { wch: 20 }, // Branch Name
      { wch: 20 }, // UPI ID
      { wch: 12 }, // PAN Number
      { wch: 40 }, // Project Description
      { wch: 30 }, // Deliverables
      { wch: 15 }, // Work Duration
      { wch: 12 }, // Completed Date
      { wch: 8 }, // Client Rating
      { wch: 12 }, // Status
      { wch: 12 }, // Urgency Level
      { wch: 30 }, // Additional Notes
      { wch: 12 }, // Export Date
      { wch: 12 }, // Export Time
      { wch: 8 }, // Row Number
    ];

    // Style the header row
    if (existingData.length > 1) {
      const range = XLSX.utils.decode_range(worksheet["!ref"]);
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
        if (worksheet[cellAddress]) {
          worksheet[cellAddress].s = {
            font: { bold: true, color: { rgb: "FFFFFF" } },
            fill: { bgColor: { indexed: 64 }, fgColor: { rgb: "366092" } },
            alignment: { horizontal: "center" },
          };
        }
      }
    }

    // Update workbook
    const sheetName = "Payment Requests";
    workbook.Sheets[sheetName] = worksheet;

    if (!workbook.SheetNames.includes(sheetName)) {
      workbook.SheetNames = [sheetName];
    }

    // Write the file
    const buffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
      cellStyles: true,
    });

    await fs.writeFile(EXCEL_FILE_PATH, buffer);

    // Update payment request record
    if (paymentRequest.save) {
      paymentRequest.exportedToExcel = true;
      paymentRequest.excelExportDate = new Date();
      paymentRequest.excelRowNumber = nextRowNumber - 1;
      await paymentRequest.save();
    }

    console.log(`✅ Excel export successful!`);
    console.log(`📁 File: ${EXCEL_FILE_PATH}`);
    console.log(`📊 Row: ${nextRowNumber - 1}`);
    console.log(`📈 Total records: ${existingData.length - 1}`);

    return {
      success: true,
      filePath: EXCEL_FILE_PATH,
      rowNumber: nextRowNumber - 1,
      totalRecords: existingData.length - 1,
      backupCreated: !!backupPath,
      backupPath: backupPath,
      exportedAt: new Date(),
    };
  } catch (error) {
    console.error(
      `❌ Excel export failed for ${paymentRequest.requestId}:`,
      error
    );

    // If backup was created and main export failed, restore backup
    if (backupPath) {
      try {
        await fs.copyFile(backupPath, EXCEL_FILE_PATH);
        console.log("↩️ Restored backup due to export failure");
      } catch (restoreError) {
        console.error("❌ Failed to restore backup:", restoreError);
      }
    }

    // Return error but don't throw - let the main process continue
    return {
      success: false,
      error: error.message,
      filePath: EXCEL_FILE_PATH,
      exportedAt: new Date(),
    };
  }
}

// Bulk export all payment requests to Excel
export async function exportAllPaymentRequests(paymentRequests) {
  try {
    console.log(
      `📊 Starting bulk export of ${paymentRequests.length} payment requests`
    );

    await ensureDirectories();
    const backupPath = await createBackup();

    const headers = getPaymentRequestHeaders();
    const data = [headers];

    // Format all payment requests
    paymentRequests.forEach((request, index) => {
      const formattedData = formatPaymentRequestData(request, index + 1);
      const row = headers.map((header) => formattedData[header] || "");
      data.push(row);
    });

    // Create workbook
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(data);

    // Set column widths
    worksheet["!cols"] = Array(headers.length).fill({ wch: 20 });

    // Style headers
    const range = XLSX.utils.decode_range(worksheet["!ref"]);
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      if (worksheet[cellAddress]) {
        worksheet[cellAddress].s = {
          font: { bold: true, color: { rgb: "FFFFFF" } },
          fill: { bgColor: { indexed: 64 }, fgColor: { rgb: "366092" } },
          alignment: { horizontal: "center" },
        };
      }
    }

    XLSX.utils.book_append_sheet(workbook, worksheet, "Payment Requests");

    // Write file
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    await fs.writeFile(EXCEL_FILE_PATH, buffer);

    console.log(`✅ Bulk export completed: ${paymentRequests.length} records`);

    return {
      success: true,
      filePath: EXCEL_FILE_PATH,
      totalRecords: paymentRequests.length,
      backupCreated: !!backupPath,
      exportedAt: new Date(),
    };
  } catch (error) {
    console.error("❌ Bulk export failed:", error);
    return {
      success: false,
      error: error.message,
      exportedAt: new Date(),
    };
  }
}

// Get file information
export async function getExcelFileInfo() {
  try {
    const stats = await fs.stat(EXCEL_FILE_PATH);

    // Read file to get record count
    const fileBuffer = await fs.readFile(EXCEL_FILE_PATH);
    const workbook = XLSX.read(fileBuffer, { type: "buffer" });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    return {
      exists: true,
      filePath: EXCEL_FILE_PATH,
      fileName: "data.xlsx",
      fileSize: stats.size,
      formattedSize: formatFileSize(stats.size),
      lastModified: stats.mtime,
      totalRecords: data.length - 1, // Exclude header
      headers: data[0] || [],
      isAccessible: true,
    };
  } catch (error) {
    return {
      exists: false,
      filePath: EXCEL_FILE_PATH,
      fileName: "data.xlsx",
      error: error.message,
      isAccessible: false,
    };
  }
}

// Download the data.xlsx file
export async function downloadDataFile() {
  try {
    const fileBuffer = await fs.readFile(EXCEL_FILE_PATH);
    const timestamp = new Date().toISOString().split("T")[0];

    return {
      success: true,
      buffer: fileBuffer,
      filename: `payment-requests-${timestamp}.xlsx`,
      originalFilename: "data.xlsx",
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    };
  } catch (error) {
    throw new Error(`Failed to download data.xlsx: ${error.message}`);
  }
}

// Clean old backups (keep last 10)
export async function cleanOldBackups() {
  try {
    const files = await fs.readdir(BACKUP_DIR);
    const backupFiles = files
      .filter((file) => file.startsWith("data-backup-"))
      .map((file) => ({
        name: file,
        path: path.join(BACKUP_DIR, file),
      }));

    // Sort by name (which includes timestamp) - newest first
    backupFiles.sort((a, b) => b.name.localeCompare(a.name));

    // Keep only the latest 10 backups
    const filesToDelete = backupFiles.slice(10);

    for (const file of filesToDelete) {
      await fs.unlink(file.path);
      console.log(`🗑️ Deleted old backup: ${file.name}`);
    }

    return {
      success: true,
      totalBackups: backupFiles.length,
      deletedBackups: filesToDelete.length,
      keptBackups: Math.min(backupFiles.length, 10),
    };
  } catch (error) {
    console.error("❌ Backup cleanup error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Helper function to format file size
function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// Test function to verify Excel functionality
export async function testExcelExport() {
  try {
    console.log("🧪 Testing Excel export functionality...");

    // Create test data
    const testPaymentRequest = {
      requestId: `TEST${Date.now()}`,
      submittedAt: new Date(),
      freelancerName: "Test Freelancer",
      freelancerEmail: "test@example.com",
      freelancerPhone: "+91 9876543210",
      freelancerLocation: "Test City",
      companyName: "Test Company",
      companyEmail: "company@example.com",
      gigTitle: "Test Gig",
      gigBudget: 10000,
      freelancerReceivableAmount: 9000,
      platformCommission: 1000,
      bankDetails: {
        accountHolderName: "Test Account Holder",
        accountNumber: "1234567890",
        ifscCode: "TEST0001234",
        bankName: "Test Bank",
        panNumber: "ABCDE1234F",
      },
      workDetails: {
        projectDescription: "Test project description",
        workDuration: "1 week",
        completedDate: new Date(),
        clientSatisfactionRating: 5,
      },
      status: "pending",
      urgencyLevel: "normal",
    };

    const result = await exportToExcel(testPaymentRequest);

    if (result.success) {
      console.log("✅ Excel export test successful!");
      console.log(`📁 File created/updated: ${result.filePath}`);
    } else {
      console.log("❌ Excel export test failed:", result.error);
    }

    return result;
  } catch (error) {
    console.error("❌ Excel test failed:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}
