import { describe, expect, it } from "vitest";
import {
  isSafeLibraryStoragePath,
  validatePublicationAssets,
  validateReadableChapterCount,
} from "@/lib/library-validation";

describe("Library storage path validation", () => {
  it("accepts storage keys inside the intended upload namespace", () => {
    expect(isSafeLibraryStoragePath("documents/books/guide.pdf", "documents/")).toBe(true);
    expect(isSafeLibraryStoragePath("animals/covers/cover.webp", "animals/")).toBe(true);
  });

  it("rejects a mismatched namespace and traversal or control characters", () => {
    expect(isSafeLibraryStoragePath("animals/cover.webp", "documents/")).toBe(false);
    expect(isSafeLibraryStoragePath("documents/../private.pdf", "documents/")).toBe(false);
    expect(isSafeLibraryStoragePath("documents/..\\private.pdf", "documents/")).toBe(false);
    expect(isSafeLibraryStoragePath("documents/guide\n.pdf", "documents/")).toBe(false);
  });
});

describe("Library publication readiness", () => {
  it("requires rights confirmation before publishing", () => {
    expect(validatePublicationAssets({
      publicationType: "chapter_based",
      rightsConfirmed: false,
      hasCompletePdf: false,
    })?.code).toBe("RIGHTS_CONFIRMATION_REQUIRED");
  });

  it("requires a PDF for complete-file and hybrid editions", () => {
    expect(validatePublicationAssets({
      publicationType: "complete_file",
      rightsConfirmed: true,
      hasCompletePdf: false,
    })?.code).toBe("CONTENT_REQUIRED");
    expect(validatePublicationAssets({
      publicationType: "hybrid",
      rightsConfirmed: true,
      hasCompletePdf: false,
    })?.code).toBe("CONTENT_REQUIRED");
  });

  it("allows a chapter-based publication without a PDF", () => {
    expect(validatePublicationAssets({
      publicationType: "chapter_based",
      rightsConfirmed: true,
      hasCompletePdf: false,
    })).toBeNull();
  });

  it("requires readable text chapters for chapter-based and hybrid editions", () => {
    expect(validateReadableChapterCount("chapter_based", 0)?.code).toBe("CONTENT_REQUIRED");
    expect(validateReadableChapterCount("hybrid", 0)?.code).toBe("CONTENT_REQUIRED");
    expect(validateReadableChapterCount("chapter_based", 1)).toBeNull();
    expect(validateReadableChapterCount("complete_file", 0)).toBeNull();
  });
});
