"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppMainNav } from "./AppMainNav";
import { AppUserStatus } from "./AppUserStatus";
import { AppHeaderSecondary } from "./AppHeaderSecondary";
import { AppUserSwitchFooter } from "./AppUserSwitchFooter";
import { useSiteLogo } from "@/lib/useSiteLogo";

type AppShellProps = {
  children: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const isLogin = pathname === "/login";
  const isPublicDiscover = pathname.startsWith("/decouvrir");
  const { logoUrl, fallbackLogoUrl } = useSiteLogo();
  const [logoLoadFailed, setLogoLoadFailed] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    setLogoLoadFailed(false);
  }, [logoUrl]);

  useEffect(() => {
    const handleScroll = () => {
      // Une fois que l’utilisateur a commencé à scroller,
      // on garde la barre en mode compact pour le reste de la session.
      if (!isScrolled && window.scrollY > 0) {
        setIsScrolled(true);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [isScrolled]);

  if (isLogin || isPublicDiscover) {
    return <main className="flex-1">{children}</main>;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header
        className={`sticky top-0 z-40 border-b border-rer-border bg-white/90 backdrop-blur transition-[box-shadow,background-color] duration-200 ease-out ${
          isScrolled ? "shadow-sm" : ""
        }`}
      >
        <div
          className={`mx-auto max-w-6xl px-4 transition-[padding] duration-200 ease-out ${
            isScrolled ? "py-1.5" : "py-4"
          }`}
        >
          <div
            className={`flex flex-col lg:flex-row lg:items-center lg:justify-between ${
              isScrolled ? "gap-2" : "gap-4"
            }`}
          >
            <Link href="/" className="flex min-w-0 items-center gap-4">
              <div
                className={`relative flex shrink-0 items-center justify-center overflow-hidden bg-white transition-[height,width] duration-200 ease-out ${
                  isScrolled ? "h-9 w-24 lg:h-10 lg:w-28" : "h-16 w-28 lg:h-20 lg:w-36"
                }`}
              >
                <Image
                  key={logoLoadFailed ? fallbackLogoUrl : logoUrl}
                  src={logoLoadFailed ? fallbackLogoUrl : logoUrl}
                  alt="Logo RER"
                  fill
                  sizes="(max-width: 1024px) 112px, 144px"
                  className="object-contain"
                  unoptimized
                  priority
                  onError={() => setLogoLoadFailed(true)}
                />
              </div>
              <div className="min-w-0 flex flex-col">
                <span className="truncate text-sm font-semibold text-rer-text sm:text-base">
                  Banque de contenus
                </span>
              </div>
            </Link>
            <div className="flex w-full min-w-0 flex-wrap items-center justify-between gap-2 lg:w-auto lg:flex-nowrap lg:justify-end lg:gap-4">
              <div className="min-w-0 max-w-full overflow-x-auto pb-1 lg:overflow-visible lg:pb-0">
                <AppMainNav />
              </div>
              <AppUserStatus />
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <AppUserSwitchFooter />
    </div>
  );
}

