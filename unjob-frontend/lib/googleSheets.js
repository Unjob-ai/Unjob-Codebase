// lib/googleSheets.js - Complete Google Sheets Integration
import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";

// Initialize Google Sheets client
const initializeGoogleSheets = async () => {
  try {
    // Create JWT auth client
    const serviceAccountAuth = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    // Initialize the sheet
    const doc = new GoogleSpreadsheet(
      process.env.GOOGLE_SHEET_ID,
      serviceAccountAuth
    );
    await doc.loadInfo(); // loads document properties and worksheets

    return doc;
  } catch (error) {
    console.error("❌ Google Sheets initialization failed:", error);
    throw error;
  }
};

// Add payment request to Google Sheet
export const addPaymentRequestToSheet = async (paymentRequestData) => {
  try {
  

    const doc = await initializeGoogleSheets();

    // Get or create the worksheet
    let sheet = doc.sheetsByTitle["Payment Requests"];
    if (!sheet) {
      // Create new sheet if it doesn't exist
      sheet = await doc.addSheet({
        title: "Payment Requests",
        headerValues: [
          "Request ID",
          "Date Submitted",
          "Freelancer Name",
          "Freelancer Email",
          "Freelancer Phone",
          "Company Name",
          "Company Email",
          "Gig Title",
          "Gig Budget (₹)",
          "Platform Commission (₹)",
          "Freelancer Amount (₹)",
          "Work Duration",
          "Completion Date",
          "Project Description",
          "Account Holder Name",
          "Account Number",
          "IFSC Code",
          "Bank Name",
          "UPI ID",
          "PAN Number",
          "Status",
          "Urgency Level",
          "Additional Notes",
          "Submitted At",
          "Application ID",
          "Processing Notes",
        ],
      });
     
    }

    // Prepare row data with proper formatting
    const rowData = {
      "Request ID": paymentRequestData.requestId || "",
      "Date Submitted": new Date(
        paymentRequestData.submittedAt
      ).toLocaleDateString("en-IN"),
      "Freelancer Name": paymentRequestData.freelancerName || "",
      "Freelancer Email": paymentRequestData.freelancerEmail || "",
      "Freelancer Phone": paymentRequestData.freelancerPhone || "",
      "Company Name": paymentRequestData.companyName || "",
      "Company Email": paymentRequestData.companyEmail || "",
      "Gig Title": paymentRequestData.gigTitle || "",
      "Gig Budget (₹)": paymentRequestData.gigBudget || 0,
      "Platform Commission (₹)": paymentRequestData.platformCommission || 0,
      "Freelancer Amount (₹)":
        paymentRequestData.freelancerReceivableAmount || 0,
      "Work Duration": paymentRequestData.workDetails?.workDuration || "",
      "Completion Date": paymentRequestData.workDetails?.completedDate
        ? new Date(
            paymentRequestData.workDetails.completedDate
          ).toLocaleDateString("en-IN")
        : "",
      "Project Description":
        paymentRequestData.workDetails?.projectDescription || "",
      "Account Holder Name":
        paymentRequestData.bankDetails?.accountHolderName || "",
      "Account Number": paymentRequestData.bankDetails?.accountNumber || "",
      "IFSC Code": paymentRequestData.bankDetails?.ifscCode || "",
      "Bank Name": paymentRequestData.bankDetails?.bankName || "",
      "UPI ID": paymentRequestData.bankDetails?.upiId || "",
      "PAN Number": paymentRequestData.bankDetails?.panNumber || "",
      Status: paymentRequestData.status || "pending",
      "Urgency Level": paymentRequestData.urgencyLevel || "normal",
      "Additional Notes": paymentRequestData.additionalNotes || "",
      "Submitted At": new Date(paymentRequestData.submittedAt).toLocaleString(
        "en-IN"
      ),
      "Application ID": paymentRequestData.applicationId || "",
      "Processing Notes": "",
    };

    // Add the row to the sheet (appends to end, preserves existing data)
    await sheet.addRow(rowData);

   

    return {
      success: true,
      sheetUrl: `https://docs.google.com/spreadsheets/d/${process.env.GOOGLE_SHEET_ID}`,
      message: "Data added to Google Sheet successfully",
    };
  } catch (error) {
    console.error("❌ Failed to add payment request to Google Sheet:", error);

    // Don't throw error to prevent payment request creation failure
    // Log error and continue
    return {
      success: false,
      error: error.message,
      message: "Payment request saved but Google Sheet update failed",
    };
  }
};

// Update payment request status in Google Sheet
export const updatePaymentRequestStatusInSheet = async (
  requestId,
  newStatus,
  processingNotes = ""
) => {
  try {
   

    const doc = await initializeGoogleSheets();
    const sheet = doc.sheetsByTitle["Payment Requests"];

    if (!sheet) {
     
      return { success: false, message: "Sheet not found" };
    }

    // Load all rows to find the matching request ID
    const rows = await sheet.getRows();
    const targetRow = rows.find((row) => row.get("Request ID") === requestId);

    if (!targetRow) {

      return { success: false, message: "Request ID not found" };
    }

    // Update the status and processing notes
    targetRow.set("Status", newStatus);

    // Add timestamp for status update
    const currentTime = new Date().toLocaleString("en-IN");
    const currentNotes = targetRow.get("Processing Notes") || "";
    let updatedNotes =
      currentNotes +
      (currentNotes ? "\n" : "") +
      `${currentTime}: Status changed to ${newStatus}`;

    if (processingNotes) {
      updatedNotes += ` - ${processingNotes}`;
    }

    targetRow.set("Processing Notes", updatedNotes);

    await targetRow.save();

    console.log("✅ Payment request status updated in Google Sheet");

    return {
      success: true,
      message: "Status updated in Google Sheet successfully",
    };
  } catch (error) {
    console.error(
      "❌ Failed to update payment request status in Google Sheet:",
      error
    );
    return {
      success: false,
      error: error.message,
      message: "Failed to update Google Sheet",
    };
  }
};

// Add withdrawal to Google Sheet
export const addWithdrawalToSheet = async (withdrawalData) => {
  try {
    console.log("📊 Adding withdrawal request to Google Sheet...");

    const doc = await initializeGoogleSheets();

    // Get or create the withdrawals worksheet
    let sheet = doc.sheetsByTitle["Withdrawal Requests"];
    if (!sheet) {
      // Create new sheet if it doesn't exist
      sheet = await doc.addSheet({
        title: "Withdrawal Requests",
        headerValues: [
          "Withdrawal ID",
          "Date Requested",
          "Freelancer Name",
          "Freelancer Email",
          "Freelancer Phone",
          "Amount (₹)",
          "Account Holder Name",
          "Account Number",
          "IFSC Code",
          "Bank Name",
          "UPI ID",
          "Status",
          "Available Balance (₹)",
          "Total Earnings (₹)",
          "Processing Notes",
          "Processed Date",
          "Transfer ID",
        ],
      });
      console.log('✅ Created new "Withdrawal Requests" sheet');
    }

    // Prepare row data
    const rowData = {
      "Withdrawal ID": withdrawalData.withdrawalId || "",
      "Date Requested": new Date(withdrawalData.requestedAt).toLocaleDateString(
        "en-IN"
      ),
      "Freelancer Name": withdrawalData.freelancerName || "",
      "Freelancer Email": withdrawalData.freelancerEmail || "",
      "Freelancer Phone": withdrawalData.freelancerPhone || "",
      "Amount (₹)": withdrawalData.amount || 0,
      "Account Holder Name": withdrawalData.accountHolderName || "",
      "Account Number": withdrawalData.accountNumber || "",
      "IFSC Code": withdrawalData.ifscCode || "",
      "Bank Name": withdrawalData.bankName || "",
      "UPI ID": withdrawalData.upiId || "",
      Status: withdrawalData.status || "pending",
      "Available Balance (₹)": withdrawalData.availableBalance || 0,
      "Total Earnings (₹)": withdrawalData.totalEarnings || 0,
      "Processing Notes": "",
      "Processed Date": "",
      "Transfer ID": "",
    };

    // Add the row to the sheet (this appends to the end, preserving old data)
    await sheet.addRow(rowData);

    console.log("✅ Withdrawal request added to Google Sheet successfully");
    console.log("💰 Amount:", withdrawalData.amount);

    return {
      success: true,
      sheetUrl: `https://docs.google.com/spreadsheets/d/${process.env.GOOGLE_SHEET_ID}`,
      message: "Withdrawal request added to Google Sheet successfully",
    };
  } catch (error) {
    console.error("❌ Failed to add withdrawal to Google Sheet:", error);

    return {
      success: false,
      error: error.message,
      message: "Withdrawal request saved but Google Sheet update failed",
    };
  }
};

// Update withdrawal status in Google Sheet
export const updateWithdrawalStatusInSheet = async (
  withdrawalId,
  newStatus,
  processingNotes = "",
  transferId = ""
) => {
  try {
    console.log("📊 Updating withdrawal status in Google Sheet...");

    const doc = await initializeGoogleSheets();
    const sheet = doc.sheetsByTitle["Withdrawal Requests"];

    if (!sheet) {
      console.log("⚠️ Withdrawal Requests sheet not found");
      return { success: false, message: "Sheet not found" };
    }

    // Load all rows to find the matching withdrawal ID
    const rows = await sheet.getRows();
    const targetRow = rows.find(
      (row) => row.get("Withdrawal ID") === withdrawalId
    );

    if (!targetRow) {
      console.log("⚠️ Withdrawal ID not found in sheet:", withdrawalId);
      return { success: false, message: "Withdrawal ID not found" };
    }

    // Update the status and processing notes
    targetRow.set("Status", newStatus);

    // Add timestamp for status update
    const currentTime = new Date().toLocaleString("en-IN");
    const currentNotes = targetRow.get("Processing Notes") || "";
    let updatedNotes =
      currentNotes +
      (currentNotes ? "\n" : "") +
      `${currentTime}: Status changed to ${newStatus}`;

    if (processingNotes) {
      updatedNotes += ` - ${processingNotes}`;
    }

    targetRow.set("Processing Notes", updatedNotes);

    // Update processed date if status is completed
    if (newStatus === "completed") {
      targetRow.set("Processed Date", currentTime);
      if (transferId) {
        targetRow.set("Transfer ID", transferId);
      }
    }

    await targetRow.save();

    console.log("✅ Withdrawal status updated in Google Sheet");

    return {
      success: true,
      message: "Withdrawal status updated in Google Sheet successfully",
    };
  } catch (error) {
    console.error(
      "❌ Failed to update withdrawal status in Google Sheet:",
      error
    );
    return {
      success: false,
      error: error.message,
      message: "Failed to update Google Sheet",
    };
  }
};

// Bulk sync all payment requests to Google Sheet (preserving existing data)
export const syncAllPaymentRequestsToSheet = async () => {
  try {
    console.log("📊 Starting bulk sync to Google Sheet...");

    const PaymentRequest = (await import("@/models/PaymentRequest")).default;
    await (await import("@/lib/mongodb")).default();

    const doc = await initializeGoogleSheets();

    // Get existing sheet or create new one
    let sheet = doc.sheetsByTitle["Payment Requests"];
    if (!sheet) {
      sheet = await doc.addSheet({
        title: "Payment Requests",
        headerValues: [
          "Request ID",
          "Date Submitted",
          "Freelancer Name",
          "Freelancer Email",
          "Freelancer Phone",
          "Company Name",
          "Company Email",
          "Gig Title",
          "Gig Budget (₹)",
          "Platform Commission (₹)",
          "Freelancer Amount (₹)",
          "Work Duration",
          "Completion Date",
          "Project Description",
          "Account Holder Name",
          "Account Number",
          "IFSC Code",
          "Bank Name",
          "UPI ID",
          "PAN Number",
          "Status",
          "Urgency Level",
          "Additional Notes",
          "Submitted At",
          "Application ID",
          "Processing Notes",
        ],
      });
    }

    // Get all payment requests that aren't already in the sheet
    const paymentRequests = await PaymentRequest.find({})
      .populate("freelancer", "name email")
      .populate("company", "name email profile.companyName")
      .sort({ submittedAt: -1 });

    // Get existing rows to avoid duplicates
    const existingRows = await sheet.getRows();
    const existingRequestIds = existingRows.map((row) => row.get("Request ID"));

  

    // Filter out requests that are already in the sheet
    const newRequests = paymentRequests.filter(
      (req) => !existingRequestIds.includes(req.requestId)
    );


    if (newRequests.length > 0) {
      // Add only new requests to preserve existing data
      const rows = newRequests.map((req) => ({
        "Request ID": req.requestId || "",
        "Date Submitted": new Date(req.submittedAt).toLocaleDateString("en-IN"),
        "Freelancer Name": req.freelancerName || "",
        "Freelancer Email": req.freelancerEmail || "",
        "Freelancer Phone": req.freelancerPhone || "",
        "Company Name": req.companyName || "",
        "Company Email": req.companyEmail || "",
        "Gig Title": req.gigTitle || "",
        "Gig Budget (₹)": req.gigBudget || 0,
        "Platform Commission (₹)": req.platformCommission || 0,
        "Freelancer Amount (₹)": req.freelancerReceivableAmount || 0,
        "Work Duration": req.workDetails?.workDuration || "",
        "Completion Date": req.workDetails?.completedDate
          ? new Date(req.workDetails.completedDate).toLocaleDateString("en-IN")
          : "",
        "Project Description": req.workDetails?.projectDescription || "",
        "Account Holder Name": req.bankDetails?.accountHolderName || "",
        "Account Number": req.bankDetails?.accountNumber || "",
        "IFSC Code": req.bankDetails?.ifscCode || "",
        "Bank Name": req.bankDetails?.bankName || "",
        "UPI ID": req.bankDetails?.upiId || "",
        "PAN Number": req.bankDetails?.panNumber || "",
        Status: req.status || "pending",
        "Urgency Level": req.urgencyLevel || "normal",
        "Additional Notes": req.additionalNotes || "",
        "Submitted At": new Date(req.submittedAt).toLocaleString("en-IN"),
        "Application ID": req.applicationId || "",
        "Processing Notes": req.processingNotes || "",
      }));

      await sheet.addRows(rows);
    }


    return {
      success: true,
      syncedCount: newRequests.length,
      totalInSheet: existingRequestIds.length + newRequests.length,
      sheetUrl: `https://docs.google.com/spreadsheets/d/${process.env.GOOGLE_SHEET_ID}`,
    };
  } catch (error) {
    console.error("❌ Bulk sync failed:", error);
    throw error;
  }
};

// Bulk sync all withdrawals to Google Sheet (preserving existing data)
export const syncAllWithdrawalsToSheet = async () => {
  try {
 
    const Payment = (await import("@/models/Payment")).default;
    await (await import("@/lib/mongodb")).default();

    const doc = await initializeGoogleSheets();

    // Get existing sheet or create new one
    let sheet = doc.sheetsByTitle["Withdrawal Requests"];
    if (!sheet) {
      sheet = await doc.addSheet({
        title: "Withdrawal Requests",
        headerValues: [
          "Withdrawal ID",
          "Date Requested",
          "Freelancer Name",
          "Freelancer Email",
          "Freelancer Phone",
          "Amount (₹)",
          "Account Holder Name",
          "Account Number",
          "IFSC Code",
          "Bank Name",
          "UPI ID",
          "Status",
          "Available Balance (₹)",
          "Total Earnings (₹)",
          "Processing Notes",
          "Processed Date",
          "Transfer ID",
        ],
      });
    }

    // Get all withdrawal requests
    const withdrawals = await Payment.find({ type: "withdrawal" })
      .populate("payer", "name email profile.phone")
      .sort({ createdAt: -1 });

    // Get existing rows to avoid duplicates
    const existingRows = await sheet.getRows();
    const existingWithdrawalIds = existingRows.map((row) =>
      row.get("Withdrawal ID")
    );

   
    // Filter out withdrawals that are already in the sheet
    const newWithdrawals = withdrawals.filter(
      (withdrawal) =>
        !existingWithdrawalIds.includes(
          withdrawal.metadata?.withdrawalId ||
            withdrawal._id.toString().slice(-8)
        )
    );

   
    if (newWithdrawals.length > 0) {
      // Add only new withdrawals to preserve existing data
      const rows = newWithdrawals.map((withdrawal) => ({
        "Withdrawal ID":
          withdrawal.metadata?.withdrawalId ||
          withdrawal._id.toString().slice(-8),
        "Date Requested": new Date(withdrawal.createdAt).toLocaleDateString(
          "en-IN"
        ),
        "Freelancer Name":
          withdrawal.metadata?.freelancerName || withdrawal.payer?.name || "",
        "Freelancer Email":
          withdrawal.metadata?.freelancerEmail || withdrawal.payer?.email || "",
        "Freelancer Phone":
          withdrawal.metadata?.freelancerPhone ||
          withdrawal.payer?.profile?.phone ||
          "",
        "Amount (₹)": withdrawal.amount || 0,
        "Account Holder Name":
          withdrawal.bankAccountDetails?.accountHolderName || "",
        "Account Number": withdrawal.bankAccountDetails?.accountNumber || "",
        "IFSC Code": withdrawal.bankAccountDetails?.ifscCode || "",
        "Bank Name": withdrawal.bankAccountDetails?.bankName || "",
        "UPI ID": withdrawal.bankAccountDetails?.upiId || "",
        Status: withdrawal.status || "pending",
        "Available Balance (₹)": withdrawal.metadata?.availableBalance || 0,
        "Total Earnings (₹)": withdrawal.metadata?.totalEarnings || 0,
        "Processing Notes":
          withdrawal.statusHistory
            ?.map(
              (h) =>
                `${new Date(h.timestamp).toLocaleDateString("en-IN")}: ${
                  h.description
                }`
            )
            .join("\n") || "",
        "Processed Date": withdrawal.transferDetails?.transferredAt
          ? new Date(
              withdrawal.transferDetails.transferredAt
            ).toLocaleDateString("en-IN")
          : "",
        "Transfer ID": withdrawal.transferDetails?.transferId || "",
      }));

      await sheet.addRows(rows);
    }

 
    return {
      success: true,
      syncedCount: newWithdrawals.length,
      totalInSheet: existingWithdrawalIds.length + newWithdrawals.length,
      sheetUrl: `https://docs.google.com/spreadsheets/d/${process.env.GOOGLE_SHEET_ID}`,
    };
  } catch (error) {
    console.error("❌ Withdrawal bulk sync failed:", error);
    throw error;
  }
};
