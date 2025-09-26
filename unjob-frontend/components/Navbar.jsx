"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Menu,
  Bell,
  Search,
  User,
  Settings,
  LogOut,
  Crown,
} from "lucide-react";
import { signOut } from "next-auth/react";

export function Navbar({ toggleSidebar, isMobile = false }) {
  const { data: session } = useSession();
  const [user, setUser] = useState(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/profile/cover");
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        }
      } catch (error) {
        console.error("Error fetching user cover image:", error);
      }
    };
    fetchUser();
  }, []);

  const settingsHref =
    user?.role === "hiring"
      ? "/dashboard/settings/hiring"
      : user?.role === "freelancer"
      ? "/dashboard/settings/freelancer"
      : "/dashboard/settings";

  if (isMobile) {
    return (
      <header className="bg-[#091512]/95 backdrop-blur-lg border-b border-green-700/50 px-4 py-3 sticky top-0 z-40">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/dashboard" className="text-xl font-bold text-green-300">
            Un-Job
          </Link>

          {/* Right side - User avatar and menu */}
          <div className="flex items-center gap-3">
            {/* Notifications */}
            <Button
              variant="ghost"
              size="sm"
              className="text-green-400 hover:text-white p-2"
            >
              <Bell className="h-5 w-5" />
            </Button>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="flex items-center gap-2 p-1 rounded-full hover:bg-green-800/30 transition-colors"
              >
                {user?.image ? (
                  <Image
                    src={user.image}
                    alt="avatar"
                    width={32}
                    height={32}
                    className="rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-black" />
                  </div>
                )}
              </button>

              {/* Mobile Dropdown Menu */}
              {showMobileMenu && (
                <>
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowMobileMenu(false)}
                  />

                  {/* Menu */}
                  <div className="absolute right-0 top-full mt-2 w-64 bg-[#091512] border border-green-700/50 rounded-lg shadow-xl z-50">
                    {/* User Info */}
                    {user && (
                      <div className="p-4 border-b border-green-700/30">
                        <div className="flex items-center gap-3">
                          {user.image ? (
                            <Image
                              src={user.image}
                              alt="avatar"
                              width={40}
                              height={40}
                              className="rounded-full"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                              <User className="h-5 w-5 text-black" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-white">
                              {user.name}
                            </p>
                            <p className="text-sm text-green-300">
                              {user.email}
                            </p>
                            <p className="text-xs text-green-400 capitalize">
                              {user.role}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Menu Items */}
                    <div className="py-2">
                      <Link
                        href="/dashboard/profile"
                        className="flex items-center gap-3 px-4 py-3 text-green-200 hover:bg-green-800/30 hover:text-white transition-colors"
                        onClick={() => setShowMobileMenu(false)}
                      >
                        <User className="h-4 w-4" />
                        <span>Profile</span>
                      </Link>

                      <Link
                        href={settingsHref}
                        className="flex items-center gap-3 px-4 py-3 text-green-200 hover:bg-green-800/30 hover:text-white transition-colors"
                        onClick={() => setShowMobileMenu(false)}
                      >
                        <Settings className="h-4 w-4" />
                        <span>Settings</span>
                      </Link>

                      {user?.role === "hiring" && (
                        <Link
                          href="/dashboard/subscription"
                          className="flex items-center gap-3 px-4 py-3 text-green-200 hover:bg-green-800/30 hover:text-white transition-colors"
                          onClick={() => setShowMobileMenu(false)}
                        >
                          <Crown className="h-4 w-4" />
                          <span>Subscription</span>
                        </Link>
                      )}

                      <button
                        onClick={() => {
                          setShowMobileMenu(false);
                          signOut({ callbackUrl: "/" });
                        }}
                        className="flex items-center gap-3 px-4 py-3 text-green-200 hover:bg-green-800/30 hover:text-white transition-colors w-full text-left"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Logout</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>
    );
  }

  // Desktop Navbar (original design)
  return (
    <header className="bg-[#091512]/80 backdrop-blur-lg border-b border-green-700/50 px-6 py-4 sticky top-0 z-40">
      <div className="flex items-center justify-between">
        {/* Left side - could add breadcrumbs or page title here */}
        <div className="flex items-center gap-4">
          {/* Could add search or breadcrumbs here */}
        </div>

        {/* Right side - User info and notifications */}
        <div className="flex items-center gap-4">
          {/* Notifications */}
          <Button
            variant="ghost"
            size="sm"
            className="text-green-400 hover:text-white"
          >
            <Bell className="h-5 w-5" />
          </Button>

          {/* User info */}
          {user && (
            <div className="flex items-center gap-3 text-sm">
              {user.image ? (
                <Image
                  src={user.image}
                  alt="avatar"
                  width={32}
                  height={32}
                  className="rounded-full"
                />
              ) : (
                <User className="h-6 w-6 text-green-300" />
              )}
              <div className="hidden md:block">
                <p className="font-medium text-white">{user.name}</p>
                <p className="text-green-300 capitalize">{user.role}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
