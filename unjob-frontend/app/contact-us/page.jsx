"use client";

import {
  Shield,
  Users,
  Zap,
  Target,
  Globe,
  Heart,
  CheckCircle,
  Mail,
  Phone,
  MapPin,
  ArrowLeft,
  Building,
  Star,
  Briefcase,
  MessageCircle,
  CreditCard,
  Eye,
  FileText,
  Award,
  Handshake,
} from "lucide-react";
import Link from "next/link";

export default function AboutContactPage() {
  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  const features = [
    {
      icon: <Shield className="w-4 h-4" />,
      title: "Secure Platform",
      description:
        "Built-in protection against scams and fraudulent activities",
    },
    {
      icon: <MessageCircle className="w-4 h-4" />,
      title: "Seamless Communication",
      description: "Integrated chat system for smooth project discussions",
    },
    {
      icon: <CreditCard className="w-4 h-4" />,
      title: "Safe Payments",
      description: "Secure payment processing with escrow protection",
    },
    {
      icon: <Eye className="w-4 h-4" />,
      title: "Portfolio Showcase",
      description: "Rich media support for portfolios, reels, and projects",
    },
    {
      icon: <Users className="w-4 h-4" />,
      title: "Quality Matching",
      description: "Smart algorithms to connect the right talent with brands",
    },
    {
      icon: <Award className="w-4 h-4" />,
      title: "Fair Environment",
      description: "Transparent policies and dispute resolution system",
    },
  ];

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
                <Building className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white sen-font">
                  About Unjob.ai
                </h1>
                <p className="text-xs text-gray-400 figtree-font">
                  Next-generation freelance marketplace
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
          <div className="text-center mb-6">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30">
                <Briefcase className="w-8 h-8 text-green-400" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-3 sen-font">
              Welcome to the Future of Freelancing
            </h2>
            <p className="text-sm text-gray-300 figtree-font leading-relaxed max-w-4xl mx-auto">
              Unjob.ai is a next-generation freelance marketplace designed to
              connect talented freelancers with forward-thinking brands.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="text-center">
              <div className="flex justify-center mb-2">
                <Users className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="font-semibold text-white sen-font mb-1 text-sm">
                For Freelancers
              </h3>
              <p className="text-gray-400 figtree-font text-xs">
                Showcase your skills and get hired by top brands
              </p>
            </div>
            <div className="text-center">
              <div className="flex justify-center mb-2">
                <Building className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="font-semibold text-white sen-font mb-1 text-sm">
                For Brands
              </h3>
              <p className="text-gray-400 figtree-font text-xs">
                Find the perfect talent for your projects
              </p>
            </div>
            <div className="text-center">
              <div className="flex justify-center mb-2">
                <Shield className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="font-semibold text-white sen-font mb-1 text-sm">
                Secure Platform
              </h3>
              <p className="text-gray-400 figtree-font text-xs">
                Protected transactions and communications
              </p>
            </div>
          </div>

          {/* Quick Navigation */}
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 mt-6">
            <h3 className="text-sm font-semibold text-green-400 mb-3 sen-font">
              Quick Navigation
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
              {[
                {
                  id: "mission",
                  title: "Our Mission",
                  icon: <Target className="w-3 h-3" />,
                },
                {
                  id: "vision",
                  title: "Our Vision",
                  icon: <Eye className="w-3 h-3" />,
                },
                {
                  id: "features",
                  title: "What Makes Us Different",
                  icon: <Star className="w-3 h-3" />,
                },
                {
                  id: "values",
                  title: "Our Core Values",
                  icon: <Heart className="w-3 h-3" />,
                },
              ].map((item, index) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className="flex items-center gap-2 p-2 rounded-lg bg-green-500/10 border border-green-500/20 hover:bg-green-500/20 transition-colors text-left"
                >
                  {item.icon}
                  <span className="text-xs text-green-400 figtree-font">
                    {item.title}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Section 1: Mission */}
        <div
          id="mission"
          className="mb-8 bg-gradient-to-br from-gray-900/50 to-black/50 rounded-xl p-6 border border-gray-800"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30">
              <Target className="w-5 h-5 text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-white sen-font">
              Our Mission
            </h3>
          </div>

          <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 rounded-lg p-6 border border-green-500/30">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30">
                <Target className="w-4 h-4 text-green-400" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-green-400 mb-3 sen-font">
                  Creating the Future of Freelancing
                </h4>
                <p className="text-gray-300 figtree-font leading-relaxed text-sm">
                  Our mission is to create a secure, fair, and transparent
                  environment for both parties — eliminating scams, ensuring
                  smooth communication, and simplifying the hiring process.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Vision */}
        <div
          id="vision"
          className="mb-8 bg-gradient-to-br from-gray-900/50 to-black/50 rounded-xl p-6 border border-gray-800"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30">
              <Eye className="w-5 h-5 text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-white sen-font">
              Our Vision
            </h3>
          </div>

          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30">
                <Eye className="w-4 h-4 text-green-400" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-green-400 mb-3 sen-font">
                  Empowering Global Talent
                </h4>
                <p className="text-gray-300 figtree-font leading-relaxed text-sm">
                  We believe in empowering freelancers to showcase their skills
                  through portfolios, reels, and project listings, while helping
                  brands find the right talent faster with our built-in
                  communication and payment system.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Features */}
        <div
          id="features"
          className="mb-8 bg-gradient-to-br from-gray-900/50 to-black/50 rounded-xl p-6 border border-gray-800"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30">
              <Star className="w-5 h-5 text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-white sen-font">
              What Makes Us Different
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-gray-900/50 rounded-lg p-4 border border-gray-800 hover:border-green-500/30 transition-colors"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30 text-green-400">
                    {feature.icon}
                  </div>
                  <h4 className="font-semibold text-white sen-font text-sm">
                    {feature.title}
                  </h4>
                </div>
                <p className="text-gray-300 figtree-font text-xs">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Section 4: Values */}
        <div
          id="values"
          className="mb-8 bg-gradient-to-br from-gray-900/50 to-black/50 rounded-xl p-6 border border-gray-800"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30">
              <Heart className="w-5 h-5 text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-white sen-font">
              Our Core Values
            </h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 rounded-lg p-4 border border-green-500/30">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-4 h-4 text-green-400" />
                <h4 className="text-sm font-semibold text-green-400 sen-font">
                  Trust & Security
                </h4>
              </div>
              <p className="text-gray-300 figtree-font text-xs">
                We prioritize the safety and security of all our users through
                robust verification processes and secure payment systems.
              </p>
            </div>

            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Handshake className="w-4 h-4 text-gray-300" />
                <h4 className="text-sm font-semibold text-gray-300 sen-font">
                  Fairness
                </h4>
              </div>
              <p className="text-gray-300 figtree-font text-xs">
                Equal opportunities for all users with transparent policies and
                fair dispute resolution mechanisms.
              </p>
            </div>

            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-gray-300" />
                <h4 className="text-sm font-semibold text-gray-300 sen-font">
                  Innovation
                </h4>
              </div>
              <p className="text-gray-300 figtree-font text-xs">
                Continuously evolving our platform with cutting-edge features to
                enhance user experience.
              </p>
            </div>

            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Globe className="w-4 h-4 text-gray-300" />
                <h4 className="text-sm font-semibold text-gray-300 sen-font">
                  Global Community
                </h4>
              </div>
              <p className="text-gray-300 figtree-font text-xs">
                Building bridges between talented individuals and businesses
                across geographical boundaries.
              </p>
            </div>
          </div>
        </div>

        {/* Contact Section */}
        <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 rounded-xl p-6 border border-green-500/30">
          <div className="text-center mb-6">
            <div className="flex justify-center mb-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30">
                <MessageCircle className="w-6 h-6 text-green-400" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-3 sen-font">
              Get in Touch
            </h2>
            <p className="text-gray-300 figtree-font text-sm">
              Have questions, concerns, or feedback? We'd love to hear from you!
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Email */}
            <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800 text-center">
              <div className="flex justify-center mb-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30">
                  <Mail className="w-4 h-4 text-green-400" />
                </div>
              </div>
              <h3 className="text-sm font-semibold text-white mb-2 sen-font">
                Email Us
              </h3>
              <a
                href="mailto:care@unjob.ai"
                className="text-green-400 font-semibold hover:text-green-300 transition-colors figtree-font text-xs"
              >
                care@unjob.ai
              </a>
              <p className="text-gray-500 text-xs mt-1 figtree-font">
                24/7 Support Available
              </p>
            </div>

            {/* Phone */}
            <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800 text-center">
              <div className="flex justify-center mb-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30">
                  <Phone className="w-4 h-4 text-green-400" />
                </div>
              </div>
              <h3 className="text-sm font-semibold text-white mb-2 sen-font">
                Call Us
              </h3>
              <a
                href="tel:+919414215065"
                className="text-green-400 font-semibold hover:text-green-300 transition-colors figtree-font text-xs"
              >
                +91 94142 15065
              </a>
              <p className="text-gray-500 text-xs mt-1 figtree-font">
                Mon-Fri, 9 AM - 6 PM IST
              </p>
            </div>

            {/* Address */}
            <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800 text-center">
              <div className="flex justify-center mb-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30">
                  <MapPin className="w-4 h-4 text-green-400" />
                </div>
              </div>
              <h3 className="text-sm font-semibold text-white mb-2 sen-font">
                Visit Us
              </h3>
              
              <div className="text-green-400 font-semibold figtree-font text-xs leading-relaxed">
                Office 202, Above HDFC Bank
                <br />
                Ravi Enclave, Sector 87
                <br />
                Noida – 201310, India
              </div>
            </div>
          </div>

          {/* Quick Contact CTA */}
          <div className="mt-6 text-center">
            <div className="bg-gradient-to-r from-green-500/20 to-green-600/20 rounded-lg p-4 border border-green-500/30">
              <h3 className="text-lg font-semibold text-white mb-2 sen-font">
                Ready to Get Started?
              </h3>
              <p className="text-gray-300 figtree-font mb-3 text-sm">
                Join thousands of freelancers and brands already using Unjob.ai
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <a
                  href="mailto:care@unjob.ai"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition-colors figtree-font text-sm"
                >
                  <Mail className="w-4 h-4" />
                  Contact Support
                </a>
                <a
                  href="tel:+919414215065"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors figtree-font text-sm"
                >
                  <Phone className="w-4 h-4" />
                  Call Now
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
