/**
 * Dev toolbar, /__dev pages and /api/__dev endpoints are gated by
 * NEXT_PUBLIC_MOCK_TOOLS. Unset means on in development, off in production
 * builds (spec §7).
 */
export function mockToolsEnabled(): boolean {
  const flag = process.env.NEXT_PUBLIC_MOCK_TOOLS;
  if (flag === undefined || flag === "") return process.env.NODE_ENV !== "production";
  return flag === "1";
}
