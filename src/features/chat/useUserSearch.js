import { useEffect, useState } from "react";
import { useDebounce } from "../../hooks/useDebounce";
import { searchUsers } from "./chatApi";

const MIN_CHARS = 2;

/** Debounced, cancellable people search. */
export function useUserSearch(query) {
  const term = useDebounce(query.trim(), 250);
  const [state, setState] = useState({ results: [], loading: false, error: false });

  useEffect(() => {
    if (term.length < MIN_CHARS) {
      setState({ results: [], loading: false, error: false });
      return undefined;
    }
    const controller = new AbortController();
    setState((s) => ({ ...s, loading: true, error: false }));
    searchUsers(term, controller.signal)
      .then((results) => setState({ results, loading: false, error: false }))
      .catch((err) => {
        if (err.code !== "ERR_CANCELED") setState({ results: [], loading: false, error: true });
      });
    return () => controller.abort();
  }, [term]);

  return { ...state, term, tooShort: query.trim().length < MIN_CHARS };
}
