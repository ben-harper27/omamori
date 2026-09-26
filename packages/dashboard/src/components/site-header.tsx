"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";

const LINKS = [
  { href: "/", label: "Obaachan" },
  { href: "/family", label: "Family" },
];

export function SiteHeader() {
  const pathname = usePathname();
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 md:px-8">
        <Link href="/" className="text-lg font-semibold">
          ⛩️ Omamori
        </Link>
        <nav className="flex gap-1">
          {LINKS.map(({ href, label }) => (
            <Link key={href} href={href} className={buttonVariants({ variant: pathname === href ? "secondary" : "ghost" })}>
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
