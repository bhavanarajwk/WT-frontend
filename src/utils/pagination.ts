export type PaginationToken = number | "ellipsis";

/** Zero-based page indexes for clickable pagination controls. */
export function buildPaginationTokens(page: number, totalPages: number): PaginationToken[] {
  if (totalPages <= 0) return [];
  if (totalPages === 1) return [0];
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index);
  }

  const lastPage = totalPages - 1;
  const tokens: PaginationToken[] = [0];
  const start = Math.max(1, page - 1);
  const end = Math.min(lastPage - 1, page + 1);

  if (start > 1) {
    tokens.push("ellipsis");
  } else {
    for (let index = 1; index < start; index += 1) {
      tokens.push(index);
    }
  }

  for (let index = start; index <= end; index += 1) {
    tokens.push(index);
  }

  if (end < lastPage - 1) {
    tokens.push("ellipsis");
  } else {
    for (let index = end + 1; index < lastPage; index += 1) {
      tokens.push(index);
    }
  }

  tokens.push(lastPage);
  return tokens;
}
