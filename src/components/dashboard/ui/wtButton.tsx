import type { ComponentProps } from "react";
import { Button, type buttonVariants } from "@/components/ui/button";
import type { VariantProps } from "class-variance-authority";

export { Button, buttonVariants };
export type { VariantProps };

/** Primary WebTrak action — replaces `btn-primary` / `btn-action`. */
export function PrimaryButton(props: ComponentProps<typeof Button>) {
  return <Button variant="brand" {...props} />;
}

/** Secondary outlined action — replaces `btn-secondary` / bordered `btn-ghost`. */
export function SecondaryButton(props: ComponentProps<typeof Button>) {
  return <Button variant="outline" {...props} />;
}

/** Quiet action — replaces plain `btn-ghost` without border emphasis. */
export function GhostButton(props: ComponentProps<typeof Button>) {
  return <Button variant="ghost" {...props} />;
}
