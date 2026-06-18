"use client";

import { useEffect, useState } from "react";
import { useIsFetching, useIsMutating } from "@tanstack/react-query";
import { subscribeApiLoading } from "@/api/apiLoading";
import { WtLoadingOverlay } from "@/components/dashboard/ui/WtLoader";

export function GlobalLoadingOverlay() {
  const [apiInflight, setApiInflight] = useState(0);
  const queryFetching = useIsFetching();
  const queryMutating = useIsMutating();

  useEffect(() => subscribeApiLoading(setApiInflight), []);

  const visible = apiInflight > 0 || queryFetching > 0 || queryMutating > 0;
  if (!visible) return null;

  return <WtLoadingOverlay />;
}
