// models/PaymentRequest.js - Fixed version
import mongoose from "mongoose";

const paymentRequestSchema = new mongoose.Schema(
  {
    // Request Information
    requestId: {
      type: String,
      unique: true,
      // 🔧 REMOVE required: true - let the pre-save hook generate it
      default: function () {
        const timestamp = Date.now().toString().slice(-6);
        const randomStr = Math.random()
          .toString(36)
          .substring(2, 5)
          .toUpperCase();
        return `PR${timestamp}${randomStr}`;
      },
    },

    // Gig and Application Details
    gig: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Gig",
      required: true,
    },
    gigTitle: {
      type: String,
      required: true,
    },
    gigBudget: {
      type: Number,
      required: true,
    },
    freelancerReceivableAmount: {
      type: Number,
      required: true,
    },
    platformCommission: {
      type: Number,
      required: true,
    },

    // Application Details
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    applicationDate: {
      type: Date,
      required: true,
    },
    approvedDate: {
      type: Date,
      required: true,
    },

    // Freelancer Information
    freelancer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    freelancerName: {
      type: String,
      required: true,
    },
    freelancerEmail: {
      type: String,
      required: true,
    },
    freelancerPhone: {
      type: String,
      required: true,
    },
    freelancerLocation: {
      type: String,
    },

    // Company Information
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    companyName: {
      type: String,
      required: true,
    },
    companyEmail: {
      type: String,
      required: true,
    },

    // Bank Account Details
    bankDetails: {
      accountHolderName: {
        type: String,
        required: true,
        trim: true,
      },
      accountNumber: {
        type: String,
        trim: true,
      },
      ifscCode: {
        type: String,
        trim: true,
        uppercase: true,
      },
      bankName: {
        type: String,
        trim: true,
      },
      branchName: {
        type: String,
        trim: true,
      },
      upiId: {
        type: String,
        trim: true,
        lowercase: true,
      },
      panNumber: {
        type: String,
        required: true,
        trim: true,
        uppercase: true,
        validate: {
          validator: function (v) {
            return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(v);
          },
          message: "Invalid PAN number format",
        },
      },
    },

    // Work Details
    workDetails: {
      projectDescription: {
        type: String,
        required: true,
        maxLength: 1000,
      },
      deliverables: [
        {
          type: String,
        },
      ],
      completedDate: {
        type: Date,
        required: true,
      },
      workDuration: {
        type: String, // e.g., "2 weeks", "1 month"
        required: true,
      },
      clientSatisfactionRating: {
        type: Number,
        min: 1,
        max: 5,
        default: 5,
      },
    },

    // Request Status
    status: {
      type: String,
      enum: ["pending", "approved", "processing", "completed", "rejected"],
      default: "pending",
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    processedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },

    // Additional Information
    additionalNotes: {
      type: String,
      maxLength: 500,
    },
    urgencyLevel: {
      type: String,
      enum: ["normal", "urgent", "critical"],
      default: "normal",
    },

    // Admin Notes
    adminNotes: [
      {
        note: String,
        addedBy: String,
        addedAt: { type: Date, default: Date.now },
      },
    ],

    // Excel Export Tracking
    exportedToExcel: {
      type: Boolean,
      default: false,
    },
    excelExportDate: {
      type: Date,
    },
    excelRowNumber: {
      type: Number,
    },
  },
  {
    timestamps: true,
  }
);

// 🔧 SIMPLIFIED Pre-save middleware - only as backup
paymentRequestSchema.pre("save", function (next) {
  if (!this.requestId) {
    const timestamp = Date.now().toString().slice(-6);
    const randomStr = Math.random().toString(36).substring(2, 5).toUpperCase();
    this.requestId = `PR${timestamp}${randomStr}`;
  }
  next();
});

// Custom validation for bank details
paymentRequestSchema.pre("save", function (next) {
  const { accountNumber, upiId, ifscCode } = this.bankDetails;

  // Either account number or UPI ID is required
  if (!accountNumber && !upiId) {
    return next(new Error("Either account number or UPI ID is required"));
  }

  // If account number is provided, IFSC code is required
  if (accountNumber && !ifscCode) {
    return next(
      new Error("IFSC code is required when account number is provided")
    );
  }

  next();
});

// Instance method to format data for Excel export
paymentRequestSchema.methods.toExcelFormat = function () {
  return {
    "Request ID": this.requestId,
    "Freelancer Name": this.freelancerName,
    "Freelancer Email": this.freelancerEmail,
    "Freelancer Phone": this.freelancerPhone,
    "Company Name": this.companyName,
    "Gig Title": this.gigTitle,
    "Gig Budget": this.gigBudget,
    "Freelancer Amount": this.freelancerReceivableAmount,
    "Platform Commission": this.platformCommission,
    "Account Holder Name": this.bankDetails.accountHolderName,
    "Account Number": this.bankDetails.accountNumber || "N/A",
    "IFSC Code": this.bankDetails.ifscCode || "N/A",
    "Bank Name": this.bankDetails.bankName || "N/A",
    "UPI ID": this.bankDetails.upiId || "N/A",
    "PAN Number": this.bankDetails.panNumber,
    "Work Duration": this.workDetails.workDuration,
    "Completed Date":
      this.workDetails.completedDate.toLocaleDateString("en-IN"),
    Status: this.status.toUpperCase(),
    "Submitted Date": this.submittedAt.toLocaleDateString("en-IN"),
    Urgency: this.urgencyLevel.toUpperCase(),
    "Client Rating": this.workDetails.clientSatisfactionRating,
    Location: this.freelancerLocation || "N/A",
    "Additional Notes": this.additionalNotes || "N/A",
  };
};

// Static method to get Excel headers
paymentRequestSchema.statics.getExcelHeaders = function () {
  return [
    "Request ID",
    "Freelancer Name",
    "Freelancer Email",
    "Freelancer Phone",
    "Company Name",
    "Gig Title",
    "Gig Budget",
    "Freelancer Amount",
    "Platform Commission",
    "Account Holder Name",
    "Account Number",
    "IFSC Code",
    "Bank Name",
    "UPI ID",
    "PAN Number",
    "Work Duration",
    "Completed Date",
    "Status",
    "Submitted Date",
    "Urgency",
    "Client Rating",
    "Location",
    "Additional Notes",
  ];
};

// Indexes for better performance
paymentRequestSchema.index({ requestId: 1 });
paymentRequestSchema.index({ freelancer: 1, status: 1 });
paymentRequestSchema.index({ gig: 1 });
paymentRequestSchema.index({ submittedAt: -1 });
paymentRequestSchema.index({ status: 1, submittedAt: -1 });
paymentRequestSchema.index({ company: 1, status: 1 });

export default mongoose.models.PaymentRequest ||
  mongoose.model("PaymentRequest", paymentRequestSchema);
