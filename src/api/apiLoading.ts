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

/** Track in-flight HTTP requests for the global loading overlay. */
export function attachApiLoadingTelemetry(client: HttpClient) {
  if (attached) return;
  attached = true;

  client.useRequest((url, init) => {
    begin();
    return { url, init };
  });

  client.useResponse((response) => {
    end();
    return response;
  });

  client.useError((error) => {
    end();
    throw error;
  });
}
