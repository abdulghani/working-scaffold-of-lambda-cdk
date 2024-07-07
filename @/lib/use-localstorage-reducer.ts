import { Action } from "@/constants/action";
import { Reducer, useDeferredValue, useMemo, useReducer } from "react";

function getStoreKey(key: string) {
  return `@${key}-${import.meta.env.VITE_BUILD_ID || "default"}`;
}

export function extendReducer(reducer: any) {
  return (state: any, action: Action) => {
    if (action.type === "_SET_INITIAL_STATE") {
      return action.data;
    }
    return reducer(state, action);
  };
}

export function useLocalStorageReducer<S>(
  key: string,
  reducer: Reducer<S, Action>,
  initialState: S
): [S, (action: Action) => void] {
  const [state, dispatch] = useReducer(reducer, initialState);
  const storeKey = useMemo(() => getStoreKey(key), [key]);
  const shouldUpdate = useDeferredValue(state);

  return [state, dispatch];
}
