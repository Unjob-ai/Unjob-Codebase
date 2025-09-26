import React, { useState, useMemo } from "react";
import {
  DollarSign,
  Search,
  Calendar,
  Building,
  Loader2,
  Eye,
  Wallet,
  Send,
  Shield,
  CreditCard,
  TrendingUp,
  ArrowUpRight,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  Landmark,
  Briefcase,
  X,
  Download,
  Zap,
  Award,
  FileText,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

// Helper & UI Components (Some are now responsive)

const Card = ({ children, className = "" }) => (
  <div
    className={`bg-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-lg ${className}`}
  >
    {children}
  </div>
);

const CardHeader = ({ children, className = "" }) => (
  <div className={`p-6 pb-4 ${className}`}>{children}</div>
);

const CardContent = ({ children, className = "" }) => (
  <div className={`p-6 pt-0 ${className}`}>{children}</div>
);

const CardTitle = ({ children, className = "" }) => (
  <h3 className={`text-lg font-semibold text-white ${className}`}>
    {children}
  </h3>
);

const Button = ({
  children,
  onClick,
  disabled = false,
  className = "",
  variant = "default",
  size = "default",
}) => {
  const baseClasses =
    "font-medium transition-all duration-200 flex items-center justify-center rounded-lg";
  const sizes = {
    default: "px-4 py-2",
    sm: "px-3 py-1.5 text-sm",
    lg: "px-6 py-3 text-lg",
  };
  const variants = {
    default: "bg-green-500 hover:bg-green-600 text-black",
    outline:
      "bg-transparent border border-gray-600 text-gray-300 hover:bg-gray-800",
    secondary: "bg-gray-800 hover:bg-gray-700 text-white",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${sizes[size]} ${variants[variant]} ${
        disabled ? "opacity-50 cursor-not-allowed" : ""
      } ${className}`}
    >
      {children}
    </button>
  );
};

const Badge = ({ children, className = "" }) => (
  <span
    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${className}`}
  >
    {children}
  </span>
);

const Input = ({ className = "", ...props }) => (
  <input
    className={`w-full px-3 py-2 bg-white border border-gray-600 rounded-lg text-blck placeholder-gray-400 focus:outline-none focus:border-green-500 transition-colors ${className}`}
    {...props}
  />
);

const Select = ({ children, value, onValueChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-left focus:outline-none focus:border-green-500 transition-colors flex items-center justify-between"
      >
        <span>{value || "Select option"}</span>
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-lg z-10">
          {children}
        </div>
      )}
    </div>
  );
};

const SelectItem = ({ value, children, onSelect }) => (
  <button
    onClick={() => {
      onSelect(value);
    }}
    className="w-full px-3 py-2 text-left text-white hover:bg-gray-700 transition-colors"
  >
    {children}
  </button>
);

const Table = ({ children }) => <div className="w-full">{children}</div>;
const TableHeader = ({ children }) => (
  <div className="hidden lg:table-header-group">{children}</div>
);
const TableBody = ({ children }) => (
  <div className="flex flex-col gap-4 lg:table-row-group">{children}</div>
);
const TableRow = ({ children }) => (
  <div className="block lg:table-row bg-gray-900/50 border border-gray-700/50 rounded-lg lg:border-b lg:border-x-0 lg:border-t-0 lg:rounded-none lg:bg-transparent lg:hover:bg-gray-800/50">
    {children}
  </div>
);
const TableHead = ({ children }) => (
  <div className="p-4 text-left text-gray-300 font-medium lg:table-cell">
    {children}
  </div>
);

const StatCard = ({ icon, title, value, subtitle }) => (
  <div className="bg-[#1A2D25]/30 backdrop-blur-sm border border-green-500/20 rounded-lg p-4 flex items-center gap-4">
    <div className="p-3 rounded-full bg-[#1F3C30]">
      {React.cloneElement(icon, { className: "h-6 w-6 text-green-400" })}
    </div>
    <div className="flex-1">
      <p className="text-sm text-gray-400">{title}</p>
      <p className="text-2xl font-bold text-green-400">{value}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
  </div>
);

const WithdrawModal = ({
  isOpen,
  onClose,
  availableBalance,
  onConfirmWithdraw,
  loading = false,
}) => {
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");

  const handleAmountChange = (e) => {
    const value = e.target.value;
    if (/^\d*\.?\d{0,2}$/.test(value)) {
      setAmount(value);
      const numValue = parseFloat(value);
      if (numValue > availableBalance *100) {
        setError("Amount exceeds available balance.");
      } else if (numValue > 0 && numValue < 100) {
        setError("Minimum withdrawal amount is ₹100.");
      } else {
        setError("");
      }
    }
  };

  const handleConfirm = () => {
    const numericAmount = parseFloat(amount);
    if (!error && numericAmount >= 100) {
      onConfirmWithdraw(numericAmount * 100);
      setAmount("");
    }
  };

  const isConfirmDisabled =
    error || !amount || parseFloat(amount) < 100 || loading;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white text-black max-w-md w-[95vw] mx-auto rounded-2xl border-0 p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-3 border-b border-gray-200">
          <DialogTitle className="text-xl font-bold flex items-center gap-2 text-black">
            <Wallet className="h-5 w-5 text-green-500" />
            WITHDRAW FUNDS
          </DialogTitle>
        </DialogHeader>

        <div className="p-4 space-y-5">
          {/* Available Balance Section */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 text-center">
            <Label className="text-xs font-medium text-black mb-2 block">
              Available Balances
            </Label>
            <p className="text-3xl font-bold text-green-600">
              ₹{availableBalance.toLocaleString() * 100}
            </p>
          </div>

          {/* Amount Input Section */}
          <div>
            <Label className="text-xs font-medium text-black mb-2 block">
              Enter Amount to Withdraw (Min: ₹100) *
            </Label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                ₹
              </span>
              <Input
                id="amount"
                type="text"
                placeholder="0.00"
                value={amount}
                onChange={handleAmountChange}
                className="pl-7 bg-gray-100 border-gray-300 text-black h-10 rounded-lg focus:border-green-500 focus:ring-green-500 text-lg font-semibold"
                disabled={loading}
              />
            </div>
            {error && (
              <p className="text-red-400 text-xs mt-2 flex items-center gap-1">
                <X className="h-3 w-3" />
                {error}
              </p>
            )}
          </div>

          {/* Processing Info Section */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h3 className="text-sm font-semibold mb-3 text-black flex items-center gap-2">
              <Clock className="h-4 w-4 text-green-500" />
              Processing Information
            </h3>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white rounded-full border border-gray-200">
                <DollarSign className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="font-semibold text-black text-sm">
                  3-5 Business Days
                </p>
                <p className="text-xs text-gray-700">
                  Funds will be transferred to your bank account
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 pt-2">
            <Button
              onClick={handleConfirm}
              disabled={isConfirmDisabled}
              className="w-full bg-green-500 hover:bg-green-600 text-white rounded-full h-10 text-sm font-medium"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirm & Withdraw ₹{parseFloat(amount || 0).toLocaleString()}
                </>
              )}
            </Button>
            <Button
              onClick={onClose}
              variant="outline"
              disabled={loading}
              className="w-full border-green-500 text-green-500 hover:bg-green-50 rounded-full h-10 text-sm font-medium bg-transparent"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const EarningsTab = ({
  searchTerm = "",
  setSearchTerm,
  statusFilter = "all",
  setStatusFilter,
  paymentRequests = [],
  setSelectedPayment,
  formatDate = (date) => new Date(date).toLocaleDateString(),
  activeTab = "All Payments",
  setActiveTab,
  tabs = ["All Payments", "Withdrawals"],
  earningsData = null,
  onWithdraw = null,
  loading = false,
  // ✅ MODIFICATION: Accept the calculated amount as a prop
  projectsInProgressAmount = 0,
  onShowChangeBankDetails = null,
  bankDetailsExist = false,
}) => {
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawLoading, setWithdrawLoading] = useState(false);

  const calculatedStats = useMemo(() => {
    if (earningsData) {
      const safeGet = (val) => val || 0;

      const totalWithdrawn =
        earningsData?.earnings?.payments
          ?.filter((p) => p.type === "withdrawal")
          .reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

      const pendingWithdrawals =
        earningsData?.earnings?.payments
          ?.filter((p) => p.type === "withdrawal" && p.status === "pending")
          .reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

      return {
        totalEarning: safeGet(earningsData.summary?.totalEarned),
        // ✅ MODIFICATION: Use the prop for projects in progress
        projectsInProgress: projectsInProgressAmount,
        myWallet: safeGet(earningsData.summary?.availableForWithdrawal),
        totalCommissionPaid: safeGet(earningsData.summary?.totalCommissionPaid),
        totalWithdrawn: totalWithdrawn,
        pendingWithdrawals: pendingWithdrawals,
      };
    }
    return {
      totalEarning: 0,
      // ✅ MODIFICATION: Also use the prop in the fallback return
      projectsInProgress: projectsInProgressAmount,
      myWallet: 0,
      totalCommissionPaid: 0,
      totalWithdrawn: 0,
      pendingWithdrawals: 0,
    };
    // ✅ MODIFICATION: Add the prop to the dependency array
  }, [earningsData, projectsInProgressAmount]);

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
      case "Payment Initiated":
        return "bg-green-500/20 text-green-400 border-green-500/50";
      case "processing":
      case "In Process":
        return "bg-yellow-500/20 text-yellow-400 border-green-500/50";
      case "pending":
        return "bg-blue-500/20 text-blue-400 border-blue-500/50";
      case "failed":
      case "Dispute Raised":
        return "bg-red-500/20 text-red-400 border-red-500/50";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/50";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "completed":
      case "Payment Initiated":
        return <CheckCircle className="h-3 w-3" />;
      case "processing":
      case "In Process":
        return <Clock className="h-3 w-3" />;
      case "pending":
        return <AlertTriangle className="h-3 w-3" />;
      case "failed":
      case "Dispute Raised":
        return <XCircle className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  const handleConfirmWithdraw = async (amountInPaise) => {
    setWithdrawLoading(true);
    try {
      if (onWithdraw) {
        await onWithdraw(amountInPaise);
      }
      setIsWithdrawModalOpen(false);
    } catch (error) {
      console.error("Withdrawal error:", error);
    } finally {
      setWithdrawLoading(false);
    }
  };

  const displayPayments = useMemo(() => {
    const allPayments = earningsData?.earnings?.payments || [];
    const pendingProjects = earningsData?.earnings?.pendingProjects || [];

    const transformedPendingProjects = pendingProjects.map((project) => ({
      _id: `pending-${project._id}`,
      createdAt: project.approvedAt,
      gig: { title: project.gigTitle },
      description: project.projectTitle,
      amount: project.amount,
      status: "pending",
      type: "Project Approval",
      platformCommission: 0,
    }));

    let combinedData = [];

    switch (activeTab) {
      case "Withdrawals":
        combinedData = allPayments.filter((p) => p.type === "withdrawal");
        break;
      default:
        const otherPayments = allPayments.filter(
          (p) => p.type !== "withdrawal"
        );
        combinedData = [...transformedPendingProjects, ...otherPayments].sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );
        break;
    }

    // Apply search and status filters after combining
    return combinedData.filter((payment) => {
      const searchTermLower = searchTerm.toLowerCase();
      const matchesSearch =
        payment.gig?.title?.toLowerCase().includes(searchTermLower) ||
        payment.description?.toLowerCase().includes(searchTermLower);

      const matchesStatus =
        statusFilter === "all" || payment.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [earningsData, activeTab, searchTerm, statusFilter]);

  const statCardsData = [
    {
      title: "Total Earnings",
      value: `₹${calculatedStats.totalEarning.toLocaleString("en-IN")}`,
      icon: <TrendingUp />,
    },
    {
      title: "Wallet",
      value: `₹${calculatedStats.myWallet.toLocaleString("en-IN")}`,
      subtitle: "Ready for withdrawal",
      icon: <Wallet />,
    },
    {
      title: "Projects In Progress",
      value: `₹${(calculatedStats.projectsInProgress * 1).toLocaleString( // No commission deduction (was 0.95)
        "en-IN"
      )}`,
      subtitle: "From approved projects",
      icon: <Briefcase />,
    },
    {
      title: "Total Withdrawn",
      value: `₹${(calculatedStats.totalWithdrawn ).toLocaleString(
        "en-IN"
      )}`,
      subtitle:
        calculatedStats.pendingWithdrawals > 0
          ? `Pending: ₹${(
              calculatedStats.pendingWithdrawals / 100
            ).toLocaleString("en-IN")}`
          : "All withdrawal requests",
      icon: <Download />,
    },
  ];

      console.log(displayPayments);


  return (
    <div className="min-h-screen bg-black text-white p-4 sm:p-6">
      {/* This style block is the key to the responsive table. It's scoped to this component. */}
      <style jsx>{`
        @media (max-width: 1023px) {
          .responsive-cell::before {
            content: attr(data-label);
            font-weight: 600;
            color: #9ca3af; /* text-gray-400 */
            margin-right: 0.5rem;
            min-width: 80px; /* Ensures alignment */
            display: inline-block;
            text-align: left;
          }
          .responsive-cell > * {
            text-align: right;
            flex-grow: 1;
          }
        }
      `}</style>

      <div className="mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
          <h1 className="text-2xl font-medium">My Payment</h1>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            {bankDetailsExist && (
              <Button
                onClick={() => onShowChangeBankDetails && onShowChangeBankDetails()}
                className="bg-blue-500 hover:bg-blue-600 text-white font-semibold w-full sm:w-auto"
                size="lg"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Change Bank Details
              </Button>
            )}
            <Button
              onClick={() => setIsWithdrawModalOpen(true)}
              className="bg-green-500 hover:bg-green-600 text-black font-semibold w-full sm:w-auto"
              size="lg"
            >
              <Download className="h-4 w-4 mr-2" />
              Withdraw Funds
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCardsData.map((card, index) => (
            <StatCard
              key={index}
              icon={card.icon}
              title={card.title}
              value={card.value}
              subtitle={card.subtitle}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
        <div className="flex bg-gray-900/50 rounded-lg p-1 border border-gray-700/50 self-start">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab && setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab
                  ? "bg-green-500/10 text-green-400"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {tab === "Withdrawals" && (
                <Download className="h-3 w-3 mr-1 inline" />
              )}
              {tab}
            </button>
          ))}
        </div>
      </div>

      <Card className="mb-8">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
              <Input
                placeholder="Search payments by project title..."
                value={searchTerm}
                onChange={(e) => setSearchTerm && setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="w-full md:w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectItem value="all" onSelect={setStatusFilter}>
                  All Status
                </SelectItem>
                <SelectItem value="completed" onSelect={setStatusFilter}>
                  Completed
                </SelectItem>
                <SelectItem value="processing" onSelect={setStatusFilter}>
                  Processing
                </SelectItem>
                <SelectItem value="pending" onSelect={setStatusFilter}>
                  Pending
                </SelectItem>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Payment History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {displayPayments && displayPayments.length > 0 ? (
            <Table>
              <TableHeader>
                <div className="lg:table-row w-full border-b border-gray-700">
                  <TableHead>Date</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </div>
              </TableHeader>
              <TableBody>
                {displayPayments.map((payment, index) => (
                  <TableRow key={payment._id || index}>
                    <div
                      className="responsive-cell p-4 lg:table-cell flex justify-between items-center border-b lg:border-0 border-gray-700/50"
                      data-label="Date"
                    >
                      <div className="flex items-center gap-2 text-gray-300">
                        <Calendar className="h-4 w-4 text-gray-400 hidden sm:block" />
                        {formatDate(payment.createdAt)}
                      </div>
                    </div>
                    <div
                      className="responsive-cell p-4 lg:table-cell flex justify-between items-center border-b lg:border-0 border-gray-700/50"
                      data-label="Project"
                    >
                      <div className="text-white max-w-xs truncate">
                        {payment.gig?.title ||
                          payment.projectTitle ||
                          payment.description ||
                          "N/A"}
                      </div>
                    </div>
                    <div
                      className="responsive-cell p-4 lg:table-cell flex justify-between items-center border-b lg:border-0 border-gray-700/50"
                      data-label="Amount"
                    >
                      <div className="text-green-400 font-semibold text-right">
                        ₹{(payment.amount/10).toLocaleString("en-IN")}
                        {payment.platformCommission &&
                          payment.platformCommission > 0 && (
                            <div className="text-xs text-gray-500">
                              Commission: ₹
                              {(
                                payment.platformCommission / 100
                              ).toLocaleString("en-IN")}
                            </div>
                          )}
                        {payment.type === "withdrawal" && (payment.status === "pending" || payment.status === "processing") && (
                          <div className="text-xs text-blue-400 mt-1">
                            Will be credited within 7 working days
                          </div>
                        )}
                      </div>
                    </div>
                    <div
                      className="responsive-cell p-4 lg:table-cell flex justify-between items-center border-b lg:border-0 border-gray-700/50"
                      data-label="Type"
                    >
                      <span className="capitalize text-gray-300">
                        {payment.type?.replace("_", " ") || "N/A"}
                      </span>
                    </div>
                    <div
                      className="responsive-cell p-4 lg:table-cell flex justify-between items-center border-b lg:border-0 border-gray-700/50"
                      data-label="Status"
                    >
                      <Badge className={getStatusColor(payment.status)}>
                        {getStatusIcon(payment.status)}
                        <span className="ml-2 capitalize">
                          {payment.status}
                        </span>
                      </Badge>
                    </div>
                    <div
                      className="responsive-cell p-4 lg:table-cell flex justify-between items-center"
                      data-label="Actions"
                    >
                      <Button
                        onClick={() =>
                          setSelectedPayment && setSelectedPayment(payment)
                        }
                        variant="outline"
                        size="sm"
                        className="w-full sm:w-auto"
                        disabled={payment.type === "Project Approval"}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Details
                      </Button>
                    </div>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-16">
              <Wallet className="h-16 w-16 text-gray-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-400 mb-2">
                No payments found
              </h3>
              <p className="text-gray-500 mb-6">
                {activeTab === "Withdrawals"
                  ? "Your withdrawal history will appear here"
                  : "Your filtered results will appear here"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* This card is intentionally left here as requested */}
      {earningsData?.earnings?.pendingProjects &&
        earningsData.earnings.pendingProjects.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-400" />
                Approved Projects - Payment Pending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {earningsData.earnings.pendingProjects.map((project, index) => (
                  <div
                    key={project._id || index}
                    className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg border border-green-500/20"
                  >
                    <div className="flex-1">
                      <h4 className="font-semibold text-white">
                        {project.projectTitle}
                      </h4>
                      <p className="text-sm text-gray-400">
                        {project.gigTitle}
                      </p>
                      <p className="text-xs text-gray-500">
                        Approved: {formatDate(project.approvedAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-yellow-400">
                        ₹{((project.amount || 0) / 100).toLocaleString("en-IN")}
                      </p>
                      <p className="text-xs text-gray-500">Processing</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

      <WithdrawModal
        isOpen={isWithdrawModalOpen}
        onClose={() => setIsWithdrawModalOpen(false)}
        availableBalance={calculatedStats.myWallet / 100}
        onConfirmWithdraw={handleConfirmWithdraw}
        loading={withdrawLoading}
      />
    </div>
  );
};

export default EarningsTab;
