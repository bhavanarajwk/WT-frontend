"use client";

import type { ReactNode } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardToolbar,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/dashboard/ui/EmptyState";
import { TableRowsSkeleton } from "@/components/dashboard/ui/SectionSkeleton";
import {
  CARD_CONTENT_BELOW_TOOLBAR_CLASS,
  CARD_CONTENT_STACK_CLASS,
  CARD_TOOLBAR_INNER_CLASS,
  CONTENT_CARD_CLASS,
} from "@/components/dashboard/ui/uiLayout";
import { UI_COPY } from "@/constants/uiCopy";
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
    <Card className={cn("p-0", CONTENT_CARD_CLASS, className)}>
      <CardHeader className="flex flex-col gap-3 space-y-0 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-6 sm:py-5">
        <div className="min-w-0 flex-1">
          <CardTitle>{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </div>
        {headerAction ? <div className="shrink-0">{headerAction}</div> : null}
      </CardHeader>

      <Separator />

      {hasToolbar ? (
        <CardToolbar>
          {toolbar ?? (
            <div className={CARD_TOOLBAR_INNER_CLASS}>
              {search ? <div className="min-w-0 flex-1">{search}</div> : null}
              {filters ? (
                <div className="flex flex-wrap items-end justify-start gap-3 sm:justify-end">
                  {filters}
                </div>
              ) : null}
            </div>
          )}
        </CardToolbar>
      ) : null}

      <CardContent className={hasToolbar ? CARD_CONTENT_BELOW_TOOLBAR_CLASS : undefined}>
        <div className={CARD_CONTENT_STACK_CLASS}>{children}</div>
      </CardContent>
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
  emptyTitle = UI_COPY.noRecordsFound,
  emptyDescription = UI_COPY.adjustFilters,
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
