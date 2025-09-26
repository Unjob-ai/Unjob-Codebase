import React, { useState, useEffect } from "react";
import {
  Crown,
  Calendar,
  CheckCircle,
  Loader2,
  Eye,
  X,
  AlertCircle,
  RefreshCw,
  Download,
} from "lucide-react";

// Card Components
const Card = ({ children, className = "" }) => (
  <div
    className={`bg-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-xl ${className}`}
  >
    {children}
  </div>
);

const CardHeader = ({ children, className = "" }) => (
  <div className={`p-4 sm:p-6 ${className}`}>{children}</div>
);

const CardContent = ({ children, className = "" }) => (
  <div className={`p-4 sm:p-6 pt-0 ${className}`}>{children}</div>
);

const CardTitle = ({ children, className = "" }) => (
  <h3 className={`text-lg sm:text-xl font-semibold ${className}`}>
    {children}
  </h3>
);

// Button Component
const Button = ({
  children,
  onClick,
  disabled = false,
  className = "",
  variant = "default",
}) => {
  const baseClasses =
    "px-4 py-2 sm:py-3 rounded-xl font-medium transition-all duration-300 flex items-center justify-center text-sm sm:text-base";
  const variants = {
    default:
      "bg-gradient-to-r from-[#10B981] to-[#376A59] hover:from-[#0F9C6E] hover:to-[#2F5B4A] text-white shadow-lg",
    outline:
      "bg-transparent border border-gray-600/50 text-gray-400 hover:bg-gray-800/50 hover:border-[#10B981]/50",
    secondary:
      "bg-gray-800/50 hover:bg-gray-700/50 text-white border border-gray-600/50",
    subscribed:
      "bg-gradient-to-r from-[#10B981] to-[#376A59] text-white cursor-default shadow-lg",
    disabled:
      "bg-gray-700/50 text-gray-500 cursor-not-allowed border border-gray-600/30",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variants[variant]} ${
        disabled ? "opacity-75" : "hover:scale-105 transform"
      } ${className}`}
    >
      {children}
    </button>
  );
};

// Badge Component
const Badge = ({ children, className = "", variant = "default" }) => {
  const variants = {
    default: "bg-gradient-to-r from-[#10B981] to-[#376A59] text-white",
    current:
      "bg-gradient-to-r from-[#10B981] to-[#376A59] text-white animate-pulse",
    best: "bg-gradient-to-r from-[#10B981] to-[#376A59] text-white shadow-lg",
  };

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs sm:text-sm font-semibold ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
};

// Loading Component
const LoadingSpinner = ({ message = "Loading subscription data..." }) => (
  <div className="flex items-center justify-center py-12">
    <div className="relative">
      <div
        className="animate-spin rounded-full h-16 w-16 border-b-2 mx-auto mb-4"
        style={{ borderColor: "#10B981" }}
      ></div>
      <div
        className="absolute inset-0 rounded-full blur-xl"
        style={{
          background: "linear-gradient(180deg, #10B981 0%, #376A59 100%)",
          opacity: 0.2,
        }}
      ></div>
    </div>
    <p className="text-gray-400 ml-4">{message}</p>
  </div>
);

// Current Subscription Card
const CurrentSubscriptionCard = ({
  subscription,
  formatCurrency,
  formatDate,
}) => (
  <Card className="mb-8 border-[#10B981]/30 bg-gradient-to-br from-[#10B981]/10 to-[#376A59]/10">
    <CardHeader>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Crown className="h-6 w-6 text-[#10B981]" />
          <div>
            <CardTitle className="text-[#10B981] mb-1">
              Current Subscription
            </CardTitle>
            <p className="text-gray-300 text-sm">
              {subscription.planType.charAt(0).toUpperCase() +
                subscription.planType.slice(1)}{" "}
              Plan
              {subscription.isLifetime
                ? " (Lifetime)"
                : ` (${subscription.duration})`}
            </p>
          </div>
        </div>
        <Badge variant="current">
          <CheckCircle className="h-3 w-3 mr-1" />
          {subscription.status === "active" ? "Active" : subscription.status}
        </Badge>
      </div>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <div>
          <p className="text-gray-400 text-xs sm:text-sm mb-1">Price Paid</p>
          <p className="text-white font-semibold text-sm sm:text-base">
            {formatCurrency(subscription.billing.price)}
          </p>
        </div>
        <div>
          <p className="text-gray-400 text-xs sm:text-sm mb-1">
            Remaining Days
          </p>
          <p className="text-[#10B981] font-semibold text-sm sm:text-base">
            {subscription.remainingDays} days
          </p>
        </div>
        <div>
          <p className="text-gray-400 text-xs sm:text-sm mb-1">
            {subscription.isLifetime ? "Access" : "Expires"}
          </p>
          <p className="text-white font-semibold text-sm sm:text-base">
            {subscription.isLifetime
              ? "Lifetime"
              : formatDate(subscription.endDate)}
          </p>
        </div>
      </div>
    </CardContent>
  </Card>
);

const PaymentHistoryCard = ({ paymentHistory, formatCurrency, formatDate }) => {
  const [downloadingPayment, setDownloadingPayment] = useState(null);

  const handleDownloadPaymentInvoice = async (payment) => {
    try {
      setDownloadingPayment(payment.id);

      const response = await fetch(
        `/api/subscription/invoice?format=pdf&paymentId=${payment.id}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to download invoice");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `invoice-${payment.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      if (window.toast) {
        window.toast.success("Invoice downloaded successfully!");
      }
    } catch (error) {
      console.error("Error downloading invoice:", error);
      if (window.toast) {
        window.toast.error(error.message || "Failed to download invoice");
      } else {
        alert(error.message || "Failed to download invoice");
      }
    } finally {
      setDownloadingPayment(null);
    }
  };

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Payment History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {paymentHistory.map((payment) => (
            <div
              key={payment.id}
              className="flex justify-between items-center p-3 bg-gray-800/30 rounded-lg"
            >
              <div className="flex-1">
                <p className="text-white font-medium text-sm">
                  {payment.description}
                </p>
                <p className="text-gray-400 text-xs">
                  {formatDate(payment.createdAt)}
                </p>
                {payment.razorpayPaymentId && (
                  <p className="text-gray-500 text-xs">
                    ID: {payment.razorpayPaymentId}
                  </p>
                )}
              </div>
              <div className="text-right flex items-center gap-3">
                <div>
                  <p className="text-[#10B981] font-semibold">
                    {formatCurrency(payment.amount)}
                  </p>
                  <p
                    className={`text-xs capitalize ${
                      payment.status === "completed"
                        ? "text-green-500"
                        : payment.status === "pending"
                        ? "text-yellow-500"
                        : "text-red-500"
                    }`}
                  >
                    {payment.status}
                  </p>
                </div>
                {payment.status === "completed" && (
                  <Button
                    onClick={() => handleDownloadPaymentInvoice(payment)}
                    disabled={downloadingPayment === payment.id}
                    variant="outline"
                    size="sm"
                    className="border-[#10B981]/50 text-[#10B981] hover:bg-[#10B981]/10"
                  >
                    {downloadingPayment === payment.id ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        Downloading...
                      </>
                    ) : (
                      <>
                        <Download className="h-3 w-3 mr-1" />
                        Invoice
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// Platform Comparison Table Component
const PlatformComparisonTable = () => {
  const platforms = [
    {
      name: "UnJob.ai",
      canJoinFree: true,
      monthlySubscription: "₹199 (Early Access)",
      commission: "0% (Temporarily Free)", // Was 5%
      hiddenFees: "None",
      canCreateContent: "Portfolio + Post + Reel",
      highlight: true,
    },
    {
      name: "Upwork",
      canJoinFree: true,
      monthlySubscription: false,
      commission: "10%-20%",
      hiddenFees: "Withdrawal",
      canCreateContent: "Portfolio",
    },
    {
      name: "Fiverr",
      canJoinFree: true,
      monthlySubscription: false,
      commission: "20%",
      hiddenFees: "Platform fee",
      canCreateContent: "Portfolio",
    },
    {
      name: "Freelancer",
      canJoinFree: true,
      monthlySubscription: "₹430",
      commission: "10% +",
      hiddenFees: "Contests, Disputes",
      canCreateContent: "Portfolio",
    },
    {
      name: "Unstop",
      canJoinFree: true,
      monthlySubscription: "₹999",
      commission: "-",
      hiddenFees: "-",
      canCreateContent: "Events/Posts",
    },
  ];

  return (
    <div className="mt-12 mb-8">
      <div className="text-center mb-8">
        <h3 className="text-xl sm:text-2xl font-bold mb-2 bg-gradient-to-r from-[#10B981] to-[#376A59] bg-clip-text text-transparent">
          Platform Comparison
        </h3>
        <p className="text-gray-400 text-sm">
          See how UnJob.ai compares to other freelancing platforms
        </p>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b border-gray-700/50">
                <th className="text-left p-4 text-gray-300 font-semibold bg-gray-800/30">
                  Features
                </th>
                {platforms.map((platform) => (
                  <th
                    key={platform.name}
                    className={`text-center p-4 font-semibold ${
                      platform.highlight
                        ? "bg-gradient-to-b from-[#10B981]/20 to-[#376A59]/20 text-[#10B981]"
                        : "bg-gray-800/30 text-gray-300"
                    }`}
                  >
                    {platform.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-700/30">
                <td className="p-4 text-gray-300 font-medium bg-gray-900/30">
                  Can join for free
                </td>
                {platforms.map((platform) => (
                  <td
                    key={`${platform.name}-free`}
                    className={`text-center p-4 ${
                      platform.highlight
                        ? "bg-gradient-to-b from-[#10B981]/5 to-[#376A59]/5"
                        : ""
                    }`}
                  >
                    {platform.canJoinFree ? (
                      <CheckCircle className="h-5 w-5 text-green-500 mx-auto" />
                    ) : (
                      <X className="h-5 w-5 text-red-500 mx-auto" />
                    )}
                  </td>
                ))}
              </tr>

              <tr className="border-b border-gray-700/30">
                <td className="p-4 text-gray-300 font-medium bg-gray-900/30">
                  Monthly Subscription Available
                </td>
                {platforms.map((platform) => (
                  <td
                    key={`${platform.name}-subscription`}
                    className={`text-center p-4 text-sm ${
                      platform.highlight
                        ? "bg-gradient-to-b from-[#10B981]/5 to-[#376A59]/5"
                        : ""
                    }`}
                  >
                    {platform.monthlySubscription === false ? (
                      <X className="h-5 w-5 text-red-500 mx-auto" />
                    ) : (
                      <span
                        className={
                          platform.highlight
                            ? "text-[#10B981] font-semibold"
                            : "text-gray-300"
                        }
                      >
                        {platform.monthlySubscription}
                      </span>
                    )}
                  </td>
                ))}
              </tr>

              <tr className="border-b border-gray-700/30">
                <td className="p-4 text-gray-300 font-medium bg-gray-900/30">
                  Commission on Earning
                </td>
                {platforms.map((platform) => (
                  <td
                    key={`${platform.name}-commission`}
                    className={`text-center p-4 text-sm ${
                      platform.highlight
                        ? "bg-gradient-to-b from-[#10B981]/5 to-[#376A59]/5 text-[#10B981] font-semibold"
                        : "text-gray-300"
                    }`}
                  >
                    {platform.commission}
                  </td>
                ))}
              </tr>

              <tr className="border-b border-gray-700/30">
                <td className="p-4 text-gray-300 font-medium bg-gray-900/30">
                  Other Hidden Fees
                </td>
                {platforms.map((platform) => (
                  <td
                    key={`${platform.name}-fees`}
                    className={`text-center p-4 text-sm ${
                      platform.highlight
                        ? "bg-gradient-to-b from-[#10B981]/5 to-[#376A59]/5 text-[#10B981] font-semibold"
                        : "text-gray-300"
                    }`}
                  >
                    {platform.hiddenFees}
                  </td>
                ))}
              </tr>

              <tr>
                <td className="p-4 text-gray-300 font-medium bg-gray-900/30">
                  Can Create Content (Portfolio/Post)
                </td>
                {platforms.map((platform) => (
                  <td
                    key={`${platform.name}-content`}
                    className={`text-center p-4 text-sm ${
                      platform.highlight
                        ? "bg-gradient-to-b from-[#10B981]/5 to-[#376A59]/5 text-[#10B981] font-semibold"
                        : "text-gray-300"
                    }`}
                  >
                    {platform.canCreateContent}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

// Main SubscriptionTab Component
const SubscriptionTab = ({
  subscribing,
  handleSubscribe,
  showHistory,
  enableAutoPay = false,
  setEnableAutoPay,
  setShowHistory,
  formatCurrency = (amount) => `₹${amount.toLocaleString()}`,
  formatDate = (date) => new Date(date).toLocaleDateString("en-IN"),
}) => {
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [availablePlans, setAvailablePlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [plansLoading, setPlansLoading] = useState(true);
  const [error, setError] = useState(null);
  const [plansError, setPlansError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch subscription data from API
  const fetchSubscriptionData = async () => {
    try {
      setError(null);
      const response = await fetch("/api/subscription/manage", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Subscription data received:", data);
        setSubscriptionData(data);
      } else {
        const errorData = await response.json();
        throw new Error(
          errorData.message ||
            `HTTP ${response.status}: Failed to fetch subscription data`
        );
      }
    } catch (err) {
      console.error("Error fetching subscription data:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch available plans from API
  const fetchAvailablePlans = async () => {
    try {
      setPlansError(null);
      const response = await fetch("/api/subscription/plans?role=freelancer", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Plans data received:", data);
        // Handle different API response structures
        if (data.plans) {
          setAvailablePlans(data.plans);
        } else if (Array.isArray(data)) {
          setAvailablePlans(data);
        } else {
          setAvailablePlans([]);
        }
      } else {
        const errorData = await response.json();
        throw new Error(
          errorData.message || `HTTP ${response.status}: Failed to fetch plans`
        );
      }
    } catch (err) {
      console.error("Error fetching plans:", err);
      setPlansError(err.message);
    } finally {
      setPlansLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    const fetchData = async () => {
      await Promise.all([fetchSubscriptionData(), fetchAvailablePlans()]);
      setRefreshing(false);
    };

    fetchData();
  }, []);

  // Refresh handler
  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchSubscriptionData(), fetchAvailablePlans()]);
  };

  const isCurrentPlan = (plan) => {
    if (
      !subscriptionData?.hasActiveSubscription ||
      !subscriptionData?.currentSubscription
    ) {
      return false;
    }

    const currentSub = subscriptionData.currentSubscription;

    if (
      currentSub.planType?.toLowerCase() === plan.planType?.toLowerCase() &&
      currentSub.duration?.toLowerCase() === plan.duration?.toLowerCase()
    ) {
      return true;
    }

    if (currentSub.billing?.price === plan.price) {
      return true;
    }

    if (plan.id && currentSub.planId === plan.id) {
      return true;
    }

    return false;
  };

  // Create subscription handler with automatic autopay logic
  const handleCreateSubscription = async (plan) => {
    try {
      if (handleSubscribe) {
        // Override autopay setting based on plan
        const shouldEnableAutoPay =
          plan.planType === "basic" &&
          plan.duration === "monthly" &&
          plan.price === 199;

        // Create a modified plan object with the correct autopay setting
        const planWithAutoPay = {
          ...plan,
          forceAutoPay: shouldEnableAutoPay,
        };

        await handleSubscribe(planWithAutoPay);
        await fetchSubscriptionData();
      }
    } catch (error) {
      console.error("Error creating subscription:", error);
    }
  };

  // Check if plan supports autopay
  const supportsAutoPay = (plan) => {
    return (
      plan.planType === "basic" &&
      plan.duration === "monthly" &&
      plan.price === 199
    );
  };

  // Check if autopay should be forced for this plan
  const shouldForceAutoPay = (plan) => {
    return supportsAutoPay(plan);
  };

  // Check if user has any active subscription
  const hasActiveSubscription = subscriptionData?.hasActiveSubscription;
  const currentSubscription = subscriptionData?.currentSubscription;
  const paymentHistory = subscriptionData?.paymentHistory || [];

  // Handle loading states
  if (loading || plansLoading) {
    return (
      <div className="min-h-screen bg-black text-white">
        <LoadingSpinner
          message={
            loading && plansLoading
              ? "Loading subscription data and plans..."
              : loading
              ? "Loading subscription data..."
              : "Loading available plans..."
          }
        />
      </div>
    );
  }

  // Handle error states
  if (error || plansError) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center border-red-500/30 bg-red-900/10">
          <CardHeader>
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <CardTitle className="text-red-400">Error Loading Data</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {error && (
                <p className="text-gray-400 text-sm">Subscription: {error}</p>
              )}
              {plansError && (
                <p className="text-gray-400 text-sm">Plans: {plansError}</p>
              )}
            </div>
            <div className="space-y-2 mt-4">
              <Button
                onClick={handleRefresh}
                variant="outline"
                className="w-full"
                disabled={refreshing}
              >
                {refreshing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Retrying...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry
                  </>
                )}
              </Button>
              <Button
                onClick={() => window.location.reload()}
                variant="secondary"
                className="w-full"
              >
                Reload Page
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Title */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="flex items-center justify-center gap-4 mb-4">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-[#10B981] to-[#376A59] bg-clip-text text-transparent">
              SUBSCRIPTION PLANS
            </h2>
            <Button
              onClick={handleRefresh}
              variant="outline"
              disabled={refreshing}
              className="p-2"
              title="Refresh data"
            >
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-gray-400 text-sm sm:text-base">
            Choose the perfect plan to unlock premium features
          </p>
        </div>

        {/* Current Subscription Card */}
        {hasActiveSubscription && currentSubscription && (
          <CurrentSubscriptionCard
            subscription={currentSubscription}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
          />
        )}

        {/* Payment History */}
        {showHistory && paymentHistory.length > 0 && (
          <PaymentHistoryCard
            paymentHistory={paymentHistory}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
          />
        )}

        {/* Toggle Payment History Button */}
        {paymentHistory.length > 0 && (
          <div className="text-center mb-8">
            <Button
              onClick={() => setShowHistory && setShowHistory(!showHistory)}
              variant="outline"
              className="mb-8"
            >
              <Eye className="h-4 w-4 mr-2" />
              {showHistory ? "Hide" : "Show"} Payment History
            </Button>
          </div>
        )}
        {/* Subscription Plans Grid */}
        {availablePlans.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-16">
            {availablePlans.map((plan) => {
              const planKey = `${plan.id || plan.planType}-${plan.duration}`;
              const isSubscribing = subscribing === planKey;
              const isPlanActive = isCurrentPlan(plan);

              // Disable button if user has active subscription but this isn't their current plan
              const shouldDisable = isPlanActive;

              // Check if this is the ₹199 monthly plan that gets autopay
              const isAutoPayPlan =
                plan.planType === "basic" &&
                plan.duration === "monthly" &&
                plan.price === 199;

              // Check if this is a one-time payment plan
              const isOneTimePlan =
                plan.duration === "yearly" || plan.duration === "lifetime";

              return (
                <Card
                  key={planKey}
                  className={`relative transition-all duration-300 hover:shadow-2xl transform hover:scale-105 ${
                    plan.bestDeal && !isPlanActive
                      ? "border-[#10B981]/50 shadow-[#10B981]/20 bg-gradient-to-br from-[#10B981]/5 to-[#376A59]/5"
                      : isPlanActive
                      ? "border-[#10B981]/70 shadow-[#10B981]/30 bg-gradient-to-br from-[#10B981]/10 to-[#376A59]/10"
                      : "border-gray-700/50 hover:border-[#10B981]/30"
                  } ${shouldDisable ? "opacity-75" : ""}`}
                >
                  {/* Best Deal Badge */}
                  {plan.bestDeal && !isPlanActive && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                      <Badge variant="best">Best Deal</Badge>
                    </div>
                  )}

                  {/* Current Plan Badge */}
                  {isPlanActive && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                      <Badge variant="current">
                        <Crown className="h-3 w-3 mr-1" />
                        Current Plan
                      </Badge>
                    </div>
                  )}

                  {/* Additional Badge */}
                  {plan.badge &&
                    !plan.bestDeal &&
                    !isPlanActive &&
                    !isAutoPayPlan && (
                      <div className="absolute -top-3 right-4 z-10">
                        <Badge variant="default">{plan.badge}</Badge>
                      </div>
                    )}

                  <CardHeader className="text-center pb-4 sm:pb-6">
                    <CardTitle className="text-white mb-2 sm:mb-3">
                      {plan.name}
                    </CardTitle>

                    {/* Original Price (crossed out) */}
                    {plan.originalPrice && plan.originalPrice > plan.price && (
                      <div className="text-sm text-gray-400 line-through mb-1">
                        {formatCurrency(plan.originalPrice)}
                      </div>
                    )}

                    {/* Main Price */}
                    <div className="flex items-center justify-center mb-3">
                      <span className="text-2xl sm:text-3xl font-bold text-white">
                        {formatCurrency(plan.price)}
                      </span>
                      <span className="text-gray-400 ml-2 text-sm">
                        {plan.duration === "monthly"
                          ? "/month"
                          : plan.duration === "yearly" ||
                            plan.duration === "annual"
                          ? "/year"
                          : plan.duration === "lifetime"
                          ? "one-time"
                          : `/${plan.duration}`}
                      </span>
                    </div>

                    <p className="text-gray-400 text-xs sm:text-sm">
                      {plan.description}
                    </p>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Subscribe Button */}
                    <Button
                      onClick={() =>
                        !shouldDisable &&
                        !isPlanActive &&
                        handleCreateSubscription(plan)
                      }
                      disabled={isSubscribing || isPlanActive || shouldDisable}
                      variant={
                        isPlanActive
                          ? "subscribed"
                          : shouldDisable
                          ? "disabled"
                          : plan.bestDeal
                          ? "default"
                          : "secondary"
                      }
                      className="w-full py-3 sm:py-4 font-semibold mb-4"
                    >
                      {isSubscribing ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Processing...
                        </>
                      ) : isPlanActive ? (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Subscribed
                        </>
                      ) : shouldDisable ? (
                        <>
                          <Crown className="h-4 w-4 mr-2" />
                          Already Subscribed
                        </>
                      ) : (
                        <>
                          <Crown className="h-4 w-4 mr-2" />
                          Subscribe Now
                        </>
                      )}
                    </Button>

                    {/* Features List */}
                    {plan.features && plan.features.length > 0 && (
                      <ul className="space-y-2 sm:space-y-3">
                        {plan.features.map((feature, featureIndex) => (
                          <li
                            key={featureIndex}
                            className="flex items-start gap-3"
                          >
                            <CheckCircle
                              className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                                isPlanActive
                                  ? "text-[#10B981]"
                                  : "text-[#10B981]"
                              }`}
                            />
                            <span
                              className={`text-xs sm:text-sm ${
                                isPlanActive
                                  ? "text-[#10B981]/90"
                                  : "text-gray-300"
                              }`}
                            >
                              {feature}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {/* Plan limits/usage info if available */}
                    {plan.limits && (
                      <div className="mt-4 p-3 bg-gray-800/30 rounded-lg">
                        <h5 className="text-white text-sm font-semibold mb-2">
                          Plan Limits
                        </h5>
                        <div className="space-y-1">
                          {Object.entries(plan.limits).map(([key, value]) => (
                            <div
                              key={key}
                              className="flex justify-between text-xs"
                            >
                              <span className="text-gray-400 capitalize">
                                {key.replace(/([A-Z])/g, " $1")}
                              </span>
                              <span className="text-white">
                                {value === -1 ? "Unlimited" : value}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-300 mb-2">
              No Plans Available
            </h3>
            <p className="text-gray-500 mb-4">
              Unable to load subscription plans at this time.
            </p>
            <Button
              onClick={handleRefresh}
              variant="outline"
              disabled={refreshing}
            >
              {refreshing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Refreshing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </>
              )}
            </Button>
          </div>
        )}

        {/* Platform Comparison Table */}
        <PlatformComparisonTable />
      </div>
    </div>
  );
};

export default SubscriptionTab;
