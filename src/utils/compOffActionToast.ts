export function compOffEarnActionLabel(
  action: "submit" | "update" | "revoke" | "approve" | "reject"
): string {
  switch (action) {
    case "submit":
      return "Submit comp-off earn request";
    case "update":
      return "Update comp-off earn request";
    case "revoke":
      return "Revoke comp-off earn request";
    case "approve":
      return "Approve comp-off earn request";
    case "reject":
      return "Reject comp-off earn request";
  }
}

export function compOffUsageActionLabel(
  action: "submit" | "update" | "revoke" | "approve" | "reject"
): string {
  switch (action) {
    case "submit":
      return "Submit comp-off usage request";
    case "update":
      return "Update comp-off usage request";
    case "revoke":
      return "Revoke comp-off usage request";
    case "approve":
      return "Approve comp-off usage request";
    case "reject":
      return "Reject comp-off usage request";
  }
}

export function compOffTeamReviewActionLabel(
  flow: "COMP_OFF_EARN" | "COMP_OFF",
  action: "approve" | "reject" | "fetch"
): string {
  if (action === "fetch") return "Refresh team comp-off requests";
  if (flow === "COMP_OFF_EARN") {
    return compOffEarnActionLabel(action);
  }
  return compOffUsageActionLabel(action);
}

export function compOffRejectMessage(options: {
  hasHrAccess: boolean;
  managerOnlyReview: boolean;
}): string {
  if (options.hasHrAccess) return "Rejected by HR";
  if (options.managerOnlyReview) return "Rejected by manager";
  return "Rejected";
}
