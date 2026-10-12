export type LibraryPublicationType = "complete_file" | "chapter_based" | "hybrid";

export type LibraryValidationFailure = {
  code: "RIGHTS_CONFIRMATION_REQUIRED" | "CONTENT_REQUIRED";
  message: string;
};

/** Accept only storage keys created in the expected upload namespace. */
export function isSafeLibraryStoragePath(value: string, prefix: "documents/" | "animals/"): boolean {
  const parts = value.split("/");
  return value.startsWith(prefix)
    && !value.includes(String.fromCharCode(92))
    && parts.every((part) =>
      part.length > 0
      && part !== "."
      && part !== ".."
      && !Array.from(part).some((char) => char.charCodeAt(0) < 32),
    );
}

/** Validates the rights and complete-file prerequisites for a publication. */
export function validatePublicationAssets(input: {
  publicationType: LibraryPublicationType;
  rightsConfirmed: boolean;
  hasCompletePdf: boolean;
}): LibraryValidationFailure | null {
  if (!input.rightsConfirmed) {
    return {
      code: "RIGHTS_CONFIRMATION_REQUIRED",
      message: "Confirm publication rights before publishing",
    };
  }

  if ((input.publicationType === "complete_file" || input.publicationType === "hybrid") && !input.hasCompletePdf) {
    return {
      code: "CONTENT_REQUIRED",
      message: "Upload a supported PDF edition before publishing this publication type",
    };
  }

  return null;
}

/** Chapter-based and hybrid publications must contain readable text chapters. */
export function validateReadableChapterCount(
  publicationType: LibraryPublicationType,
  publishedRichTextChapterCount: number,
): LibraryValidationFailure | null {
  if (
    (publicationType === "chapter_based" || publicationType === "hybrid")
    && publishedRichTextChapterCount < 1
  ) {
    return {
      code: "CONTENT_REQUIRED",
      message: "Add at least one published, readable text chapter before publishing",
    };
  }

  return null;
}
