import { afterEach, describe, expect, it, vi } from "vitest";
import { mockToolsEnabled } from "../mock-tools";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("mockToolsEnabled", () => {
  it("defaults on outside production", () => {
    vi.stubEnv("NEXT_PUBLIC_MOCK_TOOLS", "");
    vi.stubEnv("NODE_ENV", "development");
    expect(mockToolsEnabled()).toBe(true);
  });

  it("defaults off in production builds", () => {
    vi.stubEnv("NEXT_PUBLIC_MOCK_TOOLS", "");
    vi.stubEnv("NODE_ENV", "production");
    expect(mockToolsEnabled()).toBe(false);
  });

  it("honors an explicit flag either way", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_MOCK_TOOLS", "1");
    expect(mockToolsEnabled()).toBe(true);
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_MOCK_TOOLS", "0");
    expect(mockToolsEnabled()).toBe(false);
  });
});
