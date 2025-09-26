// controllers/bankDetailsController.js
import asyncHandler from "../utils/asyncHandler.js";
import apiError from "../utils/apiError.js";
import apiResponse from "../utils/apiResponse.js";
import { User } from "../models/UserModel.js";

// @desc    Get freelancer bank details
// @route   GET /api/freelancer/bank-details
// @access  Private (Freelancers only)
export const getBankDetails = asyncHandler(async (req, res) => {
  const user = req.user;

  if (user.role !== "freelancer") {
    throw new apiError("Only freelancers can access bank details", 403);
  }

  const bankDetails = user.profile?.bankDetails || {};

  res
    .status(200)
    .json(
      new apiResponse(
        200,
        { bankDetails },
        "Bank details retrieved successfully"
      )
    );
});

// @desc    Update freelancer bank details
// @route   POST /api/freelancer/bank-details
// @access  Private (Freelancers only)
export const updateBankDetails = asyncHandler(async (req, res) => {
  const user = req.user;

  if (user.role !== "freelancer") {
    throw new apiError("Only freelancers can update bank details", 403);
  }

  const {
    accountHolderName,
    accountNumber,
    ifscCode,
    bankName,
    branchName,
    upiId,
    panNumber,
  } = req.body;

  // Validation
  if (!accountHolderName?.trim()) {
    throw new apiError("Account holder name is required", 400);
  }

  // Either account number or UPI ID is required
  if (!accountNumber?.trim() && !upiId?.trim()) {
    throw new apiError("Either account number or UPI ID is required", 400);
  }

  // If account number provided, IFSC is required
  if (accountNumber?.trim() && !ifscCode?.trim()) {
    throw new apiError("IFSC code is required when using account number", 400);
  }

  // Validate formats
  if (accountNumber && !/^\d{9,18}$/.test(accountNumber)) {
    throw new apiError("Invalid account number format (9-18 digits)", 400);
  }

  if (ifscCode && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode)) {
    throw new apiError("Invalid IFSC code format", 400);
  }

  if (upiId && !/^[\w\.-]+@[\w\.-]+$/.test(upiId)) {
    throw new apiError("Invalid UPI ID format", 400);
  }

  if (panNumber && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(panNumber)) {
    throw new apiError("Invalid PAN number format", 400);
  }

  // Initialize profile if doesn't exist
  if (!user.profile) {
    user.profile = {};
  }

  // Update bank details
  const newBankDetails = {
    accountHolderName: accountHolderName.trim(),
    accountNumber: accountNumber?.trim() || "",
    ifscCode: ifscCode?.trim().toUpperCase() || "",
    bankName: bankName?.trim() || "",
    branchName: branchName?.trim() || "",
    upiId: upiId?.trim().toLowerCase() || "",
    panNumber: panNumber?.trim().toUpperCase() || "",
    updatedAt: new Date(),
  };

  user.profile.bankDetails = newBankDetails;
  await user.save();

  res
    .status(200)
    .json(
      new apiResponse(
        200,
        { bankDetails: newBankDetails },
        "Bank details updated successfully"
      )
    );
});

// @desc    Validate bank details
// @route   POST /api/freelancer/bank-details/validate
// @access  Private (Freelancers only)
export const validateBankDetails = asyncHandler(async (req, res) => {
  const { accountNumber, ifscCode, upiId } = req.body;

  const validation = {
    accountNumber: {
      isValid: accountNumber ? /^\d{9,18}$/.test(accountNumber) : null,
      message: accountNumber
        ? /^\d{9,18}$/.test(accountNumber)
          ? "Valid account number"
          : "Invalid account number format (9-18 digits)"
        : "Account number not provided",
    },
    ifscCode: {
      isValid: ifscCode ? /^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode) : null,
      message: ifscCode
        ? /^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode)
          ? "Valid IFSC code"
          : "Invalid IFSC code format"
        : "IFSC code not provided",
    },
    upiId: {
      isValid: upiId ? /^[\w\.-]+@[\w\.-]+$/.test(upiId) : null,
      message: upiId
        ? /^[\w\.-]+@[\w\.-]+$/.test(upiId)
          ? "Valid UPI ID"
          : "Invalid UPI ID format"
        : "UPI ID not provided",
    },
  };

  const overallValid =
    (validation.accountNumber.isValid && validation.ifscCode.isValid) ||
    validation.upiId.isValid;

  res
    .status(200)
    .json(
      new apiResponse(
        200,
        { validation, overallValid },
        "Bank details validation completed"
      )
    );
});

// @desc    Check if bank details are complete
// @route   GET /api/freelancer/bank-details/status
// @access  Private (Freelancers only)
export const getBankDetailsStatus = asyncHandler(async (req, res) => {
  const user = req.user;

  if (user.role !== "freelancer") {
    throw new apiError("Only freelancers can check bank details status", 403);
  }

  const bankDetails = user.profile?.bankDetails;

  if (!bankDetails) {
    return res.status(200).json(
      new apiResponse(
        200,
        {
          isComplete: false,
          missingFields: ["All bank details missing"],
          canWithdraw: false,
        },
        "Bank details not found"
      )
    );
  }

  const requiredFields = ["accountHolderName"];
  const missingFields = [];

  // Check account holder name
  if (!bankDetails.accountHolderName?.trim()) {
    missingFields.push("Account Holder Name");
  }

  // Check if either complete bank details OR UPI ID is present
  const hasCompleteBank = bankDetails.accountNumber && bankDetails.ifscCode;
  const hasUPI = bankDetails.upiId;

  if (!hasCompleteBank && !hasUPI) {
    missingFields.push("Either Account Number + IFSC Code OR UPI ID");
  }

  const isComplete = missingFields.length === 0;
  const canWithdraw = isComplete;

  res.status(200).json(
    new apiResponse(
      200,
      {
        isComplete,
        missingFields,
        canWithdraw,
        hasAccountDetails: hasCompleteBank,
        hasUpiDetails: hasUPI,
        lastUpdated: bankDetails.updatedAt,
      },
      "Bank details status retrieved"
    )
  );
});

export default {
  getBankDetails,
  updateBankDetails,
  validateBankDetails,
  getBankDetailsStatus,
};
