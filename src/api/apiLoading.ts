import type { HttpClient } from "@/api/httpClient";

type Listener = (inflight: number) => void;

let inflight = 0;
const listeners = new Set<Listener>();
let attached = false;

function notify() {
  listeners.forEach((listener) => listener(inflight));
}

function begin() {
  inflight += 1;
  notify();
}

function end() {
  inflight = Math.max(0, inflight - 1);
  notify();
}

export function getApiInflightCount() {
  return inflight;
}

export function subscribeApiLoading(listener: Listener) {
  listeners.add(listener);
  listener(inflight);
  return () => {
    listeners.delete(listener);
  };
}

/** Track in-flight HTTP requests (telemetry only — no global UI overlay). */
export function attachApiLoadingTelemetry(_client: HttpClient) {
  if (attached) return;
  attached = true;
  // Intentionally no-op: page UI must not block on background API calls.
}
