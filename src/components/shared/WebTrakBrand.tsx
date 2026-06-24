"use client";

import Image from "next/image";
import wordmark from "./webtrak-wordmark.png";

type Variant = "login" | "header" | "sidebar";

export function WebTrakBrand({
  variant = "header",
  className = "",
}: {
  variant?: Variant;
  className?: string;
}) {
  const imgClass =
    variant === "login"
      ? "h-[min(26vw,142px)] w-auto max-w-[min(94vw,460px)]"
      : variant === "sidebar"
        ? "h-9 w-auto max-w-full object-left"
        : "h-8 w-auto max-w-[200px] sm:h-9";

  const rowAlign = variant === "sidebar" ? "justify-start" : "justify-center";

  return (
    <div className={`flex w-full items-center ${rowAlign} ${className}`}>
      <Image
        src={wordmark}
        alt="WebTrak"
        width={wordmark.width}
        height={wordmark.height}
        priority={variant === "login"}
        unoptimized
        className={`${imgClass} object-contain object-center mix-blend-multiply`}
      />
    </div>
  );
}
