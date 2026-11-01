"use client";

import { useQuery } from "@tanstack/react-query";
import { parseBrand, type BrandProfile } from "@/lib/brand-defaults";

/** The brand profile from Admin → Brand (public, via /api/settings), with defaults until it loads. */
export function useBrand(): BrandProfile {
  const { data } = useQuery<Record<string, string>>({ queryKey: ["/api/settings"], staleTime: 60_000 });
  return parseBrand(data?.brand_profile);
}
