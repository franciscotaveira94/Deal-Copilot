"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

export function ActiveLink({
  href,
  children,
  exact = false,
}: {
  href: string;
  children: ReactNode;
  exact?: boolean;
}) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 px-2.5 py-[5px] mx-1 rounded-[5px] text-[12.5px] transition-colors duration-150 [transition-timing-function:var(--ease)]",
        active
          ? "bg-[var(--paper-2)] text-[var(--ink)] font-medium"
          : "text-[var(--ink-3)] hover:bg-[var(--paper-hover)] hover:text-[var(--ink)]"
      )}
    >
      {children}
    </Link>
  );
}
