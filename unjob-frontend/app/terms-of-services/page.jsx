"use client";

import {
  Shield,
  User,
  CreditCard,
  MessageCircle,
  RefreshCw,
  DollarSign,
  Upload,
  Gavel,
  Ban,
  Copyright,
  AlertTriangle,
  UserX,
  FileText,
  Mail,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Calendar,
  Users,
  Clock,
  Eye,
  Phone,
  Globe,
  Heart,
  Zap,
} from "lucide-react";
import Link from "next/link";

export default function TermsOfServicePage() {
  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Google Fonts */}
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Figtree:ital,wght@0,300..900;1,300..900&family=Sen:wght@400..800&display=swap");

        .sen-font {
          font-family: "Sen", system-ui, -apple-system, sans-serif;
        }

        .figtree-font {
          font-family: "Figtree", system-ui, -apple-system, sans-serif;
        }
      `}</style>

      {/* Header */}
      <div className="">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <Link href="/dashboard/support">
              {" "}
              <button className="p-2 rounded-lg transition-colors">
                <ArrowLeft className="w-4 h-4 text-gray-400" />
              </button>
            </Link>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30">
                <FileText className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white sen-font">
                  Terms of Service
                </h1>
                <p className="text-xs text-gray-400 figtree-font">
                  Your rights and responsibilities on Unjob.ai
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Introduction */}
        <div className="mb-8 bg-gradient-to-br from-gray-900/50 to-black/50 rounded-xl p-6 border border-gray-800">
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30">
              <Zap className="w-4 h-4 text-green-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-white mb-2 sen-font">
                Welcome to Unjob.ai!
              </h2>
              <p className="text-sm text-gray-300 figtree-font leading-relaxed mb-3">
                These Terms of Service ("Terms") govern your access to and use
                of the Unjob.ai website, mobile application, and any related
                services (collectively, the "Platform") operated by Unjob as a
                brand ("Unjob","Unjob.ai", "we", "us", or "our").
              </p>
              <p className="text-sm text-gray-300 figtree-font leading-relaxed">
                By accessing or using the Platform, registering for an account,
                or clicking to accept these Terms, you agree to be bound by
                these Terms, our Return & Refund Policy, Privacy Policy, and any
                other rules or guidelines displayed on the Platform.
              </p>
            </div>
          </div>

          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 mb-4">
            <p className="text-gray-300 font-medium figtree-font text-sm">
              If you do not agree to these Terms, you may not use the Platform.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-400 figtree-font mb-4">
            <Calendar className="w-3 h-3" />
            Last Updated: [Insert Date]
          </div>

          {/* Quick Navigation */}
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <h3 className="text-sm font-semibold text-green-400 mb-3 sen-font">
              Quick Navigation
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {[
                {
                  id: "eligibility",
                  title: "Eligibility",
                  icon: <User className="w-3 h-3" />,
                },
                {
                  id: "account-types",
                  title: "Account Types",
                  icon: <Users className="w-3 h-3" />,
                },
                {
                  id: "subscriptions",
                  title: "Subscriptions",
                  icon: <CreditCard className="w-3 h-3" />,
                },
                {
                  id: "communication",
                  title: "Communication",
                  icon: <MessageCircle className="w-3 h-3" />,
                },
                {
                  id: "payment-flow",
                  title: "Payment Flow",
                  icon: <RefreshCw className="w-3 h-3" />,
                },
                {
                  id: "platform-fees",
                  title: "Platform Fees",
                  icon: <DollarSign className="w-3 h-3" />,
                },
                {
                  id: "posting-content",
                  title: "Content Policy",
                  icon: <Upload className="w-3 h-3" />,
                },
                {
                  id: "disputes",
                  title: "Disputes",
                  icon: <Gavel className="w-3 h-3" />,
                },
                {
                  id: "prohibited-activities",
                  title: "Prohibited Activities",
                  icon: <Ban className="w-3 h-3" />,
                },
                {
                  id: "intellectual-property",
                  title: "IP Rights",
                  icon: <Copyright className="w-3 h-3" />,
                },
                {
                  id: "limitation-liability",
                  title: "Liability",
                  icon: <Shield className="w-3 h-3" />,
                },
                {
                  id: "account-termination",
                  title: "Termination",
                  icon: <UserX className="w-3 h-3" />,
                },
                {
                  id: "changes-terms",
                  title: "Changes",
                  icon: <FileText className="w-3 h-3" />,
                },
              ].map((item, index) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className="flex items-center gap-2 p-2 rounded-lg bg-green-500/10 border border-green-500/20 hover:bg-green-500/20 transition-colors text-left"
                >
                  {item.icon}
                  <span className="text-xs text-green-400 figtree-font">
                    {index + 1}. {item.title}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Section 1: Eligibility */}
        <div
          id="eligibility"
          className="mb-8 bg-gradient-to-br from-gray-900/50 to-black/50 rounded-xl p-6 border border-gray-800"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30">
              <User className="w-5 h-5 text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-white sen-font">
              1. Eligibility
            </h3>
          </div>

          <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                <p className="text-gray-300 figtree-font text-sm">
                  You must be{" "}
                  <span className="text-green-400 font-semibold">
                    18 years or older
                  </span>{" "}
                  and legally capable of forming a binding contract to use the
                  Platform.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <XCircle className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
                <p className="text-gray-300 figtree-font text-sm">
                  You may not use the Platform if you are subject to sanctions
                  or trade restrictions in your jurisdiction.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <FileText className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                <p className="text-gray-300 figtree-font text-sm">
                  You must provide accurate and up-to-date registration
                  information and maintain it at all times.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Account Types */}
        <div
          id="account-types"
          className="mb-8 bg-gradient-to-br from-gray-900/50 to-black/50 rounded-xl p-6 border border-gray-800"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30">
              <Users className="w-5 h-5 text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-white sen-font">
              2. Account Types
            </h3>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-green-400 mb-3 sen-font flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Freelancer Accounts
                </h4>
                <p className="text-gray-300 figtree-font text-xs">
                  Can upload portfolios, reels, and static posts, and apply to
                  client projects.
                </p>
              </div>

              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-300 mb-3 sen-font flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Client (Brand) Accounts
                </h4>
                <p className="text-gray-300 figtree-font text-xs">
                  Can post gig listings, hire freelancers, and manage projects.
                </p>
              </div>
            </div>

            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <p className="text-gray-300 font-semibold figtree-font text-sm">
                  Only one active account per user is allowed unless explicitly
                  approved by Unjob.ai.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Subscriptions */}
        <div
          id="subscriptions"
          className="mb-8 bg-gradient-to-br from-gray-900/50 to-black/50 rounded-xl p-6 border border-gray-800"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30">
              <CreditCard className="w-5 h-5 text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-white sen-font">
              3. Subscriptions
            </h3>
          </div>

          <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <CreditCard className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                <p className="text-gray-300 figtree-font text-sm">
                  Both Freelancers and Clients may be required to pay a monthly
                  subscription fee to access certain features.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <RefreshCw className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
                <p className="text-gray-300 figtree-font text-sm">
                  Subscriptions renew automatically unless cancelled before the
                  renewal date.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <XCircle className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
                <p className="text-gray-300 figtree-font text-sm">
                  Subscription fees are{" "}
                  <span className="text-gray-300 font-semibold">
                    non-refundable
                  </span>{" "}
                  once billed.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Communication & Anti-Circumvention */}
        <div
          id="communication"
          className="mb-8 bg-gradient-to-br from-gray-900/50 to-black/50 rounded-xl p-6 border border-gray-800"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30">
              <MessageCircle className="w-5 h-5 text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-white sen-font">
              4. Communication & Anti-Circumvention
            </h3>
          </div>

          <div className="space-y-4">
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-300 mb-3 sen-font flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                Strict Communication Policy
              </h4>
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <MessageCircle className="w-3 h-3 text-gray-400 mt-1 flex-shrink-0" />
                  <p className="text-gray-300 figtree-font text-xs">
                    All communication between Freelancers and Clients must occur
                    within the Unjob.ai platform.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <Ban className="w-3 h-3 text-gray-400 mt-1 flex-shrink-0" />
                  <p className="text-gray-300 figtree-font text-xs">
                    Sharing personal contact information such as phone numbers,
                    email addresses, or links to other social media
                    accounts/websites is{" "}
                    <span className="text-gray-300 font-semibold">
                      strictly prohibited
                    </span>
                    .
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <XCircle className="w-3 h-3 text-gray-400 mt-1 flex-shrink-0" />
                  <p className="text-gray-300 figtree-font text-xs">
                    Attempting to bypass the Platform for direct payments or
                    project discussions outside the Platform is forbidden.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-300 mb-3 sen-font flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Consequences of Violation
              </h4>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <UserX className="w-3 h-3 text-gray-400 mt-1 flex-shrink-0" />
                  <p className="text-gray-300 figtree-font text-xs">
                    Account suspension or permanent ban
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <DollarSign className="w-3 h-3 text-gray-400 mt-1 flex-shrink-0" />
                  <p className="text-gray-300 figtree-font text-xs">
                    Forfeiture of funds held in the account
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <Ban className="w-3 h-3 text-gray-400 mt-1 flex-shrink-0" />
                  <p className="text-gray-300 figtree-font text-xs">
                    No assistance with disputes or refunds for external
                    communications
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 5: Payment Flow */}
        <div
          id="payment-flow"
          className="mb-8 bg-gradient-to-br from-gray-900/50 to-black/50 rounded-xl p-6 border border-gray-800"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30">
              <RefreshCw className="w-5 h-5 text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-white sen-font">
              5. Project & Payment Flow
            </h3>
          </div>

          <div className="space-y-4">
            <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
              <h4 className="text-sm font-semibold text-green-400 mb-3 sen-font">
                Payment Process Steps
              </h4>
              <div className="space-y-3">
                {[
                  "A Freelancer applies to a Client's gig listing.",
                  "The Client selects the Freelancer and pays the gig amount + platform commission to Unjob.ai.",
                  "Once both parties mark the project as complete, the gig amount (minus platform fees) is released for withdrawal to the Freelancer.",
                ].map((step, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <div className="flex items-center justify-center w-5 h-5 rounded-full bg-green-500 text-black font-bold text-xs">
                      {index + 1}
                    </div>
                    <p className="text-gray-300 figtree-font text-xs">{step}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-gray-300 sen-font mb-1 text-xs">
                    Payment Finality
                  </h4>
                  <p className="text-gray-300 figtree-font text-xs">
                    Payments are final, non-refundable, and non-disputable once
                    a project/gig is marked as complete by both parties.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 6: Platform Fees */}
        <div
          id="platform-fees"
          className="mb-8 bg-gradient-to-br from-gray-900/50 to-black/50 rounded-xl p-6 border border-gray-800"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30">
              <DollarSign className="w-5 h-5 text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-white sen-font">
              6. Platform Fees / Commission
            </h3>
          </div>

          <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <DollarSign className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                <p className="text-gray-300 figtree-font text-sm">
                  Platform commissions/fees are currently suspended (0%). When active, 
                  a fixed percentage would be charged to both Freelancers and Clients 
                  for each successful hire.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <XCircle className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
                <p className="text-gray-300 figtree-font text-sm">
                  Platform fees are non-refundable except in specific dispute
                  resolution outcomes under our Return & Refund Policy.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Section 7: Content Policy */}
        <div
          id="posting-content"
          className="mb-8 bg-gradient-to-br from-gray-900/50 to-black/50 rounded-xl p-6 border border-gray-800"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30">
              <Upload className="w-5 h-5 text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-white sen-font">
              7. Posting Content
            </h3>
          </div>

          <div className="space-y-4">
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-green-400 mb-3 sen-font flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Content Allowed
              </h4>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-3 h-3 text-green-500 mt-1 flex-shrink-0" />
                  <p className="text-gray-300 figtree-font text-xs">
                    Freelancers may upload creative content, portfolios, reels,
                    and static posts to showcase their skills.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <Copyright className="w-3 h-3 text-green-500 mt-1 flex-shrink-0" />
                  <p className="text-gray-300 figtree-font text-xs">
                    You must own or have rights to all content uploaded.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-300 mb-3 sen-font flex items-center gap-2">
                <Ban className="w-4 h-4" />
                Prohibited Content
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  {
                    icon: <Copyright className="w-3 h-3" />,
                    text: "Copyrighted material without permission",
                  },
                  {
                    icon: <AlertTriangle className="w-3 h-3" />,
                    text: "Misleading or fraudulent claims about skills",
                  },
                  {
                    icon: <Ban className="w-3 h-3" />,
                    text: "Offensive, illegal, or defamatory material",
                  },
                  {
                    icon: <Phone className="w-3 h-3" />,
                    text: "Personal contact information or social media links",
                  },
                  {
                    icon: <XCircle className="w-3 h-3" />,
                    text: "NSFW content, pornography, or adult services",
                  },
                  {
                    icon: <AlertTriangle className="w-3 h-3" />,
                    text: "Content promoting violence or hate speech",
                  },
                  {
                    icon: <Shield className="w-3 h-3" />,
                    text: "Malware, phishing links, or harmful code",
                  },
                  {
                    icon: <Heart className="w-3 h-3" />,
                    text: "Content promoting self-harm or illegal activities",
                  },
                ].map((item, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <div className="text-gray-400 mt-1 flex-shrink-0">
                      {item.icon}
                    </div>
                    <span className="text-gray-300 figtree-font text-xs">
                      {item.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
              <h4 className="text-sm font-semibold text-gray-300 mb-3 sen-font flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Content Protection & Reporting
              </h4>
              <div className="space-y-2">
                <p className="text-gray-300 figtree-font text-xs">
                  If you believe another user has copied or stolen your work,
                  you may report it by emailing{" "}
                  <span className="text-green-400 font-semibold">
                    care@unjob.ai
                  </span>{" "}
                  with proof of ownership.
                </p>
                <p className="text-gray-300 figtree-font text-xs">
                  The Unjob.ai team will review your claim and, if verified,
                  take necessary actions including content removal, account
                  suspension, or permanent ban.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Section 8: Disputes */}
        <div
          id="disputes"
          className="mb-8 bg-gradient-to-br from-gray-900/50 to-black/50 rounded-xl p-6 border border-gray-800"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30">
              <Gavel className="w-5 h-5 text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-white sen-font">
              8. Disputes
            </h3>
          </div>

          <div className="space-y-4">
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <Clock className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
                  <p className="text-gray-300 figtree-font text-sm">
                    Disputes must be raised{" "}
                    <span className="text-gray-300 font-semibold">before</span>{" "}
                    marking the project/gig as completed.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
                  <p className="text-gray-300 figtree-font text-sm">
                    Once a project is marked as completed by both the Freelancer
                    and the Client, the payment is automatically transferred to
                    the Freelancer's wallet and becomes non-refundable and
                    non-disputable.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <Mail className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                  <p className="text-gray-300 figtree-font text-sm">
                    Disputes must be raised via{" "}
                    <span className="text-green-400 font-semibold">
                      care@unjob.ai
                    </span>{" "}
                    and follow the process outlined in our Return & Refund
                    Policy.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <Gavel className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                  <p className="text-gray-300 figtree-font text-sm">
                    Unjob.ai's decision in a dispute is{" "}
                    <span className="text-green-400 font-semibold">
                      final and binding
                    </span>
                    .
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 9: Prohibited Activities */}
        <div
          id="prohibited-activities"
          className="mb-8 bg-gradient-to-br from-gray-900/50 to-black/50 rounded-xl p-6 border border-gray-800"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30">
              <Ban className="w-5 h-5 text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-white sen-font">
              9. Prohibited Activities
            </h3>
          </div>

          <div className="space-y-4">
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-300 mb-3 sen-font">
                You agree not to:
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  "Circumvent the platform for payments or communication",
                  "Post spam, fake listings, or harmful code",
                  "Harass, discriminate, or impersonate others",
                  "Violate intellectual property rights",
                  "Use the Platform for unlawful purposes",
                ].map((activity, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <XCircle className="w-3 h-3 text-gray-400 mt-1 flex-shrink-0" />
                    <span className="text-gray-300 figtree-font text-xs">
                      {activity}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <p className="text-gray-300 font-semibold figtree-font text-sm">
                  Violation may lead to account suspension or permanent ban
                  without refund.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Section 10: Intellectual Property */}
        <div
          id="intellectual-property"
          className="mb-8 bg-gradient-to-br from-gray-900/50 to-black/50 rounded-xl p-6 border border-gray-800"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30">
              <Copyright className="w-5 h-5 text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-white sen-font">
              10. Intellectual Property
            </h3>
          </div>

          <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <Copyright className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                <p className="text-gray-300 figtree-font text-sm">
                  You retain ownership of the content you upload but grant
                  Unjob.ai a non-exclusive, worldwide, royalty-free license to
                  display and promote it on the Platform.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <Shield className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                <p className="text-gray-300 figtree-font text-sm">
                  If you believe your intellectual property rights have been
                  infringed, contact{" "}
                  <span className="text-green-400 font-semibold">
                    care@unjob.ai
                  </span>{" "}
                  with proof of ownership.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <Ban className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
                <p className="text-gray-300 figtree-font text-sm">
                  You may not use Unjob.ai's name, logo, or branding without
                  written consent.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Section 11: Limitation of Liability */}
        <div
          id="limitation-liability"
          className="mb-8 bg-gradient-to-br from-gray-900/50 to-black/50 rounded-xl p-6 border border-gray-800"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30">
              <Shield className="w-5 h-5 text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-white sen-font">
              11. Limitation of Liability
            </h3>
          </div>

          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
                <p className="text-gray-300 figtree-font text-sm">
                  Unjob.ai is not responsible for the quality, timeliness, or
                  legality of work delivered by Freelancers or payments made by
                  Clients.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <DollarSign className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
                <p className="text-gray-300 figtree-font text-sm">
                  Liability is limited to the amount paid to Unjob.ai in the
                  last 3 months.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Section 12: Account Termination */}
        <div
          id="account-termination"
          className="mb-8 bg-gradient-to-br from-gray-900/50 to-black/50 rounded-xl p-6 border border-gray-800"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30">
              <UserX className="w-5 h-5 text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-white sen-font">
              12. Account Suspension & Termination
            </h3>
          </div>

          <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <UserX className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
                <p className="text-gray-300 figtree-font text-sm">
                  We may suspend or terminate accounts for violating these
                  Terms.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <User className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                <p className="text-gray-300 figtree-font text-sm">
                  Users may deactivate their account at any time via account
                  settings, but outstanding payment obligations remain.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Section 13: Changes to Terms */}
        <div
          id="changes-terms"
          className="mb-8 bg-gradient-to-br from-gray-900/50 to-black/50 rounded-xl p-6 border border-gray-800"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30">
              <FileText className="w-5 h-5 text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-white sen-font">
              13. Changes to Terms
            </h3>
          </div>

          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <FileText className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
              <p className="text-gray-300 figtree-font text-sm">
                We may update these Terms by posting them on the Platform.
                Continued use of Unjob.ai after changes means you accept the
                updated Terms.
              </p>
            </div>
          </div>
        </div>

        {/* Contact Section */}
        <div className="mt-8 bg-gradient-to-br from-green-500/10 to-green-600/10 rounded-xl p-6 border border-green-500/30">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30">
              <Mail className="w-4 h-4 text-green-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-white mb-2 sen-font">
                Contact Us
              </h2>
              <p className="text-gray-300 figtree-font mb-3 text-xs">
                Questions about these Terms or need support?
              </p>
              <div className="flex items-center gap-2">
                <Mail className="w-3 h-3 text-green-400" />
                <a
                  href="mailto:care@unjob.ai"
                  className="text-green-400 font-semibold hover:text-green-300 transition-colors figtree-font text-xs"
                >
                  care@unjob.ai
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
