"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  CheckCircle,
  X,
  CreditCard,
  Crown,
  AlertCircle,
  Loader2,
  Calendar,
  Shield,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "react-hot-toast";
import { Progress } from "@/components/ui/progress";

function HiringSubscriptionContent() {
  const [plans, setPlans] = useState([]);
  const [comparisonData, setComparisonData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(null);
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason");

  useEffect(() => {
    if (session?.user) {
      Promise.all([
        fetchPlans(),
        checkCurrentSubscription(),
        fetchPaymentHistory(),
      ]).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [session]);

  const fetchPlans = async () => {
    try {
      const response = await fetch("/api/subscription/plans?role=hiring");
      const data = await response.json();
      if (data.success) {
        setPlans(data.plans);
        setComparisonData(data.comparisonData.hiring);
      } else {
        throw new Error(data.error || "Failed to fetch plans");
      }
    } catch (error) {
      console.error("Error fetching plans:", error);
      toast.error("Failed to load subscription plans");
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

  const handleSubscribe = async (plan) => {
    if (!session) {
      toast.error("Please login to subscribe");
      router.push("/login");
      return;
    }

    const planKey = `${plan.id}-${plan.duration}`;
    setSubscribing(planKey);

    try {
      const orderResponse = await fetch("/api/subscription/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planType: plan.planType, // ✅ CHANGED: Use plan.planType instead of plan.id
          duration: plan.duration,
        }),
      });

      const orderData = await orderResponse.json();
      if (!orderResponse.ok || !orderData.success) {
        throw new Error(orderData.error || "Failed to create order");
      }

      const loadRazorpayScript = () =>
        new Promise((resolve) => {
          if (window.Razorpay) return resolve(true);
          const script = document.createElement("script");
          script.src = "https://checkout.razorpay.com/v1/checkout.js";
          script.onload = () => resolve(true);
          script.onerror = () => resolve(false);
          document.head.appendChild(script);
        });

      if (!(await loadRazorpayScript())) {
        throw new Error("Failed to load payment gateway.");
      }

      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Un-Job Hiring",
        description: `${plan.name} Plan (${plan.duration})`,
        order_id: orderData.orderId,
        handler: async (response) => {
          toast.loading("Verifying payment...", { id: "payment-verify" });
          const verifyResponse = await fetch(
            "/api/subscription/verify-payment",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...response,
                subscriptionId: orderData.subscriptionId,
              }),
            }
          );
          const verifyData = await verifyResponse.json();
          toast.dismiss("payment-verify");
          if (verifyData.success) {
            toast.success("🎉 Subscription activated successfully!");
            await checkCurrentSubscription();
            await fetchPaymentHistory();
            router.push("/dashboard/create-gig");
          } else {
            toast.error(verifyData.error || "Payment verification failed");
          }
          setSubscribing(null);
        },
        prefill: {
          name: session.user.name || "",
          email: session.user.email || "",
        },
        theme: { color: "#10b981" },
        modal: {
          ondismiss: () => {
            setSubscribing(null);
            toast("Payment cancelled.", { icon: "⚠️" });
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error("Subscription error:", error);
      toast.error(error.message || "Failed to process subscription");
      setSubscribing(null);
    }
  };

  const getReasonMessage = () => {
    switch (reason) {
      case "required":
        return {
          type: "info",
          title: "Subscription Required",
          message:
            "You need an active subscription to start posting gigs and connecting with freelancers.",
        };
      case "limit-reached":
        return {
          type: "warning",
          title: "Upgrade Your Subscription",
          message:
            "You have reached your monthly gig posting limit. Upgrade to post more gigs.",
        };
      case "expired":
        return {
          type: "warning",
          title: "Subscription Expired",
          message:
            "Your subscription has expired. Renew to continue posting gigs.",
        };
      default:
        return null;
    }
  };

  const formatDate = (dateString) =>
    new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  const formatCurrency = (amount) => `₹${amount.toLocaleString()}`;

  const reasonMessage = getReasonMessage();

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-green-500 mx-auto mb-4" />
          <p className="text-gray-400">Loading subscription plans...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center text-center">
        <div>
          <Shield className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
          <p className="text-gray-400 mb-6">
            Please login to view subscription plans.
          </p>
          <Button
            onClick={() => router.push("/login")}
            className="bg-green-500 hover:bg-green-600 text-black"
          >
            Login
          </Button>
        </div>
      </div>
    );
  }

  if (session?.user?.role !== "hiring") {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center text-center">
        <div>
          <Shield className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-4">Access Restricted</h1>
          <p className="text-gray-400 mb-6">
            These subscription plans are exclusively for hiring managers.
          </p>
          <Button
            onClick={() => router.push("/dashboard")}
            className="bg-green-500 hover:bg-green-600 text-black"
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Reason Message */}
        {reasonMessage && (
          <div
            className={`mb-8 p-4 rounded-lg border backdrop-blur-sm flex items-start gap-3 ${
              reasonMessage.type === "warning"
                ? "bg-yellow-900/20 border-yellow-500/30 text-yellow-400"
                : "bg-blue-900/20 border-blue-500/30 text-blue-400"
            }`}
          >
            <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold">{reasonMessage.title}</h3>
              <p className="text-sm mt-1 opacity-90">{reasonMessage.message}</p>
            </div>
          </div>
        )}

        {/* Current Subscription */}
        {currentSubscription && (
          <div className="mb-8 bg-green-900/10 backdrop-blur-sm border border-green-500/30 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-green-400 flex items-center gap-2">
                  <Crown className="h-5 w-5" />
                  Active Subscription
                </h3>
                <p className="text-green-300 text-lg capitalize">
                  {currentSubscription.planType} Plan
                </p>
              </div>
              <div className="text-right">
                <Badge className="bg-green-500 text-black mb-2">Active</Badge>
                <p className="text-sm text-green-300">
                  <Calendar className="h-4 w-4 inline mr-1" />
                  {currentSubscription.remainingDays > 0
                    ? `${currentSubscription.remainingDays} days remaining`
                    : "Lifetime access"}
                </p>
              </div>
            </div>
            {currentSubscription.usage && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">Gigs Posted</span>
                  <span className="text-white">
                    {currentSubscription.usage.used} /{" "}
                    {currentSubscription.usage.limit === -1
                      ? "∞"
                      : currentSubscription.usage.limit}
                  </span>
                </div>
                {currentSubscription.usage.limit !== -1 && (
                  <Progress
                    value={
                      (currentSubscription.usage.used /
                        currentSubscription.usage.limit) *
                      100
                    }
                    className="h-2"
                  />
                )}
                <p className="text-xs text-gray-400">
                  {currentSubscription.usage.limit === -1
                    ? "Unlimited gigs available"
                    : `${currentSubscription.usage.remaining} gigs remaining`}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex justify-center mb-8">
          <div className="flex bg-gray-800/50 backdrop-blur-sm rounded-full p-1 border border-gray-700/50">
            <button className="px-6 py-2 text-gray-400 rounded-full">
              Applications
            </button>
            <button className="px-6 py-2 text-gray-400 rounded-full">
              Projects
            </button>
            <button className="px-6 py-2 bg-green-500 text-black rounded-full font-medium">
              Pricing & Subscription
            </button>
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">SUBSCRIPTION PLANS</h1>
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto mb-16">
          {plans.map((plan) => {
            const isCurrentPlan =
              currentSubscription?.planType === plan.planType;

            const planKey = `${plan.id}-${plan.duration}`;
            const isSubscribing = subscribing === planKey;

            return (
              <Card
                key={plan.id}
                className={`relative bg-gray-900/50 backdrop-blur-sm border transition-all duration-300 hover:shadow-xl ${
                  plan.bestDeal
                    ? "border-green-500/50 shadow-green-500/20 bg-green-900/10"
                    : "border-gray-700/50 hover:border-gray-600/50"
                } ${isCurrentPlan ? "ring-2 ring-green-500/50" : ""}`}
              >
                {plan.bestDeal && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-green-500 text-black font-semibold px-4 py-1">
                      Best Deal
                    </Badge>
                  </div>
                )}

                {isCurrentPlan && (
                  <div className="absolute -top-3 right-4">
                    <Badge className="bg-green-500 text-black font-semibold">
                      Current Plan
                    </Badge>
                  </div>
                )}

                <CardHeader className="text-center pb-6">
                  <CardTitle className="text-xl font-bold text-white mb-2">
                    {plan.name}
                  </CardTitle>

                  {plan.originalPrice > plan.price && (
                    <div className="text-sm text-gray-400 line-through mb-1">
                      {formatCurrency(plan.originalPrice)}
                    </div>
                  )}

                  <div className="flex items-center justify-center mb-2">
                    <span className="text-3xl font-bold text-white">
                      {formatCurrency(plan.price)}
                    </span>
                    <span className="text-gray-400 ml-2">
                      {plan.duration === "monthly"
                        ? "/month"
                        : plan.duration === "yearly"
                        ? "/year"
                        : "one-time"}
                    </span>
                  </div>

                  <p className="text-gray-400 text-sm">{plan.description}</p>
                </CardHeader>

                <CardContent className="space-y-4">
                  <Button
                    onClick={() => handleSubscribe(plan)}
                    disabled={isSubscribing || isCurrentPlan}
                    className={`w-full py-3 font-semibold rounded-xl transition-all mb-4 ${
                      plan.bestDeal
                        ? "bg-green-500 hover:bg-green-600 text-black"
                        : isCurrentPlan
                        ? "bg-gray-600 text-gray-300 cursor-not-allowed"
                        : "bg-gray-800/50 hover:bg-gray-700/50 text-white border border-gray-600/50 backdrop-blur-sm"
                    }`}
                  >
                    {isSubscribing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Processing...
                      </>
                    ) : isCurrentPlan ? (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Current Plan
                      </>
                    ) : (
                      "Subscribe Now"
                    )}
                  </Button>

                  <ul className="space-y-3">
                    {plan.features?.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start gap-3">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-300 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Comparison Table */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-center mb-8">Features</h2>

          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full bg-gray-900/50 backdrop-blur-sm rounded-lg border border-gray-700/50">
              <thead>
                <tr className="border-b border-gray-700/50">
                  <th className="text-left p-4 font-semibold text-gray-300">
                    Features
                  </th>
                  <th className="text-center p-4 font-semibold text-green-400">
                    UnJob.ai
                  </th>
                  <th className="text-center p-4 font-semibold text-gray-300">
                    Upwork
                  </th>
                  <th className="text-center p-4 font-semibold text-gray-300">
                    Fiver
                  </th>
                  <th className="text-center p-4 font-semibold text-gray-300">
                    Freelancer
                  </th>
                  <th className="text-center p-4 font-semibold text-gray-300">
                    Unstop
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonData.map((row, index) => (
                  <tr
                    key={index}
                    className="border-b border-gray-800/50 hover:bg-gray-800/30"
                  >
                    <td className="p-4 font-medium text-white">
                      {row.feature}
                    </td>
                    <td className="p-4 text-center text-green-400 font-semibold">
                      {row.unJob}
                    </td>
                    <td className="p-4 text-center text-gray-300">
                      {row.upwork}
                    </td>
                    <td className="p-4 text-center text-gray-300">
                      {row.fiverr}
                    </td>
                    <td className="p-4 text-center text-gray-300">
                      {row.freelancer}
                    </td>
                    <td className="p-4 text-center text-gray-300">
                      {row.unstop}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden space-y-4">
            {comparisonData.map((row, index) => (
              <div
                key={index}
                className="bg-gray-900/50 backdrop-blur-sm rounded-lg border border-gray-700/50 p-4"
              >
                <h3 className="font-semibold text-white mb-3">{row.feature}</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-green-400 font-semibold">
                      UnJob.ai
                    </span>
                    <span className="text-green-400">{row.unJob}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Upwork</span>
                    <span className="text-gray-300">{row.upwork}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Fiver</span>
                    <span className="text-gray-300">{row.fiverr}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Freelancer</span>
                    <span className="text-gray-300">{row.freelancer}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Unstop</span>
                    <span className="text-gray-300">{row.unstop}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Payment History */}
        {paymentHistory.length > 0 && (
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Payment History</h2>
              <Button
                onClick={() => setShowHistory(!showHistory)}
                variant="outline"
                className="text-gray-400 border-gray-600/50 hover:bg-gray-800/50 backdrop-blur-sm"
              >
                <Eye className="h-4 w-4 mr-2" />
                {showHistory ? "Hide History" : "Show History"}
              </Button>
            </div>

            {showHistory && (
              <Card className="bg-gray-900/50 backdrop-blur-sm border-gray-700/50">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {paymentHistory.map((payment) => (
                      <div
                        key={payment.id}
                        className="flex items-center justify-between p-4 bg-gray-800/30 backdrop-blur-sm rounded-lg border border-gray-700/30"
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-2 rounded-full bg-green-500/20 text-green-400">
                            <CheckCircle className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-white font-medium capitalize">
                              {payment.planType} Plan ({payment.duration})
                            </p>
                            <p className="text-gray-400 text-sm">
                              {formatDate(payment.createdAt)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-semibold">
                            {formatCurrency(payment.amount)}
                          </p>
                          <Badge className="bg-green-500 text-black">
                            {payment.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function HiringSubscriptionPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-green-500 mx-auto mb-4" />
            <p className="text-gray-400">Loading subscription plans...</p>
          </div>
        </div>
      }
    >
      <HiringSubscriptionContent />
    </Suspense>
  );
}
