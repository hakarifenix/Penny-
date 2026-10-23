import { useLiveQuery } from "dexie-react-hooks";

/**
 * Reactive Dexie query helper. Returns `initial` while loading (or on error),
 * so components always receive a well-typed value instead of undefined.
 */
export function useLive<T>(
  query: () => Promise<T> | T,
  deps: unknown[],
  initial: T,
): T {
  const value = useLiveQuery(query, deps, initial);
  return value as T;
}
