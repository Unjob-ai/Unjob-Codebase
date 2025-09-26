"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { SearchFilter } from "@/components/SearchFilter";
import { BottomNavigation } from "@/components/BottomNavigation";

export default function DashboardLayout({ children }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState([]);
  const pathname = usePathname();
  const isMessagesPage = pathname === "/dashboard/messages";

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    // You can add logic here to filter content based on search
    console.log("Search query:", query);
  };

  const handleFilter = (filters) => {
    setActiveFilters(filters);
    // You can add logic here to filter content based on filters
    console.log("Active filters:", filters);
  };

  const expandedSidebarWidthClass = "w-64";
  const collapsedSidebarWidthClass = "w-16";
  const currentSidebarWidthClass = isSidebarCollapsed
    ? collapsedSidebarWidthClass
    : expandedSidebarWidthClass;
  const mainContentMarginClass = isSidebarCollapsed ? "ml-16" : "ml-64";

  if (isMobile) {
    // Mobile Layout
    return (
      <div className="min-h-screen bg-black text-white flex flex-col">
        {/* Search Filter - Only show if not on messages page */}
        {/* Main Content Area */}
        <main
          className={`
            flex-1 overflow-y-auto
            ${isMessagesPage ? "pb-0" : "pb-20"}
            ${!isMessagesPage ? "p-4" : ""}
          `}
        >
          {children}
        </main>

        {/* Bottom Navigation - Only show if not on messages page */}
        <BottomNavigation />
      </div>
    );
  }

  // Desktop Layout
  return (
    <div className="min-h-screen bg-black text-white flex">
      {/* Sidebar */}
      <div
        className={`
          h-screen flex-shrink-0 fixed left-0 top-0 z-50
          ${currentSidebarWidthClass}
          transition-all duration-300 ease-in-out
          bg-green-900/50 backdrop-blur-lg shadow-neon-green
        `}
      >
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          toggleSidebar={toggleSidebar}
        />
      </div>

      {/* Main Content Area */}
      <div
        className={`
          flex-1 flex flex-col
          ${mainContentMarginClass}
          transition-all duration-300 ease-in-out
        `}
      >
        <main
          className={
            isMessagesPage
              ? "flex-1 overflow-hidden"
              : "flex-1 overflow-y-auto p-6"
          }
        >
          {children}
        </main>
      </div>
    </div>
  );
}
