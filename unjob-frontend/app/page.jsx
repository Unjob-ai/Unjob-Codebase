"use client";

import { Button } from "@/components/ui/button";
import {
  Briefcase,
  BrainCog,
  LayoutGrid,
  Users,
  Plus,
  Minus,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Youtube,
  Menu,
  X,
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";

function useCountUp(target, duration) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const increment = target / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) {
        clearInterval(timer);
        setCount(target);
      } else {
        setCount(start);
      }
    }, 16);

    return () => clearInterval(timer);
  }, [target, duration]);

  return Math.floor(count).toLocaleString();
}

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState(null);
  const creatorsCount = useCountUp(10000, 2000);
  const projectsCount = useCountUp(500, 2000);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const stats = [
    {
      label: "Creator Community",
      value: `${creatorsCount}+`,
      color: "text-green-400",
    },
    {
      label: "Brands Onboarded",
      value: `${projectsCount}+`,
      color: "text-green-400",
    },
  ];

  const faqs = [
    {
      question: "HOW IS UN-JOB DIFFERENT FROM UPWORK OR FIVERR?",
      answer:
        "Unjob is content-first. Instead of relying on resumes or long proposals, you showcase your work, and apply to listings that match your creative style. Companies can also pitch to you if they like your work",
    },
    {
      question: "IS UN-JOB FREE TO USE FREELANCERS?",
      answer:
        "Yes, uploading content and exploring the platform is completely free. However, applying to brand listings requires a paid subscription. This ensures only serious, high-quality talent gets access to opportunities.",
    },
    {
      question: "HOW DO PAYMENTS WORK?",
      answer:
        "Brands fund the project up front. You get paid once the work is submitted and approved, no delays, no confusion.",
    },
    {
      question: "WHAT KIND OF CONTENT CAN I UPLOAD?",
      answer:
        "Short videos, UGC, designs, animations, case studies, behind the scenes, anything that shows your real skills.",
    },
    {
      question: "CAN COMPANIES REACH OUT DIRECTLY?",
      answer:
        "Yes. Brands can shortlist freelancers and can also reach out on their own if they're a great fit for their listings.",
    },
    {
      question:
        "What happens if the freelancer's work isn't satisfactory or the brand doesn't approve it?",
      answer:
        "Brands choose freelancers based on their portfolio. Each project comes with a fixed number of revisions agreed upon before starting. Additional revisions can be requested at an extra cost. If a freelancer delivers fake or misrepresented work, the brand receives a full refund, and the freelancer is permanently blacklisted from the platform. However, if a brand rejects completed work without valid justification, the freelancer is still paid, and the brand's credibility rating is impacted.",
    },
  ];

  // Brand logos array
  const brandLogos = [
    { name: "Brand A", icon: "/company/1.jpg" },
    { name: "Brand A", icon: "/company/2.jpg" },
    { name: "Brand A", icon: "/company/3.png" },
    { name: "Brand A", icon: "/company/4.png" },
    { name: "Brand A", icon: "/company/5.jpg" },
    { name: "Brand A", icon: "/company/6.png" },
    { name: "Brand A", icon: "/company/7.png" },
    { name: "Brand A", icon: "/company/8.png" },
    { name: "Brand A", icon: "/company/9.jpg" },
    { name: "Brand A", icon: "/company/10.png" },
    { name: "Brand A", icon: "/company/11.jpg" },
    { name: "Brand A", icon: "/company/12.jpg" },
    { name: "Brand A", icon: "/company/13.jpg" },
    { name: "Brand A", icon: "/company/14.png" },
    { name: "Brand A", icon: "/company/15.png" },
    { name: "Brand A", icon: "/company/16.png" },
  ];

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      {/* Updated Google Fonts - Sen for titles, Figtree for descriptions */}
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
      <header className="bg-black relative z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Logo - Left Side with Image */}
            <div className="flex-shrink-0">
              <Link href="/login" className="flex items-center">
                <img
                  src="/logo.png" // Replace with your logo path
                  alt="Un-job Logo"
                  className="h-28 w-auto"
                />
              </Link>
            </div>

            {/* Centered Rounded Navigation - Desktop Only */}
            <nav className="hidden lg:block absolute left-1/2 transform -translate-x-1/2">
              <div className="bg-gray-900/80 backdrop-blur-sm rounded-full px-8 py-3 border border-gray-700">
                <div className="flex items-center space-x-8">
                  <Link
                    href="/login"
                    className="text-gray-300 hover:text-green-400 text-sm font-medium transition-colors duration-200 figtree-font"
                  >
                    Home
                  </Link>
                  <Link
                    href="/login"
                    className="text-gray-300 hover:text-green-400 text-sm font-medium transition-colors duration-200 figtree-font"
                  >
                    Explore
                  </Link>
                  <Link
                    href="/login"
                    className="text-gray-300 hover:text-green-400 text-sm font-medium transition-colors duration-200 figtree-font"
                  >
                    Gigs
                  </Link>
                  <Link
                    href="/login"
                    className="text-gray-300 hover:text-green-400 text-sm font-medium transition-colors duration-200 figtree-font"
                  >
                    Pricing
                  </Link>
                </div>
              </div>
            </nav>

            {/* Get Started Button - Desktop Only */}
            <div className="hidden lg:block">
              <Link href="/login">
                <Button className="bg-green-600 hover:bg-green-700 text-white rounded-full px-6 figtree-font">
                  Get Started
                </Button>
              </Link>
            </div>

            {/* Mobile menu button */}
            <div className="lg:hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="text-gray-300 hover:text-white"
              >
                {isMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </Button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {isMenuOpen && (
            <div className="lg:hidden">
              <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t border-gray-800">
                <Link
                  href="/login"
                  className="text-gray-300 hover:text-green-400 block px-3 py-2 text-base font-medium figtree-font"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Home
                </Link>
                <Link
                  href="/login"
                  className="text-gray-300 hover:text-green-400 block px-3 py-2 text-base font-medium figtree-font"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Explore
                </Link>
                <Link
                  href="/login"
                  className="text-gray-300 hover:text-green-400 block px-3 py-2 text-base font-medium figtree-font"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Gigs
                </Link>
                <Link
                  href="/login"
                  className="text-gray-300 hover:text-green-400 block px-3 py-2 text-base font-medium figtree-font"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Pricing
                </Link>
                <div className="pt-4">
                  <Link href="/login">
                    <Button className="w-full bg-green-600 hover:bg-green-700 text-white rounded-full figtree-font">
                      Get Started
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section - Fully Responsive */}
      <section className="relative bg-black overflow-hidden">
        {/* 🌐 Desktop Hero */}
        <div className="hidden lg:block relative min-h-[200vh]">
          {/* Earth Image in Background */}
          <div className="absolute inset-0 flex items-center justify-center">
            <img
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/earth-ZYpcsfV5JJB0oLax02CmHncjfmECjD.png"
              alt="Earth"
              className="w-[200vw] h-[120vw] object-contain opacity-100"
            />
          </div>

          {/* Desktop Content */}
          <div className="relative z-10 flex flex-col h-full px-8">
            <div className="max-w-7xl mx-auto">
              <h1 className="text-left text-7xl xl:text-8xl font-bold text-white leading-tight mt-8 sen-font">
                THE FUTURE OF WORK <br /> IN THE AGE OF AI
              </h1>
            </div>
          </div>
        </div>

        {/* 📱 Mobile Hero */}
        <div className="lg:hidden relative min-h-screen flex flex-col justify-between px-6 py-12">
          {/* Top Content */}
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-4 leading-tight sen-font">
              TURN YOUR TALENT <br /> INTO OPPORTUNITIES
            </h1>

            <p className="text-gray-300 text-sm sm:text-base max-w-md mx-auto mb-6 figtree-font">
              Un-job is a content-first platform where creators post reels and
              content, and companies pitch work to them. No resumes. Just
              creativity.
            </p>

            <div className="flex items-center justify-center gap-4 mb-4">
              <a href="/login">
                <button className="bg-green-500 text-white font-semibold px-6 py-2 rounded-full text-sm figtree-font">
                  Log-in
                </button>
              </a>
              <a href="/login">
                <button className="border border-green-500 text-green-500 font-semibold px-6 py-2 rounded-full text-sm figtree-font">
                  Explore Content
                </button>
              </a>
            </div>
          </div>

          {/* Earth Image Bottom */}
          <div className="flex justify-center mt-6">
            <img
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/earth-ZYpcsfV5JJB0oLax02CmHncjfmECjD.png"
              alt="Earth"
              className="w-[100vw] h-auto object-contain"
            />
          </div>
        </div>
      </section>

      {/* NEW: Milestones Section with Small Earth */}
      <section className="py-12 sm:py-16 lg:py-20 relative bg-black">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Left Side - Small Earth */}
            <div className="flex justify-center lg:justify-start order-2 lg:order-1">
              <img
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/earth-ZYpcsfV5JJB0oLax02CmHncjfmECjD.png"
                alt="Small Earth"
                className="w-[300px] h-[300px] lg:w-[400px] lg:h-[400px] object-contain"
              />
            </div>

            {/* Right Side - Milestones Data */}
            <div className="space-y-6 lg:space-y-8 order-1 lg:order-2">
              <div className="text-center lg:text-left">
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 text-white sen-font">
                  UNJOB MILESTONES
                </h2>
                <p className="text-gray-400 text-base sm:text-lg lg:text-xl max-w-lg mx-auto lg:mx-0 figtree-font">
                  From our first creator upload to thousands of successful
                  collaborations here's what we've achieved so far.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 lg:gap-8">
                <div className="text-center lg:text-left space-y-2">
                  <div className="text-4xl sm:text-5xl lg:text-6xl font-bold text-green-400 sen-font">
                    10K+
                  </div>
                  <div className="text-gray-300 text-base sm:text-lg lg:text-xl figtree-font">
                    Freelancers Community
                  </div>
                </div>
                <div className="text-center lg:text-left space-y-2">
                  <div className="text-4xl sm:text-5xl lg:text-6xl font-bold text-green-400 sen-font">
                    500+
                  </div>
                  <div className="text-gray-300 text-base sm:text-lg lg:text-xl figtree-font">
                    Brands Onboarded
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Brand Section with Auto-Scrolling Left */}
      <section className="py-12 sm:py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-xl sm:text-2xl font-semibold mb-8 sm:mb-12 text-gray-300 tracking-wider sen-font">
            BRAND WITH US
          </h3>

          {/* Scrolling Container */}
          <div className="overflow-hidden relative">
            <div className="flex animate-scroll-left gap-x-12 sm:gap-x-16">
              {/* First set of logos */}
              {brandLogos.map((brand, index) => (
                <div
                  key={`first-${index}`}
                  className="h-8 sm:h-10 lg:h-12 flex-shrink-0"
                >
                  <img
                    src={brand.icon}
                    alt={`${brand.name} Logo`}
                    className="h-full w-auto max-w-[120px] sm:max-w-[140px] lg:max-w-[160px] object-contain grayscale opacity-60 hover:opacity-100 hover:grayscale-0 transition-all duration-300 ease-in-out"
                    loading="lazy"
                  />
                </div>
              ))}

              {/* Duplicate set for seamless loop */}
              {brandLogos.map((brand, index) => (
                <div
                  key={`second-${index}`}
                  className="h-8 sm:h-10 lg:h-12 flex-shrink-0"
                >
                  <img
                    src={brand.icon}
                    alt={`${brand.name} Logo`}
                    className="h-full w-auto max-w-[120px] sm:max-w-[140px] lg:max-w-[160px] object-contain grayscale opacity-60 hover:opacity-100 hover:grayscale-0 transition-all duration-300 ease-in-out"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Why Un-job Section */}
      <section className="relative bg-[#0a0a0a] text-white">
        {/* Glowing Green SVG Wave Divider */}
        <div className="relative w-full h-[80px] sm:h-[120px] overflow-hidden">
          <svg
            viewBox="0 0 1440 320"
            className="absolute inset-0 w-full h-full"
            preserveAspectRatio="none"
          >
            <defs>
              <filter id="glow">
                <feGaussianBlur stdDeviation="25" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <path
              d="M0,160 C360,80 1080,240 1440,160 L1440,320 L0,320 Z"
              fill="#22c55e"
              filter="url(#glow)"
              opacity="0.4"
            />
          </svg>
        </div>

        {/* Main Content */}
        <div className="py-12 sm:py-16 lg:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12">
            {/* Left Section */}
            <div className="lg:col-span-2 flex flex-col justify-center text-center lg:text-left">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 leading-tight sen-font">
                WHY UN-JOB IS <br className="hidden sm:block" /> THE{" "}
                <br className="hidden sm:block" />
                <span className="text-green-500">FUTURE</span>
              </h2>
            </div>

            {/* Features Grid */}
            <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div className="bg-[#111] rounded-xl p-4 sm:p-6 border border-transparent hover:border-green-500 transition-colors">
                <div className="mb-4 bg-green-500/10 p-3 w-fit rounded-lg">
                  <BrainCog className="w-5 h-5 sm:w-6 sm:h-6 text-green-500" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold mb-2 sen-font">
                  Smart AI Matching
                </h3>
                <p className="text-xs sm:text-sm text-gray-400 figtree-font">
                  Your content is matched with companies based on tools, tone,
                  and creative style — not keywords.
                </p>
                <div className="h-1 w-full mt-4 bg-green-500"></div>
              </div>

              <div className="bg-[#111] rounded-xl p-4 sm:p-6 border border-transparent hover:border-green-500 transition-colors">
                <div className="mb-4 bg-green-500/10 p-3 w-fit rounded-lg">
                  <LayoutGrid className="w-5 h-5 sm:w-6 sm:h-6 text-green-500" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold mb-2 sen-font">
                  Visual Portfolios Only
                </h3>
                <p className="text-xs sm:text-sm text-gray-400 figtree-font">
                  No resumes. No cover letters. Just upload your reels, designs,
                  edits or posts, and let your work speak.
                </p>
                <div className="h-1 w-full mt-4 bg-green-500"></div>
              </div>

              <div className="bg-[#111] rounded-xl p-4 sm:p-6 border border-transparent hover:border-green-500 transition-colors">
                <div className="mb-4 bg-green-500/10 p-3 w-fit rounded-lg">
                  <Briefcase className="w-5 h-5 sm:w-6 sm:h-6 text-green-500" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold mb-2 sen-font">
                  Safe Work Process
                </h3>
                <p className="text-xs sm:text-sm text-gray-400 figtree-font">
                  Skip untracked chats. Get official offers with clear scope,
                  deadlines, and payment terms.
                </p>
                <div className="h-1 w-full mt-4 bg-green-500"></div>
              </div>

              <div className="bg-[#111] rounded-xl p-4 sm:p-6 border border-transparent hover:border-green-500 transition-colors">
                <div className="mb-4 bg-green-500/10 p-3 w-fit rounded-lg">
                  <Users className="w-5 h-5 sm:w-6 sm:h-6 text-green-500" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold mb-2 sen-font">
                  For Freelancers & Companies
                </h3>
                <p className="text-xs sm:text-sm text-gray-400 figtree-font">
                  Un-job gives equal power to freelancers and companies — to
                  connect, collaborate, and grow.
                </p>
                <div className="h-1 w-full mt-4 bg-green-500"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* YouTube Video Section */}
      <section className="bg-[#0a0a0a] py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-9xl mx-auto">
          <div className="flex justify-center">
            <div className="w-[70%] aspect-video">
              <iframe
                className="w-full h-[60vh] rounded-xl shadow-2xl"
                src="https://www.youtube.com/embed/7DZlpldEXJc"
                title="Un-job Platform Overview"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              ></iframe>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="bg-[#0a0a0a] py-12 sm:py-16 lg:py-24 px-4 sm:px-6 lg:px-8 text-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-center mb-4 sen-font">
            FREQUENTLY ASKED QUESTIONS
          </h2>
          <p className="text-gray-400 text-center mb-8 sm:mb-10 max-w-xl mx-auto text-sm sm:text-base figtree-font">
            Everything you need to know about how Un-job works — from posting
            content to getting paid.
          </p>
          <div className="space-y-4">
            {faqs.map((faq, index) => {
              const isActive = openFaq === index;
              return (
                <div
                  key={index}
                  className={`rounded-xl p-4 sm:p-6 transition-all duration-300 ${
                    isActive
                      ? "bg-white text-black border-2 border-green-500 shadow-green-500/40 shadow-xl"
                      : "bg-[#111] text-white"
                  }`}
                >
                  <div
                    className="flex justify-between items-center cursor-pointer"
                    onClick={() => setOpenFaq(isActive ? null : index)}
                  >
                    <h3
                      className={`font-semibold text-sm sm:text-base sen-font ${
                        isActive ? "text-green-600" : ""
                      }`}
                    >
                      {faq.question}
                    </h3>
                    <div className="text-green-500 flex-shrink-0 ml-4">
                      {isActive ? <Minus size={20} /> : <Plus size={20} />}
                    </div>
                  </div>
                  {isActive && faq.answer && (
                    <p className="mt-4 text-xs sm:text-sm leading-relaxed text-gray-700 figtree-font">
                      {faq.answer}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0a0a0a] text-white px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="max-w-5xl mx-auto text-center">
          {/* Brand */}
          <div className="text-2xl sm:text-3xl font-bold text-green-500 mb-2 sen-font flex w-full justify-center">
            <img
              src="/logo.png" // Replace with your logo path
              alt="Un-job Logo"
              className="h-28 w-auto"
            />
          </div>
          <p className="text-gray-400 text-xs sm:text-sm mb-6 max-w-2xl mx-auto figtree-font">
            Unjob is an AI-powered, content-first freelance platform where
            creators apply to brand projects using proof of skill, not
            paperwork. No resumes. Just talent.
          </p>

          {/* Social Icons */}
          <div className="flex justify-center gap-3 sm:gap-4 mb-6">
            <Link
              href="/login"
              className="bg-white text-black p-2 rounded-md hover:bg-green-500 hover:text-white transition"
            >
              <Facebook size={16} />
            </Link>
            <Link
              href="/login"
              className="bg-white text-black p-2 rounded-md hover:bg-green-500 hover:text-white transition"
            >
              <Twitter size={16} />
            </Link>
            <Link
              href="/login"
              className="bg-white text-black p-2 rounded-md hover:bg-green-500 hover:text-white transition"
            >
              <Instagram size={16} />
            </Link>
            <Link
              href="/login"
              className="bg-white text-black p-2 rounded-md hover:bg-green-500 hover:text-white transition"
            >
              <Linkedin size={16} />
            </Link>
            <Link
              href="/login"
              className="bg-white text-black p-2 rounded-md hover:bg-green-500 hover:text-white transition"
            >
              <Youtube size={16} />
            </Link>
          </div>

          {/* Links */}
          <nav className="flex flex-wrap justify-center gap-4 sm:gap-8 text-sm mb-6 sm:mb-8">
            <Link href="/contact-us" className=" font-medium figtree-font">
              Contact
            </Link>
            <Link
              href="/terms-of-services"
              className="hover:text-green-400 transition figtree-font"
            >
              Terms Of Services
            </Link>
            <Link
              href="/privacy-policy"
              className="hover:text-green-400 transition figtree-font"
            >
              Privacy Policy
            </Link>
            <Link
              href="/refund-policy"
              className="hover:text-green-400 transition figtree-font"
            >
              Refund Policy
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
