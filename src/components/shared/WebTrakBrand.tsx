"use client";

import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Variant = "login" | "header" | "sidebar";

type WebTrakBrandProps = {
  variant?: Variant;
  /** Icon-only mark for the collapsed sidebar rail. */
  compact?: boolean;
  className?: string;
  asLink?: boolean;
};

const LOGO_SRC = "/webtrak-logo.png";

function logoFrameClass(variant: Variant, compact: boolean) {
  if (compact) return "size-10 rounded-xl p-1.5";
  if (variant === "login") return "size-12 rounded-xl p-2 sm:size-[3.25rem] sm:p-2.5";
  if (variant === "sidebar") return "size-9 rounded-lg p-1.5";
  return "size-8 rounded-lg p-1";
}

function wordmarkClass(variant: Variant) {
  return cn(
    "wt-brand-wordmark lowercase text-wt-text",
    variant === "login" && "text-2xl font-bold tracking-[-0.045em] text-white",
    variant === "sidebar" && "truncate text-[1.125rem] font-semibold tracking-[-0.04em]",
    variant === "header" && "text-lg font-semibold tracking-[-0.035em]"
  );
}

export function WebTrakBrand({
  variant = "header",
  compact = false,
  className = "",
  asLink = true,
}: WebTrakBrandProps) {
  const logoSize = compact ? 32 : variant === "login" ? 44 : variant === "sidebar" ? 36 : 28;

  const logo = (
    <span
      className={cn("flex shrink-0 items-center justify-center", logoFrameClass(variant, compact))}
      aria-hidden={!compact}
    >
      <Image
        src={LOGO_SRC}
        alt={compact ? "webtrak" : ""}
        width={logoSize}
        height={logoSize}
        priority={variant === "login"}
        className="size-full object-contain"
      />
    </span>
  );

  const content = (
    <>
      {logo}
      {!compact ? <span className={wordmarkClass(variant)}>webtrak</span> : null}
    </>
  );

  const wrapClass = cn(
    "flex min-w-0 items-center",
    compact ? "justify-center" : "gap-2.5",
    variant === "sidebar" && !compact && "justify-start",
    variant === "login" && "gap-3",
    className
  );

  if (asLink && variant !== "login") {
    return (
      <Link href="/dashboard" className={wrapClass} aria-label="webtrak home">
        {content}
      </Link>
    );
  }

  return <div className={wrapClass}>{content}</div>;
}
