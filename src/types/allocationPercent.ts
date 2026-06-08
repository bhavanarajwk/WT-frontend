export type AllocationPercentRow = {
  code: number;
  label: string;
  sortOrder: number;
};

export type AllocationPercentagesData = {
  items: AllocationPercentRow[];
  designation?: string;
  uses_extended_percentages?: boolean;
};
