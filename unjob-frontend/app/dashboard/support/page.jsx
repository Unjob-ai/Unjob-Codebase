"use client";
import {
  Briefcase,
  BrainCog,
  LayoutGrid,
  Users,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Youtube,
  Phone,
  Info,
  HelpCircle,
  Shield,
  RefreshCcw,
  FileText,
} from "lucide-react";
import Link from "next/link";

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      {/* Fonts */}
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Figtree:ital,wght@0,300..900;1,300..900&family=Sen:wght@400..800&display=swap");

        .sen-font {
          font-family: "Sen", system-ui, -apple-system, sans-serif;
        }

        .figtree-font {
          font-family: "Figtree", system-ui, -apple-system, sans-serif;
        }
      `}</style>

      {/* YouTube Video Section */}
      <section className="bg-[#0a0a0a] py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-9xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-6 sen-font">
            How can we help you?
          </h2>
          <p className="text-gray-400 text-center mb-10 figtree-font">
            Browse our resources or get in touch with us directly
          </p>
          <div className="flex justify-center">
            <div className="w-[70%] aspect-video">
              <iframe
                className="w-full h-[60vh] rounded-xl shadow-2xl"
                src="https://www.youtube.com/embed/CFMqmbB0VUk"
                title="Unjob Support Video"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              ></iframe>
            </div>
          </div>
        </div>
      </section>

      {/* Help Center Cards */}


      <section className="bg-[#0a0a0a] py-12 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              title: "Contact us",
              desc: "Have a question or need help? Our support team is here to assist you with quick, reliable answers.",
              link: "/contact-us",
              icon: <Phone className="w-6 h-6 text-green-500" />,
            },
            {
              title: "Full Support guide",
              desc: "Explore step-by-step guides that walk you through setup, features, and troubleshooting tips.",
              link: null,
              icon: <Info className="w-6 h-6 text-green-500" />,
            },
            {
              title: "FAQs",
              desc: "Find quick solutions to the most common questions asked by our users, all in one place.",
              link: null,
              icon: <HelpCircle className="w-6 h-6 text-green-500" />,
            },
            {
              title: "Privacy policy",
              desc: "Learn how we handle, store, and protect your personal data with complete transparency.",
              link: "/privacy-policy",
              icon: <Shield className="w-6 h-6 text-green-500" />,
            },
            {
              title: "Refund policy",
              desc: "Understand our refund process, eligibility criteria, and how to request a refund with ease.",
              link: "/refund-policy",
              icon: <RefreshCcw className="w-6 h-6 text-green-500" />,
            },
            {
              title: "Terms of service",
              desc: "Read the rules, rights, and responsibilities that ensure a safe and fair experience for everyone.",
              link: "/terms-of-services",
              icon: <FileText className="w-6 h-6 text-green-500" />,
            },
          ].map((item, idx) =>
            item.link ? (
              <Link key={idx} href={item.link}>
                <div className="bg-[#111] rounded-xl p-6 border border-transparent hover:border-green-500 transition-colors cursor-pointer h-full flex flex-col">
                  <div className="mb-4 bg-green-500/10 p-3 w-fit rounded-lg">
                    {item.icon}
                  </div>
                  <h3 className="text-lg font-semibold mb-2 sen-font">
                    {item.title}
                  </h3>
                  <p className="text-sm text-gray-400 figtree-font flex-grow">
                    {item.desc}
                  </p>
                  <div className="h-1 w-full mt-4 bg-green-500"></div>
                </div>
              </Link>
            ) : (
              <div
                key={idx}
                className="bg-[#111] rounded-xl p-6 border border-transparent hover:border-green-500 transition-colors cursor-pointer h-full flex flex-col"
                onClick={() => {}} // 👈 prevents redirection but keeps hover + pointer
              >
                <div className="mb-4 bg-green-500/10 p-3 w-fit rounded-lg">
                  {item.icon}
                </div>
                <h3 className="text-lg font-semibold mb-2 sen-font">
                  {item.title}
                </h3>
                <p className="text-sm text-gray-400 figtree-font flex-grow">
                  {item.desc}
                </p>
                <div className="h-1 w-full mt-4 bg-green-500"></div>
              </div>
            )
          )}
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}

/* Feature Card (Reusable) */
function FeatureCard({ icon, title, desc }) {
  return (
    <div className="bg-[#111] rounded-xl p-4 sm:p-6 border border-transparent hover:border-green-500 transition-colors">
      <div className="mb-4 bg-green-500/10 p-3 w-fit rounded-lg">{icon}</div>
      <h3 className="text-base sm:text-lg font-semibold mb-2 sen-font">
        {title}
      </h3>
      <p className="text-xs sm:text-sm text-gray-400 figtree-font">{desc}</p>
      <div className="h-1 w-full mt-4 bg-green-500"></div>
    </div>
  );
}

/* Footer */
function Footer() {
  return (
    <footer className="bg-[#0a0a0a] text-white px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      <div className="max-w-5xl mx-auto text-center">
        <div className="flex justify-center mb-4">
          <img src="/logo.png" alt="Un-job Logo" className="h-28 w-auto" />
        </div>
        <p className="text-gray-400 text-xs sm:text-sm mb-6 max-w-2xl mx-auto figtree-font">
          Unjob is an AI-powered, content-first freelance platform where
          creators apply to brand projects using proof of skill, not paperwork.
          No resumes. Just talent.
        </p>

        {/* Socials */}
        <div className="flex justify-center gap-3 sm:gap-4 mb-6">
          {[Facebook, Twitter, Instagram, Linkedin, Youtube].map((Icon, i) => (
            <Link
              key={i}
              href="/login"
              className="bg-white text-black p-2 rounded-md hover:bg-green-500 hover:text-white transition"
            >
              <Icon size={16} />
            </Link>
          ))}
        </div>

        {/* Links */}
        <nav className="flex flex-wrap justify-center gap-4 sm:gap-8 text-sm mb-6 sm:mb-8">
          <Link href="/contact-us" className="font-medium figtree-font">
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

        <hr className="border-t border-gray-700 mb-4" />

        <p className="text-xs text-gray-500 figtree-font">© Unjob.ai</p>

        <div className="w-full bg-black py-6 sm:py-8 mt-6">
          <div className="w-full max-w-[1600px] mx-auto px-4">
            <img
              src="/company/Group (5).png"
              alt="Un-job logo"
              className="w-full h-auto object-contain max-h-20"
            />
          </div>
        </div>
      </div>
    </footer>
  );
}
