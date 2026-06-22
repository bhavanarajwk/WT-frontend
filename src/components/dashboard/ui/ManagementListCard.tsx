"use client";

import type { ReactNode } from "react";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/dashboard/ui/EmptyState";
import { TableRowsSkeleton } from "@/components/dashboard/ui/SectionSkeleton";
import { cn } from "@/lib/utils";

type ManagementListCardProps = {
  title: string;
  description?: string;
  headerAction?: ReactNode;
  toolbar?: ReactNode;
  search?: ReactNode;
  filters?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function ManagementListCard({
  title,
  description,
  headerAction,
  toolbar,
  search,
  filters,
  children,
  className,
}: ManagementListCardProps) {
  const hasToolbar = Boolean(toolbar || search || filters);

  return (
    <Card className={cn("p-0", className)}>
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div className="min-w-0 flex-1">
          <CardTitle>{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </div>
        {headerAction ? <div className="shrink-0">{headerAction}</div> : null}
      </CardHeader>

      {hasToolbar ? (
        <>
          <Separator />
          <div className="px-6 py-4">
            {toolbar ?? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                {search ? <div className="min-w-0 flex-1">{search}</div> : null}
                {filters ? (
                  <div className="flex flex-wrap items-end justify-start gap-2 sm:justify-end">
                    {filters}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </>
      ) : (
        <Separator />
      )}

      <div className="p-6">{children}</div>
    </Card>
  );
}

type ManagementListContentProps = {
  isLoading: boolean;
  isEmpty: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: ReactNode;
  skeletonRows?: number;
  skeletonColumns?: number;
  children: ReactNode;
};

export function ManagementListContent({
  isLoading,
  isEmpty,
  emptyTitle = "No Records Found",
  emptyDescription = "Try adjusting your search or filters.",
  emptyIcon,
  skeletonRows = 8,
  skeletonColumns = 4,
  children,
}: ManagementListContentProps) {
  if (isLoading) {
    return <TableRowsSkeleton rows={skeletonRows} columns={skeletonColumns} />;
  }

  if (isEmpty) {
    return (
      <EmptyState title={emptyTitle} description={emptyDescription} icon={emptyIcon} />
    );
  }

  return <>{children}</>;
}
