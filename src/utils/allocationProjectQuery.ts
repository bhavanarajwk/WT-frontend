/** Build query for GET /allocation/project-employees (projectId or projectCode). */
export function buildAllocationProjectEmployeesQuery(
  projectKey: string,
  search?: string
): Record<string, string> {
  const key = projectKey.trim();
  const query: Record<string, string> = {};
  if (!key) return query;
  if (/^\d+$/.test(key)) {
    query.projectId = key;
  } else {
    query.projectCode = key;
  }
  if (search?.trim()) query.search = search.trim();
  return query;
}
