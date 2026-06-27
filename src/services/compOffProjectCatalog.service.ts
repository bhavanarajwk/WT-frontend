import { hrmsService } from "@/services/hrms.service";
import { toPagedRows } from "@/utils/apiRows";
import { buildProfileAssignedProjects } from "@/utils/dashboard/projects";
import {
  buildCompOffProjectOptions,
  buildCompOffProjectOptionsFromAssignedProjects,
  type CompOffProjectOption,
} from "@/utils/compOffProjects";
import {
  accountManagerEmailFromRow,
  accountManagerUserIdFromRow,
  buildUserIdEmailMap,
  deepFindManagerContact,
  emailFromUserId,
  emailFromUserRecord,
  projectManagerEmailFromAllocationRows,
  rowMatchesProjectCode,
  unwrapApiData,
} from "@/utils/compOffUserMap";

async function lookupUserEmailById(userId: string, userMap: Map<string, string>): Promise<string> {
  const id = userId.trim();
  if (!id) return "";
  const cached = emailFromUserId(id, userMap);
  if (cached) return cached;

  for (const empId of [id, id.replace(/^0+/, "") || id]) {
    try {
      const res = await hrmsService.getUser({ empId });
      const record = unwrapApiData(res.data ?? res);
      const email = emailFromUserRecord(record);
      if (email.includes("@")) return email.toLowerCase();
    } catch {
      /* try next */
    }
  }
  return "";
}

async function resolveEmailsForUserIds(
  ids: string[],
  baseMap: Map<string, string>
): Promise<Map<string, string>> {
  const map = new Map(baseMap);
  const missing = ids.filter((id) => id && !map.has(id));
  if (!missing.length) return map;
  const results = await Promise.all(
    missing.map(async (id) => [id, await lookupUserEmailById(id, map)] as const)
  );
  for (const [id, email] of results) {
    if (email) map.set(id, email);
  }
  return map;
}

async function fetchProjectAllocationRows(
  projectCode: string
): Promise<Array<Record<string, unknown>>> {
  try {
    const res = await hrmsService.getAllocations({
      projectCode,
      page: "0",
      size: "200",
    });
    return toPagedRows(res.data ?? res);
  } catch {
    return [];
  }
}

function extractFirstEmail(input: unknown): string {
  if (typeof input === "string") {
    const v = input.trim().toLowerCase();
    return v.includes("@") ? v : "";
  }
  if (Array.isArray(input)) {
    for (const item of input) {
      const email = extractFirstEmail(item);
      if (email) return email;
    }
    return "";
  }
  if (input && typeof input === "object") {
    const row = input as Record<string, unknown>;
    const direct = accountManagerEmailFromRow(row);
    if (direct) return direct;
    for (const value of Object.values(row)) {
      const email = extractFirstEmail(value);
      if (email) return email;
    }
  }
  return "";
}

async function fetchManagerEmailByProjectName(projectName: string): Promise<string> {
  const name = projectName.trim();
  if (!name) return "";
  try {
    const res = await hrmsService.getProjectManagerEmails(name);
    return extractFirstEmail((res as { data?: unknown }).data ?? res);
  } catch {
    return "";
  }
}

/** Primary lookup: GET /project?projectCode= (works for employees on their projects). */
async function fetchManagerEmailFromProjectApi(
  projectCode: string,
  userMap: Map<string, string>
): Promise<string> {
  const code = projectCode.trim();
  if (!code) return "";
  try {
    const res = await hrmsService.getProjectByCode(code);
    const record = unwrapApiData(res.data ?? res);
    if (!record) return "";

    const direct = accountManagerEmailFromRow(record);
    if (direct) return direct;

    const contact = deepFindManagerContact(record);
    if (contact.email) return contact.email.toLowerCase();
    if (contact.userId) {
      const email = await lookupUserEmailById(contact.userId, userMap);
      if (email) return email;
    }

    const amId = accountManagerUserIdFromRow(record);
    if (amId) {
      const email = await lookupUserEmailById(amId, userMap);
      if (email) return email;
    }
  } catch {
    /* project lookup may be restricted for some roles */
  }
  return "";
}

async function resolveManagerEmailForProjectCode(
  projectCode: string,
  projectName: string,
  assignedRows: Array<Record<string, unknown>>,
  allocationRows: Array<Record<string, unknown>>,
  userMap: Map<string, string>
): Promise<string> {
  const code = projectCode.trim();
  if (!code) return "";

  const allRows = [...assignedRows, ...allocationRows];
  for (const row of allRows) {
    if (!rowMatchesProjectCode(row, code)) continue;
    const direct = accountManagerEmailFromRow(row);
    if (direct) return direct;
    const amId = accountManagerUserIdFromRow(row);
    if (amId) {
      const email = emailFromUserId(amId, userMap) || (await lookupUserEmailById(amId, userMap));
      if (email) return email;
    }
    const nested = deepFindManagerContact(row);
    if (nested.email) return nested.email.toLowerCase();
    if (nested.userId) {
      const email = await lookupUserEmailById(nested.userId, userMap);
      if (email) return email;
    }
  }

  const fromMyAlloc = projectManagerEmailFromAllocationRows(code, allocationRows);
  if (fromMyAlloc) return fromMyAlloc;

  const fromProjectApi = await fetchManagerEmailFromProjectApi(code, userMap);
  if (fromProjectApi) return fromProjectApi;

  const fromProjectNameApi = await fetchManagerEmailByProjectName(projectName);
  if (fromProjectNameApi) return fromProjectNameApi;

  const allocRows = await fetchProjectAllocationRows(code);
  const fromTeamAlloc = projectManagerEmailFromAllocationRows(code, allocRows);
  if (fromTeamAlloc) return fromTeamAlloc;

  for (const row of allocRows) {
    const direct = accountManagerEmailFromRow(row);
    if (direct) return direct;
    const amId = accountManagerUserIdFromRow(row);
    if (amId) {
      const email = await lookupUserEmailById(amId, userMap);
      if (email) return email;
    }
  }

  return "";
}

export type CompOffProjectCatalog = {
  options: CompOffProjectOption[];
  assignedRows: Array<Record<string, unknown>>;
  allocationRows: Array<Record<string, unknown>>;
  userIdToEmail: Map<string, string>;
};

export async function loadCompOffProjectCatalog(): Promise<CompOffProjectCatalog> {
  const [assignedRes, allocationRes, onboardRes] = await Promise.allSettled([
    hrmsService.getAssignedProjects(),
    hrmsService.getMyAllocations(),
    hrmsService.getOnboardList({ page: "0", size: "500" }),
  ]);

  const assignedPayload =
    assignedRes.status === "fulfilled" ? assignedRes.value.data ?? assignedRes.value : null;
  const allocationPayload =
    allocationRes.status === "fulfilled" ? allocationRes.value.data ?? allocationRes.value : null;

  const assignedRows = buildProfileAssignedProjects(assignedPayload, allocationPayload);
  const allocationRows = toPagedRows(allocationPayload);
  const onboardRows =
    onboardRes.status === "fulfilled"
      ? toPagedRows((onboardRes.value as { data?: unknown }).data ?? onboardRes.value)
      : [];

  const allRows = [...assignedRows, ...allocationRows];
  let userMap = buildUserIdEmailMap([...onboardRows, ...allRows]);

  const userIdsToResolve = new Set<string>();
  for (const row of allRows) {
    const contact = deepFindManagerContact(row);
    if (contact.userId) userIdsToResolve.add(contact.userId);
  }
  userMap = await resolveEmailsForUserIds([...userIdsToResolve], userMap);

  // Primary source: GET /api/v1/project-assigned-to-user (current employee's projects).
  let options = buildCompOffProjectOptionsFromAssignedProjects(assignedRows, userMap);
  if (!options.length) {
    options = buildCompOffProjectOptions(assignedRows, allocationRows, userMap);
  }

  const enriched = await Promise.allSettled(
    options.map(async (opt) => {
      let managerEmail = opt.managerEmail;
      if (!managerEmail) {
        managerEmail = await resolveManagerEmailForProjectCode(
          opt.code,
          opt.name,
          assignedRows,
          allocationRows,
          userMap
        );
      }
      return { ...opt, managerEmail: managerEmail.toLowerCase() };
    })
  );

  const resolvedOptions = enriched.map((result, index) =>
    result.status === "fulfilled" ? result.value : options[index]
  );

  return { options: resolvedOptions, assignedRows, allocationRows, userIdToEmail: userMap };
}

export async function resolveCompOffManagerEmail(
  projectCode: string,
  catalog: CompOffProjectCatalog
): Promise<string> {
  const code = projectCode.trim();
  if (!code) return "";
  const cached = catalog.options.find((p) => p.code.toLowerCase() === code.toLowerCase());
  if (cached?.managerEmail) return cached.managerEmail;

  return resolveManagerEmailForProjectCode(
    code,
    cached?.name ?? code,
    catalog.assignedRows,
    catalog.allocationRows,
    catalog.userIdToEmail
  );
}
