export type HrTimelogEmployee = {
  email: string;
  label: string;
};

export type HrMonthlyTimelogRow = {
  email: string;
  label: string;
  hoursByWeek: Record<string, number>;
};
