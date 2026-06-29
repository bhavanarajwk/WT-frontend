"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FormSection } from "@/components/dashboard/ui/FormSection";
import { InputField, SelectField } from "@/components/dashboard/ui/forms";
import { LeaveBalanceSummary } from "@/components/dashboard/leave/LeaveBalanceSummary";
import { LeaveManagerSelector } from "@/components/dashboard/leave/LeaveManagerSelector";
import { LeaveCcRecipientsNotice } from "@/components/dashboard/leave/LeaveCcRecipientsNotice";
import { LeaveReasonField, WfhReasonField } from "@/components/dashboard/leave/LeaveReasonField";
import { LeaveApprovalsPanel } from "@/components/dashboard/leave/LeaveApprovalsPanel";
import { MyPreviousLeaveRequestsCard } from "@/components/dashboard/leave/MyPreviousLeaveRequestsCard";
import { HrReviewNoticeBanner } from "@/components/hr-review/HrReviewNoticeBanner";
import { SECTION_STACK_CLASS } from "@/components/dashboard/ui/uiLayout";
import { UI_COPY } from "@/constants/uiCopy";
import { formatUserRequestTypeLabel, normalizeUserRequestType } from "@/utils/actionToast";
import { formatLeaveDateRange } from "@/utils/leaveRequestDisplay";
import { requestFinalStatus } from "@/utils/userRequest";
import { pickManagerEmailList } from "@/utils/leaveManagerDisplay";
import { Send } from "lucide-react";
import type { useClientPagination } from "@/hooks/useClientPagination";

type LeaveFormState = {
  request_from_date: string;
  request_to_date: string;
  request_type: string;
  comments: string;
  is_half_day: boolean;
  client_approval: boolean;
};

type Pagination = ReturnType<typeof useClientPagination<Record<string, unknown>>>;

export function EmployeeLeaveRequestsPanel({
  mode,
  leaveRequestForm,
  onFormChange,
  leaveRequestTypeOptions,
  selectedLeaveManagerEmails,
  onManagersChange,
  editingLeaveRequestId,
  requiresClientApproval,
  submitsToHrForReview,
  actionLoading,
  onSubmit,
  onCancelEdit,
  myLeaveSearch,
  onSearchChange,
  myLeaveSortId,
  onSortChange,
  myLeavePagination,
  activeRequests,
  totalFilteredCount,
  myLeaveRequestsLoading,
  onEditRequest,
  onRevokeRequest,
  actorEmail,
  runAction,
}: {
  mode: "leave" | "wfh";
  leaveRequestForm: LeaveFormState;
  onFormChange: (updater: (prev: LeaveFormState) => LeaveFormState) => void;
  leaveRequestTypeOptions: Array<{ value: string; label: string }>;
  selectedLeaveManagerEmails: string[];
  onManagersChange: (emails: string[]) => void;
  editingLeaveRequestId: string;
  requiresClientApproval: boolean;
  submitsToHrForReview: boolean;
  actionLoading: boolean;
  onSubmit: () => void;
  onCancelEdit: () => void;
  myLeaveSearch: string;
  onSearchChange: (value: string) => void;
  myLeaveSortId: string;
  onSortChange: (value: string) => void;
  myLeavePagination: Pagination;
  activeRequests: Array<Record<string, unknown>>;
  totalFilteredCount: number;
  myLeaveRequestsLoading: boolean;
  onEditRequest: (row: Record<string, unknown>) => void;
  onRevokeRequest: (row: Record<string, unknown>) => void;
  actorEmail: string;
  runAction: (label: string, fn: () => Promise<unknown>) => Promise<void>;
}) {
  const [innerTab, setInnerTab] = useState<"new-request" | "my-requests" | "approvals">(
    "new-request"
  );
  const [viewingRequest, setViewingRequest] = useState<Record<string, unknown> | null>(null);
  const isLeave = mode === "leave";
  const showLeaveFields =
    isLeave && normalizeUserRequestType(leaveRequestForm.request_type) === "LEAVE";

  useEffect(() => {
    if (editingLeaveRequestId) {
      setInnerTab("new-request");
    }
  }, [editingLeaveRequestId]);

  useEffect(() => {
    if (!isLeave && innerTab === "approvals") {
      setInnerTab("new-request");
    }
  }, [isLeave, innerTab]);

  const handleView = (row: Record<string, unknown>) => {
    setViewingRequest(row);
  };

  const requestsCard = (
    <MyPreviousLeaveRequestsCard
      rows={activeRequests}
      loading={myLeaveRequestsLoading}
      search={myLeaveSearch}
      onSearchChange={onSearchChange}
      sortId={myLeaveSortId}
      onSortChange={onSortChange}
      pagination={myLeavePagination}
      totalFilteredCount={totalFilteredCount}
      actionLoading={actionLoading}
      onView={handleView}
      onEdit={onEditRequest}
      onRevoke={onRevokeRequest}
    />
  );

  return (
    <div className={SECTION_STACK_CLASS}>
      <Tabs
        value={innerTab}
        onValueChange={(value) =>
          setInnerTab(value as "new-request" | "my-requests" | "approvals")
        }
        className="gap-4"
      >
        <TabsList
          variant="line"
          aria-label="Leave request views"
          className="h-auto w-full justify-start gap-4 rounded-none border-b border-wt-border bg-transparent p-0"
        >
          <TabsTrigger value="new-request" className="rounded-none px-0 pb-3">
            New Request
          </TabsTrigger>
          <TabsTrigger value="my-requests" className="rounded-none px-0 pb-3">
            My Requests
          </TabsTrigger>
          {isLeave ? (
            <TabsTrigger value="approvals" className="rounded-none px-0 pb-3">
              Approvals
            </TabsTrigger>
          ) : null}
        </TabsList>
      </Tabs>

      {innerTab === "new-request" ? (
        <div className={SECTION_STACK_CLASS}>
          {submitsToHrForReview ? <HrReviewNoticeBanner /> : null}
          {showLeaveFields ? <LeaveBalanceSummary /> : null}

          <FormSection title={isLeave ? "New Leave Request" : "New WFH Request"} className="rounded-2xl shadow-sm">
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 xl:items-end">
                {isLeave ? (
                  <SelectField
                    label="Leave Type"
                    required
                    value={leaveRequestForm.request_type}
                    options={leaveRequestTypeOptions}
                    onChange={(value) => onFormChange((prev) => ({ ...prev, request_type: value }))}
                  />
                ) : null}
                <InputField
                  label="From Date"
                  required
                  value={leaveRequestForm.request_from_date}
                  onChange={(value) =>
                    onFormChange((prev) => ({
                      ...prev,
                      request_from_date: value,
                      request_to_date: prev.is_half_day ? value : prev.request_to_date,
                    }))
                  }
                  type="date"
                />
                <InputField
                  label="To Date"
                  required
                  value={
                    leaveRequestForm.is_half_day
                      ? leaveRequestForm.request_from_date
                      : leaveRequestForm.request_to_date
                  }
                  onChange={(value) => {
                    if (leaveRequestForm.is_half_day) return;
                    onFormChange((prev) => ({ ...prev, request_to_date: value }));
                  }}
                  type="date"
                />
                {showLeaveFields ? (
                  <Label className="flex h-10 items-center gap-2 self-end pb-0.5 text-sm font-normal">
                    <Checkbox
                      checked={leaveRequestForm.is_half_day}
                      onCheckedChange={(checked) => {
                        onFormChange((prev) => ({
                          ...prev,
                          is_half_day: Boolean(checked),
                          request_to_date: checked ? prev.request_from_date : prev.request_to_date,
                        }));
                      }}
                    />
                    Half day
                  </Label>
                ) : null}
              </div>

              {requiresClientApproval && (isLeave ? showLeaveFields : true) ? (
                <Label className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm font-normal text-amber-900">
                  <Checkbox
                    className="mt-0.5"
                    checked={leaveRequestForm.client_approval}
                    onCheckedChange={(checked) =>
                      onFormChange((prev) => ({
                        ...prev,
                        client_approval: Boolean(checked),
                      }))
                    }
                  />
                  <span>
                    I confirm client approval for this request (required on active client/staffing
                    projects).
                  </span>
                </Label>
              ) : null}

              {showLeaveFields ? (
                <LeaveManagerSelector
                  selectedEmails={selectedLeaveManagerEmails}
                  onChange={onManagersChange}
                  disabled={actionLoading}
                />
              ) : null}

              {showLeaveFields ? <LeaveCcRecipientsNotice /> : null}

              {isLeave ? (
                <LeaveReasonField
                  value={leaveRequestForm.comments}
                  disabled={actionLoading}
                  onChange={(value) => onFormChange((prev) => ({ ...prev, comments: value }))}
                />
              ) : (
                <WfhReasonField
                  value={leaveRequestForm.comments}
                  disabled={actionLoading}
                  onChange={(value) => onFormChange((prev) => ({ ...prev, comments: value }))}
                />
              )}

              <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 px-5"
                  disabled={actionLoading}
                  onClick={onCancelEdit}
                >
                  {UI_COPY.cancel}
                </Button>
                <Button
                  type="button"
                  variant="brand"
                  className="h-10 gap-2 px-6"
                  disabled={actionLoading}
                  onClick={onSubmit}
                >
                  {!actionLoading ? <Send className="size-4" aria-hidden /> : null}
                  {actionLoading
                    ? editingLeaveRequestId
                      ? "Saving..."
                      : "Submitting..."
                    : editingLeaveRequestId
                      ? UI_COPY.saveChanges
                      : isLeave
                        ? "Submit Leave Request"
                        : "Submit WFH Request"}
                </Button>
              </div>
            </div>
          </FormSection>
        </div>
      ) : innerTab === "my-requests" ? (
        <div className={SECTION_STACK_CLASS}>
          {showLeaveFields ? <LeaveBalanceSummary /> : null}
          {requestsCard}
        </div>
      ) : (
        <LeaveApprovalsPanel
          actorEmail={actorEmail}
          actionLoading={actionLoading}
          runAction={runAction}
        />
      )}

      {viewingRequest ? (
        <FormSection title="Request Details" className="rounded-2xl shadow-sm">
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-wt-text-muted">Date Range</dt>
              <dd className="font-medium">
                {formatLeaveDateRange(
                  viewingRequest.request_from_date ?? viewingRequest.requestFromDate,
                  viewingRequest.request_to_date ?? viewingRequest.requestToDate,
                  Boolean(viewingRequest.is_half_day ?? viewingRequest.isHalfDay)
                )}
              </dd>
            </div>
            <div>
              <dt className="text-wt-text-muted">Leave Type</dt>
              <dd className="font-medium">
                {formatUserRequestTypeLabel(
                  viewingRequest.request_type ?? viewingRequest.requestType
                )}
              </dd>
            </div>
            <div>
              <dt className="text-wt-text-muted">Status</dt>
              <dd className="font-medium">{requestFinalStatus(viewingRequest)}</dd>
            </div>
            <div>
              <dt className="text-wt-text-muted">Primary managers</dt>
              <dd className="font-medium">
                {pickManagerEmailList(viewingRequest, "primary").join(", ") || "—"}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-wt-text-muted">Reason</dt>
              <dd className="font-medium whitespace-pre-wrap">{String(viewingRequest.comments ?? "—")}</dd>
            </div>
          </dl>
          <div className="mt-4 flex justify-end">
            <Button type="button" variant="outline" onClick={() => setViewingRequest(null)}>
              Close
            </Button>
          </div>
        </FormSection>
      ) : null}
    </div>
  );
}
