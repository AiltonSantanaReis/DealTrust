import { describe, expect, it } from "vitest";
import { createSlug } from "./slug.js";

describe("createSlug", () => {
  it("normalizes accents, casing and separators", () => {
    expect(createSlug("  Vídeo Games & Consoles  ")).toBe("video-games-consoles");
  });

  it("rejects names that cannot produce a useful slug", () => {
    expect(() => createSlug("!!")).toThrow("Could not create a valid slug.");
  });
});
