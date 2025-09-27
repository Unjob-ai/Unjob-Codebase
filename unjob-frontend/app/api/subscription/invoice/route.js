// /api/subscription/invoice/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Subscription from "@/models/Subscription";
import Payment from "@/models/Payment";
import puppeteer from "puppeteer";

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

    // Find user
    let user = null;
    const userId =
      session.user.userId ||
      session.user.id ||
      session.user._id ||
      session.user.sub;

    if (userId) {
      user = await User.findById(userId);
    }

    if (!user && session.user.email) {
      user = await User.findOne({ email: session.user.email });
    }

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get current active subscription
    const currentSubscription = await Subscription.findOne({
      user: user._id,
      status: "active",
      $or: [{ duration: "lifetime" }, { endDate: { $gt: new Date() } }],
    });

    if (!currentSubscription) {
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 404 }
      );
    }

    // Get the latest payment for this subscription
    const latestPayment = await Payment.findOne({
      payer: user._id,
      type: "subscription",
      status: "completed",
      $or: [
        { subscriptionId: currentSubscription._id },
        {
          createdAt: {
            $gte: currentSubscription.startDate,
            $lte: currentSubscription.endDate || new Date(),
          },
        },
      ],
    }).sort({ createdAt: -1 });

    if (!latestPayment) {
      return NextResponse.json(
        { error: "No payment record found for current subscription" },
        { status: 404 }
      );
    }

    // Generate invoice data
    const invoiceData = {
      invoiceNumber: `INV-${currentSubscription._id
        .toString()
        .slice(-8)
        .toUpperCase()}`,
      invoiceDate: latestPayment.createdAt,
      dueDate: latestPayment.createdAt,

      // Company details
      company: {
        name: "Un-Job AI",
        address: "India",
        email: "support@unjob.ai",
        phone: "+91 XXXXX XXXXX",
        website: "https://unjob.ai",
        gstin: "GSTIN_NUMBER_HERE", // Replace with actual GSTIN
      },

      // Customer details
      customer: {
        name: user.name || "User",
        email: user.email,
        phone: user.phone || "N/A",
        address: user.address || "India",
      },

      // Subscription details
      subscription: {
        planType: currentSubscription.planType,
        duration: currentSubscription.duration,
        startDate: currentSubscription.startDate,
        endDate: currentSubscription.endDate,
        status: currentSubscription.status,
      },

      // Payment details
      payment: {
        id: latestPayment._id,
        razorpayPaymentId: latestPayment.razorpayPaymentId,
        amount: latestPayment.amount,
        tax: calculateTax(latestPayment.amount),
        subtotal: latestPayment.amount - calculateTax(latestPayment.amount),
        total: latestPayment.amount,
        method: latestPayment.paymentMethod || "Online",
        status: latestPayment.status,
        paidAt: latestPayment.createdAt,
      },
    };

    // Check if user wants to download PDF
    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") || "json";

    if (format === "pdf") {
      // Generate PDF invoice
      const pdfBuffer = await generateInvoicePDF(invoiceData);

      return new NextResponse(pdfBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="invoice-${invoiceData.invoiceNumber}.pdf"`,
          "Content-Length": pdfBuffer.length.toString(),
        },
      });
    }

    // Return JSON invoice data
    return NextResponse.json({
      success: true,
      invoice: invoiceData,
    });
  } catch (error) {
    console.error("Invoice generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate invoice" },
      { status: 500 }
    );
  }
}

// Calculate tax (18% GST in India)
function calculateTax(amount) {
  return Math.round(amount * 0.18);
}

// Generate PDF invoice using Puppeteer
async function generateInvoicePDF(invoiceData) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();

    const htmlContent = generateInvoiceHTML(invoiceData);

    await page.setContent(htmlContent, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "20px",
        right: "20px",
        bottom: "20px",
        left: "20px",
      },
    });

    return pdfBuffer;
  } finally {
    await browser.close();
  }
}

// Generate HTML content for invoice
function generateInvoiceHTML(data) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice ${data.invoiceNumber}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
            background: #fff;
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 40px;
            border-bottom: 3px solid #10B981;
            padding-bottom: 20px;
        }
        
        .company-info h1 {
            color: #10B981;
            font-size: 32px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        
        .company-info p {
            color: #666;
            margin-bottom: 5px;
        }
        
        .invoice-info {
            text-align: right;
        }
        
        .invoice-info h2 {
            color: #333;
            font-size: 28px;
            margin-bottom: 10px;
        }
        
        .invoice-info p {
            color: #666;
            margin-bottom: 5px;
        }
        
        .billing-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 40px;
        }
        
        .billing-section {
            flex: 1;
            margin-right: 40px;
        }
        
        .billing-section:last-child {
            margin-right: 0;
        }
        
        .billing-section h3 {
            color: #10B981;
            font-size: 18px;
            margin-bottom: 15px;
            padding-bottom: 5px;
            border-bottom: 2px solid #10B981;
        }
        
        .billing-section p {
            margin-bottom: 8px;
            color: #555;
        }
        
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
        }
        
        .items-table th {
            background: #10B981;
            color: white;
            padding: 15px;
            text-align: left;
            font-weight: bold;
        }
        
        .items-table td {
            padding: 15px;
            border-bottom: 1px solid #eee;
        }
        
        .items-table tr:nth-child(even) {
            background: #f9f9f9;
        }
        
        .totals {
            width: 300px;
            margin-left: auto;
            margin-bottom: 40px;
        }
        
        .totals-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #eee;
        }
        
        .totals-row.total {
            font-weight: bold;
            font-size: 18px;
            color: #10B981;
            border-bottom: 2px solid #10B981;
            border-top: 2px solid #10B981;
            margin-top: 10px;
            padding-top: 15px;
            padding-bottom: 15px;
        }
        
        .payment-info {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #10B981;
            margin-bottom: 30px;
        }
        
        .payment-info h3 {
            color: #10B981;
            margin-bottom: 15px;
        }
        
        .payment-details {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
        }
        
        .payment-detail {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #dee2e6;
        }
        
        .payment-detail:last-child {
            border-bottom: none;
        }
        
        .footer {
            text-align: center;
            color: #666;
            font-size: 14px;
            padding-top: 30px;
            border-top: 1px solid #eee;
        }
        
        .status-badge {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
        }
        
        .status-active {
            background: #d4edda;
            color: #155724;
        }
        
        .status-paid {
            background: #d1ecf1;
            color: #0c5460;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <div class="company-info">
                <h1>${data.company.name}</h1>
                <p>${data.company.address}</p>
                <p>Email: ${data.company.email}</p>
                <p>Phone: ${data.company.phone}</p>
                <p>Website: ${data.company.website}</p>
                ${
                  data.company.gstin
                    ? `<p>GSTIN: ${data.company.gstin}</p>`
                    : ""
                }
            </div>
            <div class="invoice-info">
                <h2>INVOICE</h2>
                <p><strong>Invoice #:</strong> ${data.invoiceNumber}</p>
                <p><strong>Date:</strong> ${new Date(
                  data.invoiceDate
                ).toLocaleDateString("en-IN")}</p>
                <p><strong>Due Date:</strong> ${new Date(
                  data.dueDate
                ).toLocaleDateString("en-IN")}</p>
            </div>
        </div>

        <!-- Billing Information -->
        <div class="billing-info">
            <div class="billing-section">
                <h3>Bill To</h3>
                <p><strong>${data.customer.name}</strong></p>
                <p>${data.customer.email}</p>
                <p>Phone: ${data.customer.phone}</p>
                <p>Address: ${data.customer.address}</p>
            </div>
            <div class="billing-section">
                <h3>Subscription Details</h3>
                <p><strong>Plan:</strong> ${
                  data.subscription.planType.charAt(0).toUpperCase() +
                  data.subscription.planType.slice(1)
                }</p>
                <p><strong>Duration:</strong> ${
                  data.subscription.duration.charAt(0).toUpperCase() +
                  data.subscription.duration.slice(1)
                }</p>
                <p><strong>Start Date:</strong> ${new Date(
                  data.subscription.startDate
                ).toLocaleDateString("en-IN")}</p>
                <p><strong>End Date:</strong> ${
                  data.subscription.endDate
                    ? new Date(data.subscription.endDate).toLocaleDateString(
                        "en-IN"
                      )
                    : "Lifetime"
                }</p>
                <p><strong>Status:</strong> <span class="status-badge status-active">${
                  data.subscription.status
                }</span></p>
            </div>
        </div>

        <!-- Items Table -->
        <table class="items-table">
            <thead>
                <tr>
                    <th>Description</th>
                    <th>Period</th>
                    <th>Amount</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>
                        <strong>${
                          data.subscription.planType.charAt(0).toUpperCase() +
                          data.subscription.planType.slice(1)
                        } Plan Subscription</strong><br>
                        <small>${
                          data.subscription.duration.charAt(0).toUpperCase() +
                          data.subscription.duration.slice(1)
                        } subscription for ${data.company.name}</small>
                    </td>
                    <td>
                        ${new Date(
                          data.subscription.startDate
                        ).toLocaleDateString("en-IN")} - 
                        ${
                          data.subscription.endDate
                            ? new Date(
                                data.subscription.endDate
                              ).toLocaleDateString("en-IN")
                            : "Lifetime"
                        }
                    </td>
                    <td>₹${data.payment.subtotal.toLocaleString("en-IN")}</td>
                </tr>
            </tbody>
        </table>

        <!-- Totals -->
        <div class="totals">
            <div class="totals-row">
                <span>Subtotal:</span>
                <span>₹${data.payment.subtotal.toLocaleString("en-IN")}</span>
            </div>
            <div class="totals-row">
                <span>GST (18%):</span>
                <span>₹${data.payment.tax.toLocaleString("en-IN")}</span>
            </div>
            <div class="totals-row total">
                <span>Total:</span>
                <span>₹${data.payment.total.toLocaleString("en-IN")}</span>
            </div>
        </div>

        <!-- Payment Information -->
        <div class="payment-info">
            <h3>Payment Information</h3>
            <div class="payment-details">
                <div class="payment-detail">
                    <span>Payment ID:</span>
                    <span>${
                      data.payment.razorpayPaymentId || data.payment.id
                    }</span>
                </div>
                <div class="payment-detail">
                    <span>Payment Method:</span>
                    <span>${data.payment.method}</span>
                </div>
                <div class="payment-detail">
                    <span>Payment Status:</span>
                    <span class="status-badge status-paid">${
                      data.payment.status
                    }</span>
                </div>
                <div class="payment-detail">
                    <span>Payment Date:</span>
                    <span>${new Date(data.payment.paidAt).toLocaleDateString(
                      "en-IN"
                    )}</span>
                </div>
            </div>
        </div>

        <!-- Footer -->
        <div class="footer">
            <p>Thank you for choosing ${data.company.name}!</p>
            <p>This is a computer-generated invoice and does not require a signature.</p>
            <p>For support, contact us at ${data.company.email}</p>
        </div>
    </div>
</body>
</html>
  `;
}

// Alternative route for specific subscription invoice
export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { subscriptionId, paymentId } = await req.json();

    await connectDB();

    // Find user
    let user = null;
    const userId =
      session.user.userId ||
      session.user.id ||
      session.user._id ||
      session.user.sub;

    if (userId) {
      user = await User.findById(userId);
    }

    if (!user && session.user.email) {
      user = await User.findOne({ email: session.user.email });
    }

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Find specific subscription
    const subscription = await Subscription.findOne({
      _id: subscriptionId,
      user: user._id,
    });

    if (!subscription) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 }
      );
    }

    // Find specific payment
    const payment = await Payment.findOne({
      _id: paymentId,
      payer: user._id,
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Use GET endpoint with ?format=pdf to download invoice",
      downloadUrl: `/api/subscription/invoice?format=pdf&subscriptionId=${subscriptionId}&paymentId=${paymentId}`,
    });
  } catch (error) {
    console.error("Invoice request error:", error);
    return NextResponse.json(
      { error: "Failed to process invoice request" },
      { status: 500 }
    );
  }
}
