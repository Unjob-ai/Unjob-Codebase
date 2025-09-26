"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  Compass,
  Plus,
  House,
  MessageCircleMore,
  LogOut,
  Menu,
  UserRound,
  BriefcaseBusiness,
  Binoculars,
  Gift,
} from "lucide-react";
import { usePostModalStore } from "@/lib/store";
import { toast } from "react-hot-toast";

export function BottomNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const openPostModal = usePostModalStore((state) => state.open);
  const [user, setUser] = useState(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [isFirstGig, setIsFirstGig] = useState(false);
  const [checkingFirstGig, setCheckingFirstGig] = useState(true);

  useEffect(() => {
    const fetchUserAndNotifications = async () => {
      if (session) {
        try {
          const userRes = await fetch("/api/profile/cover");
          if (userRes.ok) {
            const userData = await userRes.json();
            setUser(userData.user);

            // Check if hiring user and their gig count for first gig detection
            if (userData.user?.role === "hiring") {
              const gigsResponse = await fetch("/api/gigs/user-stats");
              const gigsData = await gigsResponse.json();
              setIsFirstGig(gigsData.success && gigsData.totalGigs === 0);
            }
          }
        } catch (error) {
          console.error("Error fetching initial data:", error);
        } finally {
          setCheckingFirstGig(false);
        }
      }
    };
    fetchUserAndNotifications();
  }, [session]);

  const handleAddPostClick = async () => {
    if (user?.role === "hiring") {
      // If it's the first gig, allow direct access
      if (isFirstGig) {
        toast.success("🎁 First gig is free! Create your gig now.", {
          duration: 4000,
          icon: "🎁",
        });
        router.push("/dashboard/create-gig");
        return;
      }

      // For subsequent gigs, check subscription
      try {
        const response = await fetch("/api/subscription/manage");
        const data = await response.json();

        if (!response.ok || !data.success) {
          toast.error("Error checking subscription status");
          router.push("/dashboard/settings/hiring?view=subscription");
          return;
        }

        if (!data.hasActiveSubscription) {
          toast.error(
            "You need an active subscription to create additional gigs"
          );
          router.push("/dashboard/settings/hiring?view=subscription");
          return;
        }

        const usage = data.currentSubscription?.usage;
        const hasReachedLimit =
          usage && usage.limit !== -1 && usage.used >= usage.limit;

        if (hasReachedLimit) {
          toast.error("You have reached your monthly gig limit");
          router.push("/dashboard/settings/hiring?view=subscription");
          return;
        }

        router.push("/dashboard/create-gig");
      } catch (error) {
        console.error("Error checking subscription:", error);
        toast.error("Error checking subscription status");
        router.push("/dashboard/settings/hiring?view=subscription");
      }
    } else {
      openPostModal();
    }
  };

  const handleLogout = async () => {
    try {
      await signOut({ redirect: false });
      router.push("/");
      toast.success("Logged out successfully");
    } catch (error) {
      console.error("Error logging out:", error);
      toast.error("Error logging out");
    }
  };

  const settingsHref =
    user?.role === "hiring"
      ? "/dashboard/settings/hiring"
      : user?.role === "freelancer"
      ? "/dashboard/settings/freelancer"
      : "/dashboard/settings";

  const isMessagesRoute = pathname.startsWith("/dashboard/messages");

  // Get the appropriate configuration for the Add/Create button
  const getAddButtonConfig = () => {
    if (user?.role === "hiring") {
      if (isFirstGig) {
        return {
          name: "Create Gig",
          icon: Plus,
          className: "text-gray-400 hover:bg-gray-800 hover:text-green-400",
          tooltip: "Create Gig",
        };
      } else {
        return {
          name: "Create Gig",
          icon: Plus,
          className: "text-gray-400 hover:bg-gray-800 hover:text-green-400",
          tooltip: "Create Gig",
        };
      }
    } else {
      return {
        name: "Add Post",
        icon: Plus,
        className: "text-gray-400 hover:bg-gray-800 hover:text-green-400",
        tooltip: "Add Post",
      };
    }
  };

  const addButtonConfig = getAddButtonConfig();

  const navigation = [
    { name: "Home", href: "/dashboard", icon: House, key: "Home" },
    {
      name: "Gigs",
      href: "/dashboard/gigs",
      icon: BriefcaseBusiness,
      key: "gigs",
    },
    {
      name: "Search",
      href: "/dashboard/search",
      icon: Binoculars,
      key: "search",
    },
    {
      name: addButtonConfig.name,
      action: handleAddPostClick,
      icon: addButtonConfig.icon,
      key: "add",
      isAction: true,
      className: addButtonConfig.className,
      tooltip: addButtonConfig.tooltip,
      isSpecial: isFirstGig && user?.role === "hiring", // Mark as special for first gig
    },
    {
      name: "Messages",
      href: "/dashboard/messages",
      icon: MessageCircleMore,
      key: "message",
      notificationCount: unreadNotifications,
    },
    { name: "Dashboard", href: settingsHref, icon: Menu, key: "dashboard" },
    {
      name: "Profile",
      href: "/dashboard/profile",
      icon: UserRound,
      key: "profile",
    },
  ];

  return (
    <>
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-md border-t border-green-600/30",
          isMessagesRoute ? "z-[60]" : "z-50"
        )}
      >
        <nav className="flex items-center justify-around py-3 px-2 max-w-md mx-auto">
          {navigation.map((item) => {
            const isActive =
              item.href &&
              (item.href === "/dashboard"
                ? pathname === item.href
                : pathname.startsWith(item.href));

            const content = (
              <>
                <span
                  className={cn(
                    "absolute -top-9 whitespace-nowrap bg-gray-900 text-white text-xs px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none border border-green-700/50",
                    item.isSpecial &&
                      "bg-gradient-to-r from-green-600 to-emerald-600 text-black font-bold"
                  )}
                >
                  {item.tooltip || item.name}
                  {item.isSpecial && " 🎁"}
                </span>
                <div className="relative">
                  <item.icon
                    className={cn("h-6 w-6", item.isSpecial && "animate-pulse")}
                    strokeWidth={isActive ? 2 : 1.5}
                  />
                  {item.key === "message" && item.notificationCount > 0 && (
                    <div className="absolute -top-1 -right-2 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-black">
                      {item.notificationCount > 9
                        ? "9+"
                        : item.notificationCount}
                    </div>
                  )}

                </div>
              </>
            );

            const commonClasses = cn(
              "flex flex-col items-center justify-center p-2 transition-all duration-300 rounded-full w-14 h-14 group relative",
              item.className ||
                (isActive
                  ? "bg-green-500/20 text-green-300"
                  : "text-gray-400 hover:bg-gray-800 hover:text-green-400"),
              "active:scale-90",
              item.isSpecial &&
                "ring-2 ring-green-400/50 ring-offset-2 ring-offset-black"
            );

            if (item.isAction) {
              return (
                <button
                  key={item.key}
                  onClick={item.action}
                  className={commonClasses}
                  aria-label={item.name}
                  disabled={checkingFirstGig}
                >
                  {content}
                </button>
              );
            }

            return (
              <Link
                key={item.key}
                href={item.href}
                className={commonClasses}
                aria-label={item.name}
              >
                {content}
              </Link>
            );
          })}
        </nav>

      </div>
    </>
  );
}
