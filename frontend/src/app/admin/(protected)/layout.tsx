
// Directory: frontend/src/app/admin/(protected)/layout.tsx

import type { ReactNode } from "react";

import AdminSessionGuard from "@/features/admin/auth/components/AdminSessionGuard";
import AdminShell from "@/features/admin/shell/components/AdminShell";

export default function ProtectedAdminLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <AdminSessionGuard>
      <AdminShell>{children}</AdminShell>
    </AdminSessionGuard>
  );
}
