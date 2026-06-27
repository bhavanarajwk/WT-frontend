"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollableTable } from "@/components/dashboard/ui/ScrollableTable";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  WT_STICKY_TABLE_HEAD_CLASS,
  WtTable,
} from "@/components/dashboard/ui/wtTable";
import { FormSection } from "@/components/dashboard/ui/FormSection";
import { ListPagination } from "@/components/dashboard/ui/ListPagination";
import { LeaveRequestStatusBadge } from "@/components/dashboard/leave/LeaveRequestStatusBadge";
import { UserRequestRejectDialog } from "@/components/dashboard/leave/UserRequestRejectDialog";
import { usePrimaryManagerLeaveInbox } from "@/hooks/leave/usePrimaryManagerLeaveInbox";
import { useClientPagination } from "@/hooks/useClientPagination";
import { formatUserRequestTypeLabel, userRequestActionLabel } from "@/utils/actionToast";
import { formatLeaveDateRange, formatLeaveDaysCount } from "@/utils/leaveRequestDisplay";
import { canPrimaryManagerActOnLeave } from "@/utils/leaveManagerDisplay";
import { requestFinalStatus, updateUserRequestStatus } from "@/utils/userRequest";

function employeeDisplayName(row: Record<string, unknown>): string {
  return (
    String(
      row.employee_display ??
        row.employee_name ??
        row.employeeName ??
        row.name ??
        row.emp_email ??
        row.empEmail ??
        row.email ??
        "—"
    ).trim() || "—"
  );
}

function requestIdFromRow(row: Record<string, unknown>): string {
  return String(
    row.user_request_id ??
      row.userRequestId ??
      row.request_id ??
      row.requestId ??
      row.id ??
      ""
  ).trim();
}

export function LeaveApprovalsPanel({
  actorEmail,
  actionLoading,
  runAction,
}: {
  actorEmail: string;
  actionLoading: boolean;
  runAction: (label: string, fn: () => Promise<unknown>) => Promise<void>;
}) {
  const inboxQ = usePrimaryManagerLeaveInbox(actorEmail, Boolean(actorEmail));
  const [search, setSearch] = useState("");
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [pendingReject, setPendingReject] = useState<{
    requestId: string;
    requestType: unknown;
  } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return inboxQ.rows;
    return inboxQ.rows.filter((row) => {
      const haystack = [
        employeeDisplayName(row),
        row.request_from_date,
        row.requestFromDate,
        row.request_to_date,
        row.requestToDate,
        row.request_type,
        row.requestType,
        requestFinalStatus(row),
        row.comments,
      ]
        .map((value) => String(value ?? "").toLowerCase())
        .join(" ");
      return haystack.includes(q);
    });
  }, [inboxQ.rows, search]);

  const pagination = useClientPagination(filteredRows, {
    resetKeys: [search, inboxQ.dataUpdatedAt],
  });

  const pendingCount = useMemo(
    () => inboxQ.rows.filter((row) => requestFinalStatus(row) === "PENDING").length,
    [inboxQ.rows]
  );

  async function refreshInbox() {
    await inboxQ.refetch();
  }

  function openRejectDialog(requestId: string, requestType: unknown) {
    setRejectReason("");
    setPendingReject({ requestId, requestType });
  }

  function closeRejectDialog() {
    setPendingReject(null);
    setRejectReason("");
  }

  async function confirmRejectRequest() {
    if (!pendingReject) return;
    const reason = rejectReason.trim();
    if (!reason) {
      throw new Error("Reason is required when rejecting a request.");
    }
    await updateUserRequestStatus(Number(pendingReject.requestId), "REJECTED", {
      reason,
      requireReasonOnReject: true,
    });
    closeRejectDialog();
    await refreshInbox();
  }

  return (
    <>
      <div className="space-y-4">
        <FormSection title="Leave Approvals" className="rounded-2xl shadow-sm">
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-wt-text-muted">
                Requests where you are listed as a primary approver.
                {pendingCount > 0 ? (
                  <span className="ml-1 font-medium text-amber-800">
                    {pendingCount} pending
                  </span>
                ) : null}
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  type="search"
                  className="input-field h-10 w-full px-3 py-2 text-sm sm:min-w-[240px]"
                  placeholder="Search by employee, date, status..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  aria-label="Search leave approvals"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 shrink-0"
                  disabled={actionLoading || inboxQ.isFetching}
                  onClick={() => void runAction("Refresh leave approvals", refreshInbox)}
                >
                  Refresh
                </Button>
              </div>
            </div>

            <ScrollableTable maxHeightClass="max-h-[min(55vh,420px)]" className="min-h-[240px]">
              <WtTable>
                <TableHeader className={WT_STICKY_TABLE_HEAD_CLASS}>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Employee</TableHead>
                    <TableHead>Date Range</TableHead>
                    <TableHead>Leave Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inboxQ.isLoading ? (
                    Array.from({ length: 4 }).map((_, rowIndex) => (
                      <TableRow key={`approval-skeleton-${rowIndex}`}>
                        {Array.from({ length: 6 }).map((_, colIndex) => (
                          <TableCell key={colIndex} className="px-3 py-2.5">
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : pagination.pageItems.length ? (
                    pagination.pageItems.map((row, idx) => {
                      const rowRecord = row as Record<string, unknown>;
                      const requestId = requestIdFromRow(rowRecord);
                      const fromDate = String(
                        rowRecord.request_from_date ?? rowRecord.requestFromDate ?? ""
                      );
                      const toDate = String(
                        rowRecord.request_to_date ?? rowRecord.requestToDate ?? ""
                      );
                      const isHalfDay = Boolean(
                        rowRecord.is_half_day ?? rowRecord.isHalfDay ?? false
                      );
                      const isUpdating = statusUpdatingId === requestId;
                      const canAct = canPrimaryManagerActOnLeave(rowRecord, actorEmail);

                      return (
                        <TableRow key={`${requestId || "approval"}-${idx}`}>
                          <TableCell className="px-3 py-2.5 whitespace-nowrap">
                            {employeeDisplayName(rowRecord)}
                          </TableCell>
                          <TableCell className="px-3 py-2.5 whitespace-nowrap">
                            {formatLeaveDateRange(fromDate, toDate, isHalfDay)}
                          </TableCell>
                          <TableCell className="px-3 py-2.5 whitespace-nowrap">
                            {formatUserRequestTypeLabel(
                              rowRecord.request_type ?? rowRecord.requestType
                            )}
                          </TableCell>
                          <TableCell className="px-3 py-2.5 whitespace-nowrap">
                            <LeaveRequestStatusBadge status={requestFinalStatus(rowRecord)} />
                          </TableCell>
                          <TableCell className="px-3 py-2.5 whitespace-nowrap tabular-nums">
                            {formatLeaveDaysCount(fromDate, toDate, isHalfDay)}
                          </TableCell>
                          <TableCell className="px-3 py-2.5 text-right">
                            {canAct ? (
                            <div className="inline-flex items-center justify-end gap-1">
                              <Button
                                type="button"
                                variant="outline"
                                size="xs"
                                className="border-emerald-600/30 text-emerald-700 hover:bg-emerald-500/10"
                                disabled={actionLoading || !requestId || isUpdating}
                                onClick={() =>
                                  void runAction(
                                    userRequestActionLabel(
                                      rowRecord.request_type ?? rowRecord.requestType,
                                      "approve"
                                    ),
                                    async () => {
                                      setStatusUpdatingId(requestId);
                                      try {
                                        await updateUserRequestStatus(Number(requestId), "APPROVED", {
                                          requireReasonOnReject: false,
                                        });
                                        await refreshInbox();
                                      } finally {
                                        setStatusUpdatingId(null);
                                      }
                                    }
                                  )
                                }
                              >
                                {isUpdating ? "…" : "Approve"}
                              </Button>
                              <Button
                                type="button"
                                variant="destructive"
                                size="xs"
                                disabled={actionLoading || !requestId || isUpdating}
                                onClick={() =>
                                  openRejectDialog(
                                    requestId,
                                    rowRecord.request_type ?? rowRecord.requestType
                                  )
                                }
                              >
                                Reject
                              </Button>
                            </div>
                            ) : (
                              <span className="text-xs text-wt-text-muted">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow className="hover:bg-transparent">
                      <TableCell
                        colSpan={6}
                        className="h-[220px] text-center align-middle text-sm text-wt-text-muted"
                      >
                        {inboxQ.isError
                          ? "Could not load leave approvals. Try refreshing."
                          : search.trim()
                            ? "No requests match your search."
                            : "No leave requests assigned to you for approval."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </WtTable>
            </ScrollableTable>

            {pagination.totalItems > 0 ? (
              <ListPagination
                page={pagination.page}
                totalPages={pagination.totalPages}
                totalItems={pagination.totalItems}
                rangeStart={pagination.rangeStart}
                rangeEnd={pagination.rangeEnd}
                pageSize={pagination.pageSize}
                pageSizeOptions={pagination.pageSizeOptions}
                onPageChange={pagination.setPage}
                onPageSizeChange={pagination.setPageSize}
              />
            ) : null}
          </div>
        </FormSection>
      </div>

      <UserRequestRejectDialog
        open={Boolean(pendingReject)}
        title={
          pendingReject
            ? userRequestActionLabel(pendingReject.requestType, "reject")
            : "Reject request"
        }
        description="A reason is required when rejecting a leave request."
        reasonPlaceholder="Enter rejection reason"
        confirmLabel="Reject"
        confirmingLabel="Rejecting…"
        reason={rejectReason}
        onReasonChange={setRejectReason}
        onCancel={closeRejectDialog}
        onConfirm={() =>
          runAction(
            pendingReject
              ? userRequestActionLabel(pendingReject.requestType, "reject")
              : "Reject request",
            confirmRejectRequest
          )
        }
        loading={actionLoading}
      />
    </>
  );
}
