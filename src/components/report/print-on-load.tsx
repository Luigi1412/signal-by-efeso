"use client";

import { useEffect } from "react";

/** Opens the browser print dialog once the report has mounted (`?print=1`). */
export function PrintOnLoad() {
  useEffect(() => {
    const id = window.setTimeout(() => window.print(), 400);
    return () => window.clearTimeout(id);
  }, []);

  return null;
}
