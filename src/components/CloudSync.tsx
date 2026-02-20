"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useTripStore } from "@/stores/trip-store";

export default function CloudSync() {
  const { hasSynced, syncWithCloud } = useTripStore();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === "/login") return;
    if (hasSynced) return;

    syncWithCloud();
  }, [pathname, hasSynced, syncWithCloud]);

  return null;
}
