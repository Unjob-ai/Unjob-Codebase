"use client";

import {
  Shield,
  CreditCard,
  RefreshCw,
  AlertTriangle,
  Users,
  FileText,
  Mail,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  MessageCircle,
  DollarSign,
  Calendar,
  Gavel,
  Eye,
  Phone,
  Ban,
} from "lucide-react";
import Link from "next/link";

export default function RefundPolicyPage() {
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
              <button className="p-2 rounded-lg transition-colors">
                <ArrowLeft className="w-4 h-4 text-gray-400" />
              </button>
            </Link>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30">
                <RefreshCw className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white sen-font">
                  Return, Refund & Dispute Resolution Policy
                </h1>
                <p className="text-xs text-gray-400 figtree-font">
                  Fair and transparent resolution for all parties
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
              <Gavel className="w-4 h-4 text-green-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-white mb-2 sen-font">
                Fair & Transparent Platform
              </h2>
              <p className="text-sm text-gray-300 figtree-font leading-relaxed">
                At Unjob.ai, we aim to maintain a fair, transparent, and
                trustworthy environment for both freelancers and brands. This
                policy outlines how subscriptions, commissions, refunds, and
                disputes are handled on our platform.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-400 figtree-font mb-4">
            <Calendar className="w-3 h-3" />
            Last Updated: 12 August 2025
          </div>

          {/* Quick Navigation */}
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <h3 className="text-sm font-semibold text-green-400 mb-3 sen-font">
              Quick Navigation
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {[
                {
                  id: "monthly-subscription",
                  title: "Monthly Subscription",
                  icon: <CreditCard className="w-3 h-3" />,
                },
                {
                  id: "platform-fee",
                  title: "Platform Fee / Commission",
                  icon: <DollarSign className="w-3 h-3" />,
                },
                {
                  id: "payment-flow",
                  title: "Project Payment Flow",
                  icon: <RefreshCw className="w-3 h-3" />,
                },
                {
                  id: "disputes-refunds",
                  title: "Disputes & Refunds",
                  icon: <Gavel className="w-3 h-3" />,
                },
                {
                  id: "requesting-refund",
                  title: "Requesting a Refund",
                  icon: <Mail className="w-3 h-3" />,
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

        {/* Section 1: Monthly Subscription */}
        <div
          id="monthly-subscription"
          className="mb-8 bg-gradient-to-br from-gray-900/50 to-black/50 rounded-xl p-6 border border-gray-800"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30">
              <CreditCard className="w-5 h-5 text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-white sen-font">
              1. Monthly Subscription
            </h3>
          </div>

          <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <RefreshCw className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-green-400 sen-font mb-1 text-sm">
                    Automatic Billing
                  </h4>
                  <p className="text-gray-300 figtree-font text-xs">
                    Monthly subscriptions for freelancers and brands are billed
                    automatically unless cancelled before the renewal date.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <XCircle className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-gray-300 sen-font mb-1 text-sm">
                    Non-Refundable
                  </h4>
                  <p className="text-gray-300 figtree-font text-xs">
                    Once billed, subscription fees are non-refundable regardless
                    of usage or account activity.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Ban className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-gray-300 sen-font mb-1 text-sm">
                    Cancellation
                  </h4>
                  <p className="text-gray-300 figtree-font text-xs">
                    You may cancel anytime from your account settings to stop
                    the next billing cycle.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Platform Fee */}
        <div
          id="platform-fee"
          className="mb-8 bg-gradient-to-br from-gray-900/50 to-black/50 rounded-xl p-6 border border-gray-800"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30">
              <DollarSign className="w-5 h-5 text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-white sen-font">
              2. Platform Fee / Commission
            </h3>
          </div>

          <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <DollarSign className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                <p className="text-gray-300 figtree-font text-xs">
                  Unjob.ai charges a fixed percentage commission to both
                  freelancers and brands for each successful hire.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <XCircle className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
                <p className="text-gray-300 figtree-font text-xs">
                  This fee is deducted automatically during payment processing
                  and is non-refundable, except in specific dispute outcomes
                  (see Section 4).
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Payment Flow */}
        <div
          id="payment-flow"
          className="mb-8 bg-gradient-to-br from-gray-900/50 to-black/50 rounded-xl p-6 border border-gray-800"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30">
              <RefreshCw className="w-5 h-5 text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-white sen-font">
              3. Project Payment Flow
            </h3>
          </div>

          <div className="space-y-4">
            <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
              <h4 className="text-sm font-semibold text-green-400 mb-3 sen-font">
                Payment Process Steps
              </h4>
              <div className="space-y-3">
                {[
                  "A freelancer applies to a brand's gig listing.",
                  "The brand selects the freelancer and pays the gig amount + commission to Unjob.ai.",
                  "Once both the freelancer and the brand mark the project as complete, the gig amount (minus platform fees) becomes available for withdrawal by the freelancer.",
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
                    Finality of Payments
                  </h4>
                  <p className="text-gray-300 figtree-font text-xs">
                    After a project is marked complete by both parties, payments
                    are final and non-refundable.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Disputes & Refunds */}
        <div
          id="disputes-refunds"
          className="mb-8 bg-gradient-to-br from-gray-900/50 to-black/50 rounded-xl p-6 border border-gray-800"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30">
              <Gavel className="w-5 h-5 text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-white sen-font">
              4. Disputes & Refunds
            </h3>
          </div>

          <div className="space-y-4">
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-gray-300 sen-font mb-1 text-sm">
                    Important Notice
                  </h4>
                  <p className="text-gray-300 figtree-font text-xs">
                    If a project is not completed satisfactorily, either party
                    may raise a dispute by emailing care@unjob.ai before marking
                    the project as completed.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Freelancer at Fault */}
              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-300 mb-3 sen-font flex items-center gap-2">
                  <XCircle className="w-4 h-4" />
                  If the Freelancer is at Fault
                </h4>
                <div className="space-y-2 mb-3">
                  <p className="text-gray-300 figtree-font font-semibold text-xs">
                    Examples:
                  </p>
                  <ul className="space-y-1">
                    {[
                      "Extremely delayed work",
                      "Poor quality work compared to portfolio",
                      "Failure to deliver agreed scope",
                    ].map((example, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <div className="w-1 h-1 rounded-full bg-gray-400 mt-2 flex-shrink-0"></div>
                        <span className="text-gray-300 figtree-font text-xs">
                          {example}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-gray-700/30 rounded-lg p-2">
                  <p className="text-gray-300 font-semibold figtree-font text-xs">
                    Outcome: The brand will receive a full refund of both the
                    gig amount and the hiring commission.
                  </p>
                </div>
              </div>

              {/* Brand at Fault */}
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-green-400 mb-3 sen-font flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  If the Brand is at Fault
                </h4>
                <div className="space-y-2 mb-3">
                  <p className="text-gray-300 figtree-font font-semibold text-xs">
                    Examples:
                  </p>
                  <ul className="space-y-1">
                    <li className="flex items-start gap-2">
                      <div className="w-1 h-1 rounded-full bg-green-500 mt-2 flex-shrink-0"></div>
                      <span className="text-gray-300 figtree-font text-xs">
                        Refusing to mark a project complete despite agreed
                        quality and revisions
                      </span>
                    </li>
                  </ul>
                </div>
                <div className="bg-green-500/10 rounded-lg p-2">
                  <p className="text-green-400 font-semibold figtree-font text-xs">
                    Outcome: The freelancer will be paid the full gig amount,
                    minus platform fees.
                  </p>
                </div>
              </div>
            </div>

            {/* Communication Requirement */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-300 mb-3 sen-font flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                Communication Requirement
              </h4>
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <MessageCircle className="w-3 h-3 text-gray-400 mt-1 flex-shrink-0" />
                  <p className="text-gray-300 figtree-font text-xs">
                    All communication between freelancers and brands must occur
                    within the Unjob.ai platform.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <Ban className="w-3 h-3 text-gray-400 mt-1 flex-shrink-0" />
                  <p className="text-gray-300 figtree-font text-xs">
                    If we find that communication took place outside the
                    platform (via email, phone, or social media), Unjob.ai will
                    not be able to assist in resolving the dispute.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <Shield className="w-3 h-3 text-gray-400 mt-1 flex-shrink-0" />
                  <p className="text-gray-300 figtree-font text-xs">
                    To protect yourself from scams and ensure our support in
                    case of issues, do not communicate or exchange payment
                    details outside Unjob.ai.
                  </p>
                </div>
              </div>
            </div>

            {/* Resolution Process */}
            <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
              <h4 className="text-sm font-semibold text-green-400 mb-3 sen-font flex items-center gap-2">
                <Gavel className="w-4 h-4" />
                Resolution Process
              </h4>
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <FileText className="w-3 h-3 text-green-500 mt-1 flex-shrink-0" />
                  <p className="text-gray-300 figtree-font text-xs">
                    Both parties must provide evidence such as work files,
                    communication logs (within the platform), and agreed
                    deliverables.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <Users className="w-3 h-3 text-green-500 mt-1 flex-shrink-0" />
                  <p className="text-gray-300 figtree-font text-xs">
                    An Unjob.ai account manager or support representative will
                    review all evidence and make a final binding decision.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 5: Requesting Refund */}
        <div
          id="requesting-refund"
          className="mb-8 bg-gradient-to-br from-gray-900/50 to-black/50 rounded-xl p-6 border border-gray-800"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30">
              <Mail className="w-5 h-5 text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-white sen-font">
              5. Requesting a Refund or Dispute
            </h3>
          </div>

          <div className="space-y-4">
            <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
              <p className="text-gray-300 mb-3 figtree-font text-xs">
                To request a refund or open a dispute, email{" "}
                <span className="text-green-400 font-semibold">
                  care@unjob.ai
                </span>{" "}
                with:
              </p>
              <div className="space-y-2">
                {[
                  "Your registered account details",
                  "Gig ID & screenshot and payment receipt",
                  "Detailed reason and supporting evidence",
                ].map((requirement, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <CheckCircle className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-300 figtree-font text-xs">
                      {requirement}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-green-500" />
                <p className="text-green-400 font-semibold figtree-font text-xs">
                  Approved refunds will be processed within 7–10 business days
                  to the original payment method.
                </p>
              </div>
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
                For refunds, disputes, or questions about this policy:
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
