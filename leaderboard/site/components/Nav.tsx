"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Leaderboard" },
  { href: "/rules/", label: "Rules & scoring" },
  { href: "/submit/", label: "How to submit" },
];

export default function Nav() {
  const pathname = usePathname();
  const normalized = pathname.endsWith("/") ? pathname : `${pathname}/`;
  return (
    <nav className="site-nav" aria-label="Main">
      <ul>
        {LINKS.map((l) => (
          <li key={l.href}>
            <Link href={l.href} aria-current={normalized === l.href ? "page" : undefined}>
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
