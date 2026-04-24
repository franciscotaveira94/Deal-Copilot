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
        "flex items-center gap-2 px-2.5 py-[6px] mx-1 rounded-[6px] text-[13px] font-medium transition",
        active
          ? "bg-[var(--bg-subtle)] text-[var(--ink)]"
          : "text-[var(--ink-3)] hover:bg-[var(--bg-hover)] hover:text-[var(--ink)]"
      )}
    >
      {children}
    </Link>
  );
}
