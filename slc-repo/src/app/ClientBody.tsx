"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import NewsletterPopup from "@/components/NewsletterPopup";

export default function ClientBody({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAdminPage = pathname?.startsWith("/admin");

  // Remove any extension-added classes during hydration
  useEffect(() => {
    // This runs only on the client after hydration
    document.body.className = "antialiased";
  }, []);

  return (
    <div className="antialiased">
      {children}
      {/* Only show newsletter popup on non-admin pages */}
      {!isAdminPage && <NewsletterPopup />}
    </div>
  );
}
