"use client";

import { useState, useEffect, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Script from "next/script";
import { Button } from "@/components/ui/button";
import {
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  RefreshCw,
  FileText,
  DollarSign,
  Crown,
  Wallet,
  Download,
  AlertTriangle,
  ChevronRight,
  ArrowLeft,
  Package,
  BarChart3,
  Shield,
  Bell,
  User,
  MessageCircle,
  CircleHelp,
} from "lucide-react";
import { toast } from "react-hot-toast";

import ApplicationsTab from "@/components/settings/ApplicationTab";
import EarningsTab from "@/components/settings/EarningTab";
import SubscriptionTab from "@/components/settings/SubscriptionTab";
import Modals from "@/components/settings/Modal";

const useWindowSize = () => {
  const [windowSize, setWindowSize] = useState({
    width: undefined,
    height: undefined,
  });

  useEffect(() => {
    function handleResize() {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return windowSize;
};

// Create a separate component for the content that uses useSearchParams
function FreelancerSettingsContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { width } = useWindowSize();
  const isMobile = width < 768;

  const mobileView = searchParams.get("view");

  const [activeTab, setActiveTab] = useState("applications");

  const [applications, setApplications] = useState([]);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [showBankDetailsModal, setShowBankDetailsModal] = useState(false);
  const [showChangeBankDetailsModal, setShowChangeBankDetailsModal] = useState(false);
  const [bankDetails, setBankDetails] = useState({
    accountNumber: "",
    ifscCode: "",
    accountHolderName: "",
    bankName: "",
    upiId: "",
  });
  const [changeBankDetails, setChangeBankDetails] = useState({
    accountNumber: "",
    ifscCode: "",
    accountHolderName: "",
    bankName: "",
    upiId: "",
  });
  const [savingBankDetails, setSavingBankDetails] = useState(false);
  const [savingChangeBankDetails, setSavingChangeBankDetails] = useState(false);
  const [bankDetailsExist, setBankDetailsExist] = useState(false);

  const [earningsData, setEarningsData] = useState(null);
  const [payments, setPayments] = useState([]);
  const [paymentRequests, setPaymentRequests] = useState([]);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showPaymentRequestModal, setShowPaymentRequestModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [earningsActiveTab, setEarningsActiveTab] = useState("All Payments");
  const [withdrawalHistory, setWithdrawalHistory] = useState([]);

  const [enableAutoPay, setEnableAutoPay] = useState(false);
  const [plans, setPlans] = useState([]);
  const [comparisonData, setComparisonData] = useState([]);
  const [subscribing, setSubscribing] = useState(null);
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);

  const [loading, setLoading] = useState(true);
  const [earningsLoading, setEarningsLoading] = useState(false);
  const [stats, setStats] = useState({
    totalEarnings: 0,
    pendingPayments: 0,
    completedPayments: 0,
    thisMonthEarnings: 0,
    approvedApplications: 0,
    pendingRequests: 0,
    projectsInProgress: 0, // ✅ MODIFICATION: Add to initial state
  });

  const [paymentRequestForm, setPaymentRequestForm] = useState({
    bankDetails: {
      accountHolderName: "",
      accountNumber: "",
      ifscCode: "",
      bankName: "",
      branchName: "",
      upiId: "",
      panNumber: "",
    },
    workDetails: {
      projectDescription: "",
      deliverables: "",
      completedDate: "",
      workDuration: "",
      clientSatisfactionRating: 5,
    },
    freelancerPhone: "",
    additionalNotes: "",
    urgencyLevel: "normal",
  });

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        setRazorpayLoaded(true);
        resolve(true);
        return;
      }

      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => {
        setRazorpayLoaded(true);
        resolve(true);
      };
      script.onerror = () => {
        console.error("Failed to load Razorpay script");
        resolve(false);
      };
      document.body.appendChild(script);
    });
  };

  const fetchAllData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchApplications(),
        fetchBankDetails(),
        fetchEarningsData(),
        fetchPaymentRequests(),
        fetchPlans(),
        checkCurrentSubscription(),
        fetchPaymentHistory(),
      ]);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const fetchEarningsData = async () => {
    try {
      setEarningsLoading(true);

      const [earningsResponse, withdrawalsResponse] = await Promise.all([
        fetch("/api/freelancer/earnings", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }),
        fetch("/api/freelancer/withdraw", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }),
      ]);

      if (earningsResponse.ok) {
        const earningsData = await earningsResponse.json();
        if (earningsData.success) {
          setEarningsData(earningsData);
          setPayments(earningsData.earnings?.payments || []);
        }
      } else {
        console.error(
          "Failed to fetch earnings:",
          await earningsResponse.text()
        );
      }

      if (withdrawalsResponse.ok) {
        const withdrawalsData = await withdrawalsResponse.json();
        if (withdrawalsData.success) {
          setWithdrawalHistory(withdrawalsData.withdrawals || []);
          if (earningsData) {
            setEarningsData((prev) => ({
              ...prev,
              balanceInfo: withdrawalsData.balanceInfo || prev.balanceInfo,
            }));
          }
        }
      }
    } catch (error) {
      console.error("Error fetching earnings data:", error);
      toast.error("Failed to fetch earnings data");
    } finally {
      setEarningsLoading(false);
    }
  };

  const handleWithdraw = async (amount) => {
    try {
      if (!bankDetailsExist) {
        toast.error("Please add your bank details first");
        setShowBankDetailsModal(true);
        return;
      }

      const response = await fetch("/api/freelancer/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amount,
          bankDetails: bankDetails,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success(
          `Withdrawal of ₹${amount.toLocaleString()} initiated successfully!`
        );

        await fetchEarningsData();

        return data;
      } else {
        throw new Error(data.error || "Withdrawal failed");
      }
    } catch (error) {
      console.error("Withdrawal error:", error);
      toast.error(error.message || "Withdrawal failed. Please try again.");
      throw error;
    }
  };

  const fetchApplications = async () => {
    try {
      const response = await fetch("/api/freelancer/applications", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setApplications(data.applications || []);
      } else {
        console.error("API Error:", data.error);
      }
    } catch (error) {
      console.error("Error fetching applications:", error);
    }
  };

  const fetchBankDetails = async () => {
    try {
      const response = await fetch("/api/freelancer/bank-details");
      const data = await response.json();
      if (response.ok && data.success) {
        const details = data.bankDetails || {};
        setBankDetails(details);
        setBankDetailsExist(!!(details.accountNumber || details.upiId));
      } else {
        setBankDetailsExist(false);
      }
    } catch (error) {
      console.error("Error fetching bank details:", error);
      setBankDetailsExist(false);
    }
  };

  const saveBankDetails = async () => {
    try {
      setSavingBankDetails(true);
      if (!bankDetails.accountHolderName?.trim()) {
        toast.error("Account holder name is required");
        return;
      }
      if (!bankDetails.accountNumber?.trim() && !bankDetails.upiId?.trim()) {
        toast.error("Either account number or UPI ID is required");
        return;
      }
      if (bankDetails.accountNumber?.trim() && !bankDetails.ifscCode?.trim()) {
        toast.error("IFSC code is required when using account number");
        return;
      }

      const response = await fetch("/api/freelancer/bank-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bankDetails),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        toast.success("Bank details saved successfully!");
        setShowBankDetailsModal(false);
        setBankDetailsExist(true);
        await fetchBankDetails();
      } else {
        toast.error(data.error || "Failed to save bank details");
      }
    } catch (error) {
      console.error("Error saving bank details:", error);
      toast.error("Failed to save bank details");
    } finally {
      setSavingBankDetails(false);
    }
  };

  const fetchPaymentRequests = async () => {
    try {
      const response = await fetch("/api/freelancer/payment-request");
      const data = await response.json();
      if (response.ok && data.success) {
        setPaymentRequests(data.paymentRequests || []);
      }
    } catch (error) {
      console.error("Error fetching payment requests:", error);
    }
  };

  const calculateStats = (
    paymentsData,
    applicationsData,
    paymentRequestsData
  ) => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // 1. Get IDs of applications for which a payment request has already been submitted
    const requestedApplicationIds = new Set(
      paymentRequestsData.map((req) => req.applicationId)
    );

    // 2. Calculate pending amount from accepted applications that are NOT yet requested
    const pendingFromAcceptedApps = applicationsData
      .filter(
        (app) =>
          app.applicationStatus === "accepted" &&
          !requestedApplicationIds.has(app._id)
      )
      .reduce((sum, app) => sum + (app.gig?.payment?.amount || 0), 0);

    // 3. Calculate pending amount from actual payment records in "pending" or "processing" state
    const pendingFromPayments = paymentsData
      .filter((p) => p.status === "pending" || p.status === "processing")
      .reduce((sum, p) => sum + p.amount, 0);

    // ✅ MODIFICATION: Calculate total from ALL accepted projects for the stat card
    const projectsInProgressAmount = applicationsData
      .filter((app) => app.applicationStatus === "accepted")
      .reduce((sum, app) => sum + (app.gig?.budget || 0), 0);

    console.log(
      applications.filter((app) => app.applicationStatus === "accepted")
    );

    const stats = {
      totalEarnings: paymentsData
        .filter((p) => p.status === "completed")
        .reduce((sum, p) => sum + p.amount, 0),

      pendingAmount: pendingFromPayments + pendingFromAcceptedApps,

      completedPayments: paymentsData.filter((p) => p.status === "completed")
        .length,

      thisMonthEarnings: paymentsData
        .filter((p) => {
          const paymentDate = new Date(p.createdAt);
          return (
            p.status === "completed" &&
            paymentDate.getMonth() === currentMonth &&
            paymentDate.getFullYear() === currentYear
          );
        })
        .reduce((sum, p) => sum + p.amount, 0),

      approvedApplications: applicationsData.filter(
        (app) => app.applicationStatus === "accepted"
      ).length,

      pendingRequests: paymentRequestsData.filter(
        (req) => req.status === "pending"
      ).length,

      // ✅ MODIFICATION: Add the new calculated value to the stats object
      projectsInProgress: projectsInProgressAmount,
    };

    setStats(stats);
  };

  const handlePaymentRequestSubmit = async () => {
    if (!selectedApplication) return;

    try {
      setSubmittingRequest(true);

      const {
        bankDetails: formBankDetails,
        workDetails,
        freelancerPhone,
      } = paymentRequestForm;

      if (!formBankDetails.accountHolderName || !formBankDetails.panNumber) {
        toast.error("Account holder name and PAN number are required");
        return;
      }

      if (!formBankDetails.accountNumber && !formBankDetails.upiId) {
        toast.error("Either account number or UPI ID is required");
        return;
      }

      if (formBankDetails.accountNumber && !formBankDetails.ifscCode) {
        toast.error("IFSC code is required when providing account number");
        return;
      }

      if (
        !workDetails.projectDescription ||
        !workDetails.completedDate ||
        !freelancerPhone
      ) {
        toast.error("Please fill in all required work details");
        return;
      }

      const requestData = {
        gigId: selectedApplication.gigId,
        applicationId: selectedApplication._id,
        bankDetails: {
          ...formBankDetails,
          panNumber: formBankDetails.panNumber.toUpperCase(),
          ifscCode: formBankDetails.ifscCode.toUpperCase(),
          upiId: formBankDetails.upiId.toLowerCase(),
        },
        workDetails: {
          ...workDetails,
          deliverables: workDetails.deliverables
            .split("\n")
            .filter((d) => d.trim()),
        },
        freelancerPhone,
        additionalNotes: paymentRequestForm.additionalNotes,
        urgencyLevel: paymentRequestForm.urgencyLevel,
      };

      const response = await fetch("/api/freelancer/payment-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success("Payment request submitted successfully!");
        setShowPaymentRequestModal(false);
        setShowSuccessModal(true);
        setSelectedApplication(null);

        setPaymentRequestForm({
          bankDetails: {
            accountHolderName: "",
            accountNumber: "",
            ifscCode: "",
            bankName: "",
            branchName: "",
            upiId: "",
            panNumber: "",
          },
          workDetails: {
            projectDescription: "",
            deliverables: "",
            completedDate: "",
            workDuration: "",
            clientSatisfactionRating: 5,
          },
          freelancerPhone: "",
          additionalNotes: "",
          urgencyLevel: "normal",
        });

        await fetchPaymentRequests();
      } else {
        toast.error(data.error || "Failed to submit payment request");
      }
    } catch (error) {
      console.error("Error submitting payment request:", error);
      toast.error("Failed to submit payment request");
    } finally {
      setSubmittingRequest(false);
    }
  };

  const fetchPlans = async () => {
    try {
      const response = await fetch("/api/subscription/plans?role=freelancer");
      const data = await response.json();
      if (data.success) {
        setPlans(data.plans);
        setComparisonData(data.comparisonData.freelancer);
      }
    } catch (error) {
      console.error("Error fetching plans:", error);
    }
  };

  const checkCurrentSubscription = async () => {
    try {
      const response = await fetch("/api/subscription/status");
      const data = await response.json();
      if (response.ok && data.success && data.hasActiveSubscription) {
        setCurrentSubscription(data.subscription);
      }
    } catch (error) {
      console.error("Error checking subscription:", error);
    }
  };

  const fetchPaymentHistory = async () => {
    try {
      const response = await fetch("/api/payments/history?type=subscription");
      const data = await response.json();
      if (data.success) {
        setPaymentHistory(data.payments || []);
      }
    } catch (error) {
      console.error("Error fetching payment history:", error);
    }
  };

  // Updated handleSubscribe function for FreelancerSettingsContent component

  const handleSubscribe = async (plan) => {
    if (!session) {
      toast.error("Please login to subscribe");
      router.push("/login");
      return;
    }

    if (!razorpayLoaded) {
      toast.error("Payment system is loading. Please try again in a moment.");
      await loadRazorpayScript();
      return;
    }

    const planKey = `${plan.id}`;
    setSubscribing(planKey);

    try {
      // Determine autopay based on plan specifics
      const isMonthlyBasicPlan =
        plan.planType === "basic" &&
        plan.duration === "monthly" &&
        plan.price === 199;

      // Force autopay for monthly ₹199 plan, disable for others
      const finalEnableAutoPay = isMonthlyBasicPlan;

      console.log("Plan details:", {
        planType: plan.planType,
        duration: plan.duration,
        price: plan.price,
        isMonthlyBasicPlan,
        finalEnableAutoPay,
      });

      const orderResponse = await fetch("/api/subscription/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planType: plan.planType,
          duration: plan.duration,
          enableAutoPay: finalEnableAutoPay, // This will be true only for monthly ₹199 plan
        }),
      });

      const orderData = await orderResponse.json();

      if (!orderResponse.ok || !orderData.success) {
        throw new Error(orderData.error || "Failed to create order");
      }

      console.log("📦 Order Response:", orderData);

      // ✅ NEW: Handle free plan response
      if (orderData.paymentType === "free") {
        console.log("✅ Free plan detected - no Razorpay modal needed");

        // Show success message
        toast.success("🎉 Free plan activated successfully!");

        // Refresh subscription status
        await checkCurrentSubscription();
        await fetchPaymentHistory();

        // Reset loading state
        setSubscribing(null);

        // Optional: redirect or update UI state
        // router.push("/dashboard");

        return; // ✅ CRITICAL: Exit here - don't open Razorpay modal
      }

      // Show info message about payment type for paid plans
      if (isMonthlyBasicPlan) {
        toast("Setting up auto-renewal for monthly plan", { icon: "🔄" });
      } else {
        toast("Processing one-time payment", { icon: "💳" });
      }

      // Enhanced Razorpay options
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Un-Job AI",
        description: `${plan.name} Plan (${plan.duration})${
          isMonthlyBasicPlan ? " - Auto-renewal" : " - One-time"
        }`,
        image: "/logo.png",
        order_id: orderData.orderId,
        subscription_id: orderData.subscriptionId,

        method: {
          netbanking: true,
          card: true,
          upi: true,
          wallet: true,
          emi: true,
          paylater: true,
        },

        config: {
          display: {
            blocks: {
              banks: {
                name: "Pay via UPI",
                instruments: [{ method: "upi" }],
              },
            },
            sequence: ["block.banks"],
            preferences: {
              show_default_blocks: true,
            },
          },
        },

        handler: async function (response) {
          toast.loading("Verifying payment...", { id: "payment-verify" });
          const verifyResponse = await fetch(
            "/api/subscription/verify-payment",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...response,
                subscriptionId: orderData.dbSubscriptionId,
                paymentType: orderData.paymentType,
              }),
            }
          );
          const verifyData = await verifyResponse.json();
          toast.dismiss("payment-verify");
          if (verifyData.success) {
            const successMessage = isMonthlyBasicPlan
              ? "🎉 Subscription activated with auto-renewal!"
              : "🎉 Subscription activated successfully!";
            toast.success(successMessage);
            await checkCurrentSubscription();
            await fetchPaymentHistory();
          } else {
            toast.error(verifyData.error || "Payment verification failed");
          }
          setSubscribing(null);
        },

        prefill: {
          name: session.user.name || "",
          email: session.user.email || "",
          contact: session.user.phone || "",
        },

        theme: {
          color: "#10b981",
          backdrop_color: "rgba(0,0,0,0.8)",
        },

        modal: {
          ondismiss: () => {
            setSubscribing(null);
            toast("Payment cancelled.", { icon: "⚠️" });
          },
          confirm_close: true,
          escape: true,
          animation: true,
          backdropclose: false,
        },

        retry: {
          enabled: true,
          max_count: 3,
        },

        timeout: 300,
      };

      console.log("🚀 Opening Razorpay with options:", options);
      const rzp = new window.Razorpay(options);

      rzp.on("payment.failed", function (response) {
        console.error("Payment failed:", response.error);
        toast.error(`Payment failed: ${response.error.description}`);
        setSubscribing(null);
      });

      rzp.open();
    } catch (error) {
      console.error("Subscription error:", error);
      toast.error(error.message || "Failed to process subscription");
      setSubscribing(null);
    }
  };
  const getStatusIcon = (status) => {
    switch (status) {
      case "accepted":
      case "completed":
      case "approved":
        return <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-[#10B981]" />;
      case "rejected":
      case "failed":
        return <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-500" />;
      case "processing":
        return <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />;
      default:
        return <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "accepted":
      case "completed":
      case "approved":
        return "bg-[#10B981]/20 text-[#10B981] border-[#10B981]";
      case "rejected":
      case "failed":
        return "bg-red-500/20 text-red-400 border-red-500";
      case "processing":
        return "bg-blue-500/20 text-blue-400 border-blue-500";
      default:
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500";
    }
  };

  const openChat = (conversationId) => {
    router.push(`/dashboard/messages`);
  };

  const handleBankDetailsChange = (field, value) => {
    setBankDetails((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleChangeBankDetailsChange = (field, value) => {
    setChangeBankDetails((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const showChangeBankDetails = () => {
    // Pre-fill the change bank details form with current bank details
    setChangeBankDetails({
      accountNumber: bankDetails.accountNumber || "",
      ifscCode: bankDetails.ifscCode || "",
      accountHolderName: bankDetails.accountHolderName || "",
      bankName: bankDetails.bankName || "",
      upiId: bankDetails.upiId || "",
    });
    setShowChangeBankDetailsModal(true);
  };

  const saveChangeBankDetails = async () => {
    try {
      setSavingChangeBankDetails(true);
      if (!changeBankDetails.accountHolderName?.trim()) {
        toast.error("Account holder name is required");
        return;
      }
      if (!changeBankDetails.accountNumber?.trim() && !changeBankDetails.upiId?.trim()) {
        toast.error("Either account number or UPI ID is required");
        return;
      }
      if (changeBankDetails.accountNumber?.trim() && !changeBankDetails.ifscCode?.trim()) {
        toast.error("IFSC code is required when using account number");
        return;
      }

      const response = await fetch("/api/freelancer/bank-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changeBankDetails),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        toast.success("Bank details updated successfully!");
        setShowChangeBankDetailsModal(false);
        setBankDetailsExist(true);
        // Update the main bankDetails state with the new details
        setBankDetails({...changeBankDetails});
        await fetchBankDetails();
      } else {
        toast.error(data.error || "Failed to update bank details");
      }
    } catch (error) {
      console.error("Error updating bank details:", error);
      toast.error("Failed to update bank details");
    } finally {
      setSavingChangeBankDetails(false);
    }
  };

  const formatDate = (dateString) =>
    new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  const formatCurrency = (amount) => `₹${amount.toLocaleString()}`;

  useEffect(() => {
    loadRazorpayScript();
  }, []);

  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (session?.user) {
      fetchAllData();
    }
  }, [session, status]);

  useEffect(() => {
    if (session?.user) {
      calculateStats(payments, applications, paymentRequests);
    }
  }, [payments, applications, paymentRequests, session]);

  useEffect(() => {
    const tabMap = {
      projects: "applications",
      payments: "earnings",
      subscription: "subscription",
    };
    if (mobileView && tabMap[mobileView]) {
      setActiveTab(tabMap[mobileView]);
    }
  }, [mobileView]);

  const filteredPayments = payments.filter((payment) => {
    const matchesSearch =
      payment.gig?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.payer?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || payment.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const acceptedApplications = applications.filter(
    (app) => app.applicationStatus === "accepted"
  );

  if (isMobile) {
    const renderMobileContent = () => {
      switch (mobileView) {
        case "projects":
          return (
            <ApplicationsTab
              applications={applications}
              stats={stats}
              acceptedApplications={acceptedApplications}
              setSelectedApplication={setSelectedApplication}
              setShowPaymentRequestModal={setShowPaymentRequestModal}
              openChat={openChat}
              router={router}
              getStatusColor={getStatusColor}
              getStatusIcon={getStatusIcon}
              formatCurrency={formatCurrency}
            />
          );
        case "payments":
          return (
            <EarningsTab
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              filteredPayments={filteredPayments}
              paymentRequests={paymentRequests}
              setSelectedPayment={setSelectedPayment}
              activeTab={earningsActiveTab}
              setActiveTab={setEarningsActiveTab}
              tabs={["All Payments", "Withdrawals"]}
              formatDate={formatDate}
              getStatusColor={getStatusColor}
              getStatusIcon={getStatusIcon}
              projectsInProgressAmount={stats.projectsInProgress}
              earningsData={earningsData}
              onWithdraw={handleWithdraw}
              loading={earningsLoading}
            />
          );
        case "subscription":
          return (
            <SubscriptionTab
              currentSubscription={currentSubscription}
              plans={plans}
              subscribing={subscribing}
              handleSubscribe={handleSubscribe}
              paymentHistory={paymentHistory}
              showHistory={showHistory}
              setShowHistory={setShowHistory}
              enableAutoPay={enableAutoPay} // ADD THIS
              setEnableAutoPay={setEnableAutoPay} // ADD THIS
              formatCurrency={formatCurrency}
              formatDate={formatDate}
            />
          );
        case "reports":
          return (
            <div className="text-center p-8">Reports feature coming soon!</div>
          );
        case "insights":
          return (
            <div className="text-center p-8">Insights feature coming soon!</div>
          );
        default:
          return <MobileSettingsList />;
      }
    };

    const MobileSettingsList = () => {
      const menuItems = [
        { label: "Projects", icon: Package, view: "projects" },
        { label: "Subscriptions", icon: Crown, view: "subscription" },
        { label: "Payments", icon: Wallet, view: "payments" },
        {
          label: "Terms Of Services",
          icon: FileText,
          view: "/terms-of-services",
        },
        { label: "Refund Policy", icon: RefreshCw, view: "/refund-policy" },
        { label: "Privacy Policy", icon: Shield, view: "/privacy-policy" },
        { label: "Contact", icon: MessageCircle, view: "/contact-us" },
        { label: "Support", icon: CircleHelp, view: "/dashboard/help" },
      ];

      const handleMenuItemClick = (item) => {
        if (item.view.startsWith("/")) {
          // For external routes (starting with /), navigate directly
          router.push(item.view);
        } else {
          // For internal views, use the query parameter
          router.push(`/dashboard/settings/freelancer?view=${item.view}`);
        }
      };

      return (
        <div className="p-4">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-bold text-white">Settings</h1>
            <div></div>
          </div>
          <div className="space-y-">
            {menuItems.map((item) => (
              <button
                key={item.view}
                onClick={() => handleMenuItemClick(item)}
                className="w-full flex items-center justify-between p-4 rounded-lg text-left "
              >
                <div className="flex items-center">
                  <item.icon className="h-8 w-8 text-white mr-4 border border-white rounded-full p-1" />
                  <span className="text-white font-medium">{item.label}</span>
                </div>
                <ChevronRight className="h-5 w-5 text-[#10B981]" />
              </button>
            ))}
          </div>
        </div>
      );
    };

    return (
      <>
        <div className="min-h-screen bg-black text-white">
          {mobileView && (
            <header className="p-4 flex items-center gap-4 sticky top-0 bg-black/80 backdrop-blur-sm z-10 border-b border-gray-800 ">
              <Button onClick={() => router.back()} variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h2 className="text-lg font-semibold capitalize">{mobileView}</h2>
            </header>
          )}
          <main className={mobileView ? "p-4" : ""}>
            {renderMobileContent()}
          </main>
        </div>
        <Modals
          {...{
            selectedApplication,
            setSelectedApplication,
            getStatusColor,
            getStatusIcon,
            openChat,
            showBankDetailsModal,
            setShowBankDetailsModal,
            bankDetails,
            handleBankDetailsChange,
            savingBankDetails,
            saveBankDetails,
            bankDetailsExist,
            selectedPayment,
            setSelectedPayment,
            showPaymentRequestModal,
            setShowPaymentRequestModal,
            paymentRequestForm,
            setPaymentRequestForm,
            handlePaymentRequestSubmit,
            submittingRequest,
            showSuccessModal,
            setShowSuccessModal,
            setActiveTab,
          }}
        />
      </>
    );
  }

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        onLoad={() => setRazorpayLoaded(true)}
        onError={() => console.error("Failed to load Razorpay")}
      />
      <div className="min-h-screen bg-black text-white overflow-x-hidden">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8">
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold mb-2 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent truncate">
                  Freelancer Dashboard
                </h1>
                <p className="text-gray-400 text-xs sm:text-sm">
                  Manage your applications, earnings, and subscription
                </p>
              </div>
              <Button
                onClick={fetchAllData}
                variant="outline"
                size="sm"
                className="border-gray-600/50 text-gray-300 hover:bg-gray-800/50 backdrop-blur-sm transition-all duration-200 w-full sm:w-auto"
                style={{
                  borderColor: "#10B981",
                }}
                onMouseEnter={(e) => {
                  e.target.style.background =
                    "linear-gradient(180deg, #10B981 0%, #376A59 100%)";
                  e.target.style.color = "black";
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = "transparent";
                  e.target.style.color = "#D1D5DB";
                }}
                disabled={loading || earningsLoading}
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${
                    earningsLoading ? "animate-spin" : ""
                  }`}
                />
                Refresh
              </Button>
            </div>

            {!bankDetailsExist && activeTab === "earnings" && (
              <div className="mt-4 p-3 sm:p-4 bg-green-500/10 border border-green-500/30 rounded-lg flex flex-col sm:flex-row sm:items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-green-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-green-400 font-medium text-sm sm:text-base">
                    Bank Details Required
                  </p>
                  <p className="text-green-300/80 text-xs sm:text-sm">
                    Add your bank details to request payments and withdrawals
                  </p>
                </div>
                <Button
                  onClick={() => setShowBankDetailsModal(true)}
                  variant="outline"
                  size="sm"
                  className="border-green-500/50 text-green-400 hover:bg-green-500/10 w-full sm:w-auto"
                >
                  Add Details
                </Button>
              </div>
            )}
          </div>

          <div className="flex justify-start mb-6 sm:mb-8 px-2">
            <div className="overflow-x-auto scrollbar-hide">
              <div className="flex bg-gray-800/50 backdrop-blur-sm rounded-full p-1 border border-gray-700/50 ">
                <button
                  onClick={() => setActiveTab("applications")}
                  className={`px-3 sm:px-6 py-2 rounded-full transition-all duration-200 text-xs sm:text-sm font-medium whitespace-nowrap ${
                    activeTab === "applications"
                      ? "text-black font-semibold"
                      : "text-gray-400 hover:text-white"
                  }`}
                  style={{
                    background:
                      activeTab === "applications"
                        ? "linear-gradient(180deg, #10B981 0%, #376A59 100%)"
                        : "transparent",
                  }}
                >
                  <FileText className="h-3 w-3 sm:h-4 sm:w-4 inline mr-1 sm:mr-2" />
                  Projects
                </button>
                <button
                  onClick={() => setActiveTab("earnings")}
                  className={`px-3 sm:px-6 py-2 rounded-full transition-all duration-200 text-xs sm:text-sm font-medium whitespace-nowrap ${
                    activeTab === "earnings"
                      ? "text-black font-semibold"
                      : "text-gray-400 hover:text-white"
                  }`}
                  style={{
                    background:
                      activeTab === "earnings"
                        ? "linear-gradient(180deg, #10B981 0%, #376A59 100%)"
                        : "transparent",
                  }}
                >
                  <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 inline mr-1 sm:mr-2" />
                  Payments
                  {earningsLoading && (
                    <Loader2 className="h-3 w-3 inline ml-1 animate-spin" />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab("subscription")}
                  className={`px-3 sm:px-6 py-2 rounded-full transition-all duration-200 text-xs sm:text-sm font-medium whitespace-nowrap ${
                    activeTab === "subscription"
                      ? "text-black font-semibold"
                      : "text-gray-400 hover:text-white"
                  }`}
                  style={{
                    background:
                      activeTab === "subscription"
                        ? "linear-gradient(180deg, #10B981 0%, #376A59 100%)"
                        : "transparent",
                  }}
                >
                  <Crown className="h-3 w-3 sm:h-4 sm:w-4 inline mr-1 sm:mr-2" />
                  Subscription
                </button>
              </div>
            </div>
          </div>

          <div className="w-full overflow-x-hidden">
            {activeTab === "applications" && (
              <ApplicationsTab
                applications={applications}
                stats={stats}
                acceptedApplications={acceptedApplications}
                setSelectedApplication={setSelectedApplication}
                setShowPaymentRequestModal={setShowPaymentRequestModal}
                openChat={openChat}
                router={router}
                getStatusColor={getStatusColor}
                getStatusIcon={getStatusIcon}
                formatCurrency={formatCurrency}
              />
            )}
            {activeTab === "earnings" && (
              <EarningsTab
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                filteredPayments={filteredPayments}
                paymentRequests={paymentRequests}
                setSelectedPayment={setSelectedPayment}
                activeTab={earningsActiveTab}
                setActiveTab={setEarningsActiveTab}
                tabs={["All Payments", "Withdrawals"]}
                formatDate={formatDate}
                getStatusColor={getStatusColor}
                getStatusIcon={getStatusIcon}
                // ✅ MODIFICATION: Pass the calculated value to the component
                projectsInProgressAmount={stats.projectsInProgress}
                earningsData={earningsData}
                onWithdraw={handleWithdraw}
                loading={earningsLoading}
                onShowChangeBankDetails={showChangeBankDetails}
                bankDetailsExist={bankDetailsExist}
              />
            )}
            {activeTab === "subscription" && (
              <SubscriptionTab
                currentSubscription={currentSubscription}
                plans={plans}
                subscribing={subscribing}
                handleSubscribe={handleSubscribe}
                paymentHistory={paymentHistory}
                showHistory={showHistory}
                setShowHistory={setShowHistory}
                enableAutoPay={enableAutoPay} // ADD THIS
                setEnableAutoPay={setEnableAutoPay} // ADD THIS
                formatCurrency={formatCurrency}
                formatDate={formatDate}
              />
            )}
          </div>
        </div>
      </div>
      <Modals
        selectedApplication={selectedApplication}
        setSelectedApplication={setSelectedApplication}
        getStatusColor={getStatusColor}
        getStatusIcon={getStatusIcon}
        openChat={openChat}
        showBankDetailsModal={showBankDetailsModal}
        setShowBankDetailsModal={setShowBankDetailsModal}
        bankDetails={bankDetails}
        handleBankDetailsChange={handleBankDetailsChange}
        savingBankDetails={savingBankDetails}
        saveBankDetails={saveBankDetails}
        bankDetailsExist={bankDetailsExist}
        showChangeBankDetailsModal={showChangeBankDetailsModal}
        setShowChangeBankDetailsModal={setShowChangeBankDetailsModal}
        changeBankDetails={changeBankDetails}
        handleChangeBankDetailsChange={handleChangeBankDetailsChange}
        savingChangeBankDetails={savingChangeBankDetails}
        saveChangeBankDetails={saveChangeBankDetails}
        selectedPayment={selectedPayment}
        setSelectedPayment={setSelectedPayment}
        showPaymentRequestModal={showPaymentRequestModal}
        setShowPaymentRequestModal={setShowPaymentRequestModal}
        paymentRequestForm={paymentRequestForm}
        setPaymentRequestForm={setPaymentRequestForm}
        handlePaymentRequestSubmit={handlePaymentRequestSubmit}
        submittingRequest={submittingRequest}
        showSuccessModal={showSuccessModal}
        setShowSuccessModal={setShowSuccessModal}
        setActiveTab={setActiveTab}
      />
      <style jsx global>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </>
  );
}

// Loading component for Suspense boundary
function FreelancerSettingsLoading() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-[#10B981]" />
        <p className="text-gray-400">Loading freelancer settings...</p>
      </div>
    </div>
  );
}

// Main component with Suspense wrapper
function FreelancerSettingsView() {
  return (
    <Suspense fallback={<FreelancerSettingsLoading />}>
      <FreelancerSettingsContent />
    </Suspense>
  );
}

// RENAMED default export
export default FreelancerSettingsView;
