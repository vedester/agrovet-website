// Directory: frontend/src/features/admin/shell/components/AdminShell.tsx

"use client";

import { useState, type ReactNode } from "react";

import AdminSidebar from "@/features/admin/shell/components/AdminSidebar";
import AdminTopbar from "@/features/admin/shell/components/AdminTopbar";

type AdminShellProps = {
  children: ReactNode;
  businessName?: string;
};

export default function AdminShell({ children, businessName = "Agrovet" }: AdminShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  function closeMobileNavigation() {
    setMobileOpen(false);
  }

  return (
    <div className="min-h-dvh bg-[#f5f7fa]">
      <AdminSidebar
        businessName={businessName}
        mobileOpen={mobileOpen}
        onMobileClose={closeMobileNavigation}
        collapsed={sidebarCollapsed}
        onCollapsedChange={() => setSidebarCollapsed((value) => !value)}
      />

      <div
        className={`min-h-dvh transition-[padding] duration-300 ${
          sidebarCollapsed ? "lg:pl-20" : "lg:pl-72"
        }`}
      >
        <AdminTopbar onMenuClick={() => setMobileOpen(true)} />

        <main className="mx-auto w-full max-w-[1600px] px-5 py-7 sm:px-8 sm:py-9">{children}</main>
      </div>
    </div>
  );
}
