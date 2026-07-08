"use client";

import { useCallback, useEffect, useState } from "react";
import { getApiKey, setApiKey as persistKey } from "@/lib/apiKey";

/** Reads the on-device Gemini key. `loaded` guards against a false "no key" flash. */
export function useApiKey() {
  const [apiKey, setKey] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    getApiKey().then((k) => {
      if (active) {
        setKey(k);
        setLoaded(true);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const save = useCallback(async (value: string) => {
    await persistKey(value);
    setKey(value.trim());
  }, []);

  return { apiKey, loaded, save };
}
