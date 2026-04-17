"use client";

import { useId } from "react";
import { NotificationsClient } from "./NotificationsClient";

type NotificationsPopoverProps = {
  onNavigate?: () => void;
};

export function NotificationsPopover({ onNavigate }: NotificationsPopoverProps) {
  const headingId = useId();

  return (
    <section
      id="notifications-popover"
      role="dialog"
      aria-modal="false"
      aria-labelledby={headingId}
      className="w-full overflow-hidden rounded-2xl border border-rer-border/80 bg-white/95 shadow-2xl backdrop-blur-sm motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1 sm:w-[44rem] sm:rounded-xl"
    >
      <h2 id={headingId} className="sr-only">
        Popup notifications
      </h2>
      <NotificationsClient variant="popover" onNavigate={onNavigate} />
    </section>
  );
}
