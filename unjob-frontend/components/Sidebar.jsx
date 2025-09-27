"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Compass,
  Plus,
  Briefcase,
  Binoculars,
  MessageCircleMore,
  User,
  ChevronLeft,
  ChevronRight,
  Settings,
  LogOut,
  Menu,
  Crown,
  FileText,
  CreditCard,
  Users,
  Shield,
  Bell,
  BarChart3,
  BriefcaseBusiness,
  House,
  CheckSquare,
  DollarSign,
  UserRound,
  Headphones,
  Phone,
  Gift,
} from "lucide-react";
import { usePostModalStore } from "@/lib/store";
import { toast } from "react-hot-toast";

export function Sidebar({ isCollapsed, toggleSidebar }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const openPostModal = usePostModalStore((state) => state.open);
  const [user, setUser] = useState(null);
  const [isFirstGig, setIsFirstGig] = useState(false);
  const [checkingFirstGig, setCheckingFirstGig] = useState(true);

  useEffect(() => {
    const fetchUserAndGigStatus = async () => {
      if (session) {
        try {
          // Fetch user data
          const res = await fetch("/api/profile/cover");
          if (res.ok) {
            const data = await res.json();
            setUser(data.user);

            // Check if hiring user and their gig count
            if (data.user?.role === "hiring") {
              const gigsResponse = await fetch("/api/gigs/user-stats");
              const gigsData = await gigsResponse.json();
              setIsFirstGig(gigsData.success && gigsData.totalGigs === 0);
            }
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        } finally {
          setCheckingFirstGig(false);
        }
      }
    };
    fetchUserAndGigStatus();
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

  // Define navigation items based on user role
  const getNavigationItems = () => {
    const baseNav = [
      { name: "Home", href: "/dashboard", icon: House },
      { name: "Search", href: "/dashboard/search", icon: Binoculars },
    ];
    switch (user?.role) {
      case "hiring":
        return [
          ...baseNav,
          { name: "Gigs", href: "/dashboard/gigs", icon: BriefcaseBusiness },
          {
            name: "Notifications",
            href: "/dashboard/notifications",
            icon: Bell,
          },
          {
            name: "Messages",
            href: "/dashboard/messages",
            icon: MessageCircleMore,
          },
        ];
      case "freelancer":
        return [
          ...baseNav,
          {
            name: "Browse Gigs",
            href: "/dashboard/gigs",
            icon: BriefcaseBusiness,
          },
          {
            name: "Notifications",
            href: "/dashboard/notifications",
            icon: Bell,
          },
          {
            name: "Messages",
            href: "/dashboard/messages",
            icon: MessageCircleMore,
          },
        ];
      case "admin":
        return [
          ...baseNav,
          { name: "All Gigs", href: "/admin/gigs", icon: BriefcaseBusiness },
          { name: "All Users", href: "/admin/users", icon: Users },
          { name: "Applications", href: "/admin/applications", icon: FileText },
          { name: "Payments", href: "/admin/payments", icon: CreditCard },
          { name: "Analytics", href: "/admin/analytics", icon: BarChart3 },
          { name: "Reports", href: "/admin/reports", icon: Shield },
        ];
      default:
        return [
          ...baseNav,
          { name: "Gigs", href: "/dashboard/gigs", icon: BriefcaseBusiness },
          {
            name: "Notifications",
            href: "/dashboard/notifications",
            icon: Bell,
          },
          {
            name: "Messages",
            href: "/dashboard/messages",
            icon: MessageCircleMore,
          },
        ];
    }
  };

  const navigation = getNavigationItems();
  const settingsHref =
    user?.role === "hiring"
      ? "/dashboard/settings/hiring"
      : user?.role === "freelancer"
      ? "/dashboard/settings/freelancer"
      : "/dashboard/settings";

  if (status === "loading" || checkingFirstGig) {
    return (
      <div
        className={cn(
          "transition-all duration-300 flex flex-col bg-[#091512] shadow-lg"
        )}
      >
        <div className="flex items-center justify-between p-4">
          <div className="animate-pulse bg-green-800 h-6 w-20 rounded"></div>
        </div>
        <div className="flex-1 p-4 space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="animate-pulse bg-green-800 h-10 rounded-lg"
            ></div>
          ))}
        </div>
      </div>
    );
  }

  // Get the appropriate button text and styling for the Add/Create button
  const getAddButtonConfig = () => {
    if (user?.role === "hiring") {
      if (isFirstGig) {
        return {
          text: "Create Gig",
          icon: Plus,
          className:
            "text-green-200 hover:bg-green-800 hover:text-white",
        };
      } else {
        return {
          text: "Create Gig",
          icon: Plus,
          className: "text-green-200 hover:bg-green-800 hover:text-white",
        };
      }
    } else {
      return {
        text: "Add Post",
        icon: Plus,
        className: "text-green-200 hover:bg-green-800 hover:text-white",
      };
    }
  };

  const addButtonConfig = getAddButtonConfig();

  return (
    <div
      className={cn(
        "flex flex-col justify-between h-full transition-all duration-300",
        "bg-black shadow-lg"
      )}
    >
      <div className="flex-1 overflow-y-auto">
        <div className="flex items-center justify-between p-4">
          {!isCollapsed && (
            <Link href="/dashboard" className="flex items-center gap-2">
              <img src="/logo.png" alt="Un-Job Logo" className="h-24 w-24" />
            </Link>
          )}

          {isCollapsed && (
            <Link
              href="/dashboard"
              className="flex items-center justify-center"
            >
              <img src="/logo.png" alt="Un-Job Logo" className="h-6 w-auto" />
            </Link>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            className="text-green-400 hover:text-white"
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        <nav className="p-4">
          <ul className="space-y-2">
            {navigation.map((item) => (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-4 px-3 py-3 rounded-xl text-sm font-medium transition-all group",
                    pathname === item.href
                      ? "bg-green-500/10 text-green-300"
                      : "text-green-200 hover:bg-green-800 hover:text-white",
                    "hover:shadow-md hover:shadow-green-500/20",
                    isCollapsed && "justify-center px-0"
                  )}
                >
                  <item.icon className="h-6 w-6 group-hover:scale-110 transition-transform" />
                  {!isCollapsed && <span>{item.name}</span>}
                </Link>
              </li>
            ))}
            <li>
              <button
                onClick={handleAddPostClick}
                className={cn(
                  "flex items-center gap-4 w-full px-3 py-3 rounded-xl text-sm font-medium transition-all group",
                  addButtonConfig.className,
                  "hover:shadow-md hover:shadow-green-500/20",
                  isCollapsed && "justify-center px-0"
                )}
              >
                <addButtonConfig.icon className="h-6 w-6 group-hover:scale-110 transition-transform" />
                {!isCollapsed && <span>{addButtonConfig.text}</span>}
               
              </button>
            </li>
          </ul>
        </nav>
      </div>

      <div className="p-4 space-y-3 flex-shrink-0">
        <ul className="space-y-2">
          <li>
            <Link
              href="/dashboard/profile"
              className={cn(
                "flex items-center gap-4 px-3 py-3 rounded-xl text-sm font-medium transition-all group",
                pathname === "/dashboard/profile"
                  ? "bg-green-500/10 text-green-300"
                  : "text-green-200 hover:bg-green-800 hover:text-white",
                "hover:shadow-md hover:shadow-green-500/20",
                isCollapsed && "justify-center px-0"
              )}
            >
              {isCollapsed ? (
                <Image
                  src={user?.image || "/placeholder.svg"}
                  alt="avatar"
                  width={32}
                  height={32}
                  className="rounded-full"
                />
              ) : (
                <>
                  <UserRound className="h-6 w-6 group-hover:scale-110 transition-transform" />
                  <span>Profile</span>
                </>
              )}
            </Link>
          </li>
          <li>
            <Link
              href={settingsHref}
              className={cn(
                "flex items-center gap-4 px-3 py-3 rounded-xl text-sm font-medium transition-all group",
                pathname === settingsHref
                  ? "bg-green-500/10 text-green-300"
                  : "text-green-200 hover:bg-green-800 hover:text-white",
                "hover:shadow-md hover:shadow-green-500/20",
                isCollapsed && "justify-center px-0"
              )}
            >
              <Menu className="h-6 w-6 group-hover:scale-110 transition-transform" />
              {!isCollapsed && <span>Dashboard</span>}
            </Link>
          </li>
          <li className="hidden md:block">
            <Link
              href="/dashboard/support"
              className={cn(
                "flex items-center gap-4 px-3 py-3 rounded-xl text-sm font-medium transition-all group",
                pathname === "/support"
                  ? "bg-green-500/10 text-green-300"
                  : "text-green-200 hover:bg-green-800 hover:text-white",
                "hover:shadow-md hover:shadow-green-500/20",
                isCollapsed && "justify-center px-0"
              )}
            >
              <Headphones className="h-6 w-6 group-hover:scale-110 transition-transform" />
              {!isCollapsed && <span>Support</span>}
            </Link>
          </li>

          <li>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className={cn(
                "flex items-center gap-4 w-full px-3 py-3 rounded-xl text-sm font-medium transition-all group",
                "text-green-200 hover:bg-green-800 hover:text-white",
                "hover:shadow-md hover:shadow-green-500/20",
                isCollapsed && "justify-center px-0"
              )}
            >
              <LogOut className="h-6 w-6 group-hover:scale-110 transition-transform" />
              {!isCollapsed && <span>Logout</span>}
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
}
