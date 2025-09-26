"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Search, BarChart3, Settings, MessageSquare, Users, CreditCard, Home, LifeBuoy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const handleAdminLogout = async () => {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
      router.replace("/admin-login");
    } catch (e) {
      router.replace("/admin-login");
    }
  };

  const navItems = [
    { href: "/admin", label: "Overview", icon: Home },
    { href: "/admin/posts", label: "Posts", icon: MessageSquare },
    { href: "/admin/gigs", label: "Gigs", icon: BarChart3 },
    { href: "/admin/subscription", label: "Subscription", icon: CreditCard },
    { href: "/admin/payments", label: "Payments", icon: CreditCard },
    { href: "/admin/chats", label: "Chats", icon: MessageSquare },
    { href: "/admin/users", label: "Users", icon: Users },
  
  ];

  const Sidebar = () => (
    <aside className="hidden md:flex md:flex-col w-64 shrink-0 border-r bg-black text-green-200">
      <div className="h-14 flex items-center px-4 text-lg font-semibold text-green-400">Admin</div>
      <Separator />
      <nav className="flex-1 py-2">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-4 py-2 text-sm rounded-xl transition-all",
                active
                  ? "bg-green-500/10 text-green-300"
                  : "text-green-200 hover:bg-green-800 hover:text-white hover:shadow-md hover:shadow-green-500/20"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-4 pt-0">
        <Button onClick={handleAdminLogout} className="w-full bg-green-700 hover:bg-green-600 text-white">Logout</Button>
      </div>
    </aside>
  );

  const MobileSidebar = () => (
    <aside className="flex flex-col w-64 shrink-0 bg-black text-green-200">
      <div className="h-14 flex items-center px-4 text-lg font-semibold text-green-400">Admin</div>
      <Separator />
      <nav className="flex-1 py-2">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-4 py-2 text-sm rounded-xl transition-all",
                active
                  ? "bg-green-500/10 text-green-300"
                  : "text-green-200 hover:bg-green-800 hover:text-white hover:shadow-md hover:shadow-green-500/20"
              )}
              onClick={() => setOpen(false)}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-4 pt-0">
        <Button onClick={() => { setOpen(false); handleAdminLogout(); }} className="w-full bg-green-700 hover:bg-green-600 text-white">Logout</Button>
      </div>
    </aside>
  );

  const Header = () => (
    <header className="sticky top-0 z-10 h-14 border-b bg-black flex items-center gap-2 px-4 text-green-200">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0">
          <MobileSidebar />
        </SheetContent>
      </Sheet>
      <div className="ml-auto  flex items-center gap-2">
        <div className="relative w-28 md:w-72 max-w-full">
          <Input placeholder="Search across users, gigs, posts..." className="pl-3 text-sm" />
        </div>
        <Button variant="outline" size="sm">Search</Button>
      </div>
    </header>
  );

  return (
    <div className="min-h-dvh w-full grid grid-cols-1 md:grid-cols-[16rem_1fr]">
      <Sidebar />
      <div className="flex flex-col">
        <Header />
        <main className="p-4">
          {children}
        </main>
      </div>
    </div>
  );
}


