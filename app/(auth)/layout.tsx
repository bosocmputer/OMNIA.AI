import type { ReactNode } from "react";

// No Sidebar or extra Providers — root layout handles both.
// This file exists only to create the (auth) route group.
export default function AuthLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
