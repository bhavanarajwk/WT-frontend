"use client";

import { Button } from "@/components/ui/button";
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
import { useCallback, useEffect, useState } from "react";
import { hrmsService, type LeaveBalancesListItem } from "@/services/hrms.service";
import { InputField } from "@/components/dashboard/ui/forms";
import { ListPagination } from "@/components/dashboard/ui/ListPagination";

export function HrLeaveBalancesPanel({
  actionLoading,
  runAction,
}: {
  actionLoading: boolean;
  runAction: (label: string, fn: () => Promise<void>) => void;
}) {
  const now = new Date();
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [rows, setRows] = useState<LeaveBalancesListItem[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    const res = await hrmsService.getLeaveBalancesList({
      page,
      size: pageSize,
      search: search.trim() || undefined,
      year: Number(year) || undefined,
      month: Number(month) || undefined,
    });
    const data = res.data;
    setRows(data?.items ?? []);
    setTotalPages(Math.max(1, data?.total_pages ?? 1));
    setTotalElements(data?.total_elements ?? 0);
  }, [page, pageSize, search, year, month]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void load().catch((err) => {
        setRows([]);
        setLoadError(err instanceof Error ? err.message : "Could not load leave balances.");
      });
    }, 0);
    return () => window.clearTimeout(id);
  }, [load]);

  const rangeStart = totalElements ? page * pageSize + 1 : 0;
  const rangeEnd = Math.min(totalElements, (page + 1) * pageSize);

  return (
    <section className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5 space-y-4">
      <div>
        <h3 className="font-semibold">Leave Balances</h3>
        <p className="text-sm text-wt-text-muted mt-1">
          Organization leave and comp-off balances by month (HR / Admin).
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <InputField label="Year" value={year} onChange={setYear} type="number" />
        <InputField label="Month" value={month} onChange={setMonth} type="number" />
        <InputField label="Search" value={search} onChange={setSearch} placeholder="Name, email, emp id" />
        <Button variant="brand" type="button" className="px-3 py-2 h-10" disabled={actionLoading} onClick={() =>
            runAction("Load leave balances", async () => {
              setPage(0);
              await load();
            })
          }
        >
          Search
        </Button>
      </div>

      {loadError ? <p className="text-sm text-rose-700">{loadError}</p> : null}

      {rows.length ? (
        <ScrollableTable maxHeightClass="max-h-[min(60vh,480px)]">
          <WtTable>
            <TableHeader className={WT_STICKY_TABLE_HEAD_CLASS}>
              <TableRow className="hover:bg-transparent">
                <TableHead>Emp ID</TableHead>
                <TableHead>Primary</TableHead>
                <TableHead>Secondary</TableHead>
                <TableHead>Carry forward</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Comp-off</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, idx) => (
                <TableRow key={`${row.emp_id}-${idx}`}>
                  <TableCell className="px-3 py-2 whitespace-nowrap">{row.emp_id}</TableCell>
                  <TableCell className="px-3 py-2 tabular-nums">{row.leave?.primary ?? "—"}</TableCell>
                  <TableCell className="px-3 py-2 tabular-nums">{row.leave?.secondary ?? "—"}</TableCell>
                  <TableCell className="px-3 py-2 tabular-nums">{row.leave?.carry_forward ?? "—"}</TableCell>
                  <TableCell className="px-3 py-2 tabular-nums">{row.leave?.total ?? "—"}</TableCell>
                  <TableCell className="px-3 py-2 tabular-nums">{row.comp_off_balance ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </WtTable>
        </ScrollableTable>
      ) : (
        <p className="text-sm text-wt-text-muted">No balance records for the selected filters.</p>
      )}

      {totalElements > 0 ? (
        <ListPagination
          page={page + 1}
          totalPages={totalPages}
          totalItems={totalElements}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          pageSize={pageSize}
          pageSizeOptions={[25, 50, 100]}
          onPageChange={(p) => setPage(Math.max(0, p - 1))}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(0);
          }}
        />
      ) : null}
    </section>
  );
}
