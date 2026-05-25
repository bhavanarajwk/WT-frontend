export const LEARNING_BASE = "/dashboard/learning-development" as const;

/** L&D sidebar — training cards live on the dashboard; no separate Trainings nav item. */
export const learningSubNav = [{ href: `${LEARNING_BASE}`, label: "Dashboard", segment: "" }] as const;
