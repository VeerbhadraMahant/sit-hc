"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * A real product screenshot styled as the design system's "Product Screenshot Card"
 * (8px radius, layered shadow-screenshot, no border). Click to enlarge.
 */
export function Screenshot({
  src,
  alt,
  className,
  aspect = "16/10",
  objectPosition = "top",
  priority,
  sizes = "(max-width: 768px) 100vw, 720px",
}: {
  src: string;
  alt: string;
  className?: string;
  aspect?: string;
  objectPosition?: string;
  priority?: boolean;
  sizes?: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Enlarge screenshot: ${alt}`}
        className={cn(
          "group relative block w-full cursor-zoom-in overflow-hidden rounded-images bg-paper shadow-screenshot",
          className,
        )}
        style={{ aspectRatio: aspect }}
      >
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          sizes={sizes}
          className="object-cover transition-transform duration-300 group-hover:scale-[1.015]"
          style={{ objectPosition }}
        />
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={alt}
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-obsidian/80 p-4 sm:p-8"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-full w-full max-w-5xl overflow-hidden rounded-images shadow-screenshot"
          >
            <Image src={src} alt={alt} width={1440} height={900} className="h-auto w-full" />
          </div>
        </div>
      )}
    </>
  );
}
