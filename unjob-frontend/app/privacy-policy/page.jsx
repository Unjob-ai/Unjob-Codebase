"use client";

import {
  Shield,
  Eye,
  Lock,
  Users,
  Database,
  Globe,
  FileText,
  Mail,
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  Calendar,
  Cookie,
  Trash2,
  UserCheck,
  MessageCircle,
  Clock,
} from "lucide-react";
import Link from "next/link";

export default function PrivacyPolicyPage() {
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
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/support">
              <button className="p-2 rounded-lg transition-colors">
                <ArrowLeft className="w-4 h-4 text-gray-400" />
              </button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30">
                <Shield className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white sen-font">
                  Privacy Policy
                </h1>
                <p className="text-sm text-gray-400 figtree-font">
                  Your data protection and privacy rights
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
          <div className="flex items-start gap-4 mb-4">
            <div className="p-2 rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30">
              <FileText className="w-5 h-5 text-green-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-white mb-2 sen-font">
                Welcome to Unjob.ai Privacy Policy
              </h2>
              <p className="text-sm text-gray-300 figtree-font leading-relaxed">
                Unjob ("Unjob.ai", "we", "us", "our") respects your privacy and
                is committed to protecting your personal information. This
                Privacy Policy explains how we collect, use, disclose, and
                safeguard your data when you use our platform.
              </p>
            </div>
          </div>

          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
            <p className="text-green-400 font-medium figtree-font mb-1 text-sm">
              By accessing or using Unjob.ai, you agree to the terms of this
              Privacy Policy.
            </p>
            <p className="text-gray-300 figtree-font text-sm">
              If you do not agree, please do not use our services.
            </p>
          </div>

          <div className="mt-4 flex items-center gap-2 text-xs text-gray-400 figtree-font">
            <Calendar className="w-3 h-3" />
            Last Updated: 13/08/2025
          </div>
        </div>

        {/* Section 1: Information We Collect */}
        <div className="mb-8 bg-gradient-to-br from-gray-900/50 to-black/50 rounded-xl p-6 border border-gray-800">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30">
              <Database className="w-5 h-5 text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-white sen-font">
              1. Information We Collect
            </h3>
          </div>

          <div className="space-y-4">
            <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
              <h4 className="text-sm font-semibold text-green-400 mb-3 sen-font flex items-center gap-2">
                <UserCheck className="w-4 h-4" />
                Information You Provide to Us
              </h4>
              <ul className="space-y-2 text-gray-300 figtree-font text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-3 h-3 text-green-500 mt-1 flex-shrink-0" />
                  Name, email address, phone number, and other contact details
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-3 h-3 text-green-500 mt-1 flex-shrink-0" />
                  Account registration information (username, password)
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-3 h-3 text-green-500 mt-1 flex-shrink-0" />
                  Profile details (skills, portfolio items, work history, social
                  media links only if voluntarily added in profile fields)
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-3 h-3 text-green-500 mt-1 flex-shrink-0" />
                  Payment information (bank account, UPI, or payment gateway
                  details)
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-3 h-3 text-green-500 mt-1 flex-shrink-0" />
                  Content you upload (gig descriptions, portfolios, reels,
                  static posts)
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-3 h-3 text-green-500 mt-1 flex-shrink-0" />
                  Communication within the platform (messages, dispute
                  discussions)
                </li>
              </ul>
            </div>

            <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
              <h4 className="text-sm font-semibold text-green-400 mb-3 sen-font flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Information We Collect Automatically
              </h4>
              <ul className="space-y-2 text-gray-300 figtree-font text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-3 h-3 text-green-500 mt-1 flex-shrink-0" />
                  Device information (IP address, browser type, operating
                  system)
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-3 h-3 text-green-500 mt-1 flex-shrink-0" />
                  Usage data (pages viewed, time spent, actions taken)
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-3 h-3 text-green-500 mt-1 flex-shrink-0" />
                  Cookies and tracking technologies to improve site performance
                </li>
              </ul>
            </div>

            <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
              <h4 className="text-sm font-semibold text-green-400 mb-3 sen-font flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Information from Third Parties
              </h4>
              <ul className="space-y-2 text-gray-300 figtree-font text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-3 h-3 text-green-500 mt-1 flex-shrink-0" />
                  Payment processors (transaction confirmations)
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-3 h-3 text-green-500 mt-1 flex-shrink-0" />
                  Identity verification providers (if applicable)
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-3 h-3 text-green-500 mt-1 flex-shrink-0" />
                  Marketing or analytics partners
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Section 2: How We Use Your Information */}
        <div className="mb-8 bg-gradient-to-br from-gray-900/50 to-black/50 rounded-xl p-6 border border-gray-800">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30">
              <Lock className="w-5 h-5 text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-white sen-font">
              2. How We Use Your Information
            </h3>
          </div>

          <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
            <p className="text-gray-300 mb-4 figtree-font text-sm">
              We use your information to:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-300 figtree-font text-sm">
                    Create and manage your account
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-300 figtree-font text-sm">
                    Facilitate communication between freelancers and clients
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-300 figtree-font text-sm">
                    Process payments, subscriptions, and commissions
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-300 figtree-font text-sm">
                    Prevent fraud, scams, and circumvention
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-300 figtree-font text-sm">
                    Resolve disputes according to our policies
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-300 figtree-font text-sm">
                    Improve our services and user experience
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-300 figtree-font text-sm">
                    Send service updates and security alerts
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-300 figtree-font text-sm">
                    Comply with legal obligations in India
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: How We Share Your Information */}
        <div className="mb-8 bg-gradient-to-br from-gray-900/50 to-black/50 rounded-xl p-6 border border-gray-800">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30">
              <Users className="w-5 h-5 text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-white sen-font">
              3. How We Share Your Information
            </h3>
          </div>

          <div className="space-y-4">
            <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
              <p className="text-gray-300 mb-3 figtree-font text-sm">
                We may share your information with:
              </p>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Users className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                  <div>
                    <span className="font-semibold text-green-400 sen-font text-sm">
                      Other users:
                    </span>
                    <span className="text-gray-300 figtree-font ml-2 text-sm">
                      Limited profile details visible to registered users for
                      collaboration and hiring
                    </span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Globe className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                  <div>
                    <span className="font-semibold text-green-400 sen-font text-sm">
                      Service providers:
                    </span>
                    <span className="text-gray-300 figtree-font ml-2 text-sm">
                      Payment processors, cloud hosting, analytics tools,
                      customer support
                    </span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Shield className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                  <div>
                    <span className="font-semibold text-green-400 sen-font text-sm">
                      Law enforcement:
                    </span>
                    <span className="text-gray-300 figtree-font ml-2 text-sm">
                      When required by law or to protect our legal rights
                    </span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <FileText className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                  <div>
                    <span className="font-semibold text-green-400 sen-font text-sm">
                      Business transfers:
                    </span>
                    <span className="text-gray-300 figtree-font ml-2 text-sm">
                      In case of merger, acquisition, or sale of assets
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
              <p className="text-green-400 font-semibold figtree-font flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4" />
                We do not sell your personal data to third parties.
              </p>
            </div>
          </div>
        </div>

        {/* Section 4: Cookies and Tracking */}
        <div className="mb-8 bg-gradient-to-br from-gray-900/50 to-black/50 rounded-xl p-6 border border-gray-800">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30">
              <Cookie className="w-5 h-5 text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-white sen-font">
              4. Cookies and Tracking
            </h3>
          </div>

          <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
            <p className="text-gray-300 mb-4 figtree-font text-sm">
              We use cookies and similar technologies to:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <div className="bg-green-500/10 rounded-lg p-3 border border-green-500/20">
                <Lock className="w-6 h-6 text-green-500 mb-2" />
                <h4 className="font-semibold text-green-400 mb-2 sen-font text-sm">
                  Keep you logged in
                </h4>
                <p className="text-gray-400 text-xs figtree-font">
                  Maintain your session across visits
                </p>
              </div>
              <div className="bg-green-500/10 rounded-lg p-3 border border-green-500/20">
                <UserCheck className="w-6 h-6 text-green-500 mb-2" />
                <h4 className="font-semibold text-green-400 mb-2 sen-font text-sm">
                  Remember preferences
                </h4>
                <p className="text-gray-400 text-xs figtree-font">
                  Store your settings and choices
                </p>
              </div>
              <div className="bg-green-500/10 rounded-lg p-3 border border-green-500/20">
                <Eye className="w-6 h-6 text-green-500 mb-2" />
                <h4 className="font-semibold text-green-400 mb-2 sen-font text-sm">
                  Analyze traffic
                </h4>
                <p className="text-gray-400 text-xs figtree-font">
                  Improve performance and experience
                </p>
              </div>
            </div>
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3">
              <p className="text-gray-300 figtree-font text-sm">
                You can control cookies through your browser settings, but some
                features may not work properly if disabled.
              </p>
            </div>
          </div>
        </div>

        {/* Section 5: Data Retention */}
        <div className="mb-8 bg-gradient-to-br from-gray-900/50 to-black/50 rounded-xl p-6 border border-gray-800">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30">
              <Clock className="w-5 h-5 text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-white sen-font">
              5. Data Retention
            </h3>
          </div>

          <div className="space-y-4">
            <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
              <p className="text-gray-300 mb-3 figtree-font text-sm">
                We retain your personal data for as long as your account is
                active or as needed to:
              </p>
              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-300 figtree-font text-sm">
                    Fulfill the purposes described in this policy
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-300 figtree-font text-sm">
                    Comply with legal and tax obligations
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-300 figtree-font text-sm">
                    Resolve disputes
                  </span>
                </div>
              </div>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
              <p className="text-gray-300 figtree-font text-sm">
                When your account is deleted, we may retain certain information
                for legal, compliance, or fraud prevention purposes.
              </p>
            </div>
          </div>
        </div>

        {/* Section 6: Your Rights */}
        <div className="mb-8 bg-gradient-to-br from-gray-900/50 to-black/50 rounded-xl p-6 border border-gray-800">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30">
              <Shield className="w-5 h-5 text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-white sen-font">
              6. Your Rights (Under Indian Law)
            </h3>
          </div>

          <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
            <p className="text-gray-300 mb-4 figtree-font text-sm">You may:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Eye className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-green-400 sen-font text-sm">
                      Access Information
                    </h4>
                    <p className="text-gray-300 text-xs figtree-font">
                      View personal information we hold about you
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-green-400 sen-font text-sm">
                      Request Corrections
                    </h4>
                    <p className="text-gray-300 text-xs figtree-font">
                      Fix inaccurate or outdated information
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Lock className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-green-400 sen-font text-sm">
                      Withdraw Consent
                    </h4>
                    <p className="text-gray-300 text-xs figtree-font">
                      For non-essential data processing
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Trash2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-green-400 sen-font text-sm">
                      Request Deletion
                    </h4>
                    <p className="text-gray-300 text-xs figtree-font">
                      Delete account and associated data
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4 bg-green-500/10 border border-green-500/30 rounded-lg p-3">
              <p className="text-green-400 figtree-font text-sm">
                To exercise these rights, email us at{" "}
                <span className="font-semibold">care@unjob.ai</span>
              </p>
            </div>
          </div>
        </div>

        {/* Section 7: Security */}
        <div className="mb-8 bg-gradient-to-br from-gray-900/50 to-black/50 rounded-xl p-6 border border-gray-800">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30">
              <Lock className="w-5 h-5 text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-white sen-font">
              7. Security of Your Information
            </h3>
          </div>

          <div className="space-y-4">
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <Shield className="w-6 h-6 text-green-500" />
                <h4 className="text-base font-semibold text-green-400 sen-font">
                  Industry-Standard Security
                </h4>
              </div>
              <p className="text-gray-300 figtree-font text-sm">
                We use industry-standard encryption and security measures to
                protect your personal data.
              </p>
            </div>
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-gray-300 sen-font mb-2 text-sm">
                    Important Notice
                  </h4>
                  <p className="text-gray-300 figtree-font text-sm">
                    No method of transmission over the internet or electronic
                    storage is 100% secure. You use the platform at your own
                    risk.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 8: Communication & Anti-Circumvention */}
        <div className="mb-8 bg-gradient-to-br from-gray-900/50 to-black/50 rounded-xl p-6 border border-gray-800">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30">
              <MessageCircle className="w-5 h-5 text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-white sen-font">
              8. Communication & Anti-Circumvention
            </h3>
          </div>

          <div className="space-y-4">
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <AlertTriangle className="w-5 h-5 text-gray-400" />
                <h4 className="text-sm font-semibold text-gray-300 sen-font">
                  Critical Policy Reminder
                </h4>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <MessageCircle className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
                  <p className="text-gray-300 figtree-font text-sm">
                    All communication between freelancers and clients must occur
                    within the Unjob.ai platform.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <Shield className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
                  <p className="text-gray-300 figtree-font text-sm">
                    Any attempt to share personal contact details (phone, email,
                    social media) within messages or posts is a violation of our
                    Terms of Service and may result in account suspension.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <Clock className="w-5 h-5 text-gray-400" />
                <h4 className="text-sm font-semibold text-gray-300 sen-font">
                  Data Retention Policy
                </h4>
              </div>
              <div className="space-y-2">
                <p className="text-gray-300 figtree-font text-sm">
                  Chat history and submission history for a gig/project will be
                  retained for{" "}
                  <span className="font-semibold text-green-400">
                    7 days after project completion
                  </span>
                  , after which it will be deleted permanently.
                </p>
                <p className="text-gray-300 figtree-font text-sm">
                  Once chat data is deleted, Unjob.ai will be unable to provide
                  support based on prior conversations.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Section */}
        <div className="mt-8 bg-gradient-to-br from-green-500/10 to-green-600/10 rounded-xl p-6 border border-green-500/30">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30">
              <Mail className="w-5 h-5 text-green-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-white mb-2 sen-font">
                Contact Us
              </h2>
              <p className="text-gray-300 figtree-font mb-3 text-sm">
                If you have questions about this Privacy Policy or our data
                practices, contact us at:
              </p>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-green-400" />
                <a
                  href="mailto:care@unjob.ai"
                  className="text-green-400 font-semibold hover:text-green-300 transition-colors figtree-font text-sm"
                >
                  care@unjob.ai
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-6 text-center">
          <p className="text-gray-500 text-xs figtree-font">
            We may update this Privacy Policy from time to time. Changes will be
            posted on this page with the updated date.
          </p>
        </div>
      </div>
    </div>
  );
}
