/**
 * The file types StudyVault accepts, by kind. The server uses this list to allow uploads,
 * and the browser uses it to filter the file picker, so the two can never disagree.
 */
export const FILE_TYPES = {
  doc: [".docx", ".xlsx", ".xls", ".pptx", ".pdf", ".csv", ".txt", ".md", ".html", ".htm", ".json", ".xml", ".epub"],
  image: [".png", ".jpg", ".jpeg", ".gif", ".webp"],
  video: [".mp4", ".webm", ".mov", ".m4v"],
  audio: [".mp3", ".wav", ".m4a", ".ogg"],
} as const;

export type FileKind = keyof typeof FILE_TYPES; // "doc" | "image" | "video" | "audio"

/** Every allowed extension, e.g. for <input accept="..."> */
export const ALL_EXTENSIONS: readonly string[] = Object.values(FILE_TYPES).flat();
