// app/layout.js (Your updated root layout file)
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { PostModalProvider } from "@/components/providers/post-modal-provider";
import { Toaster } from "@/components/ui/toaster";
import { FollowProvider } from "@/contexts/FollowContext";
import { HealthCheckProvider } from "@/components/providers/HealthCheckProvider"; // 1. Import the new provider

const inter = Inter({ subsets: ["latin"] });


export const metadata = {
  title: "Un-Job - Turn Your Talent Into Opportunities",
  description:
    "The future of work is here. Connect, create, and collaborate on Un-Job.",
  favicon: "/unjobfav.ico",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-black text-white`}>
        <AuthProvider>
          <FollowProvider>
            <PostModalProvider>
              {/* 2. Wrap your children with the new provider */}
              <HealthCheckProvider>{children}</HealthCheckProvider>
            </PostModalProvider>
          </FollowProvider>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
