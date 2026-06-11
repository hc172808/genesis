/**
 * Heuristic virus / malicious-content scanner for client-side uploads.
 *
 * Performs fast, deterministic checks before any file is accepted:
 *   1. Size limits (per-category)
 *   2. MIME type whitelist
 *   3. Magic-byte / extension consistency check (prevents .exe disguised as .png)
 *   4. EICAR test-string detection (industry standard "fake virus")
 *   5. Embedded-script detection in images
 *   6. Suspicious patterns in HTML/JS (eval, document.write of base64, iframes to data:)
 *   7. Embedded executables (PE/ELF/Mach-O headers)
 *   8. ZIP-bomb canary (compressed archives masquerading as docs/images)
 *
 * Returns a ScanResult; callers MUST reject any result where `safe === false`.
 *
 * No external network calls — fully offline.
 */

export type ScanCategory = "image" | "html" | "any";

export interface ScanResult {
  safe: boolean;
  threats: string[];
  warnings: string[];
  fileName: string;
  fileSize: number;
  mimeType: string;
  scanDurationMs: number;
}

interface ScanOptions {
  category?: ScanCategory;
  maxBytes?: number;
  allowedMime?: string[];
}

// ─── Size defaults ────────────────────────────────────────────
const DEFAULT_MAX_BYTES: Record<ScanCategory, number> = {
  image: 5 * 1024 * 1024, // 5 MB
  html: 10 * 1024 * 1024, // 10 MB
  any: 20 * 1024 * 1024, // 20 MB
};

// ─── MIME whitelists ──────────────────────────────────────────
const MIME_WHITELIST: Record<ScanCategory, string[]> = {
  image: ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif", "image/svg+xml"],
  html: ["text/html", "text/css", "text/javascript", "application/javascript", "text/plain"],
  any: [], // empty = allow any (still runs other heuristics)
};

// ─── Magic-byte signatures ────────────────────────────────────
const MAGIC_BYTES: Array<{ ext: string[]; bytes: number[][]; offset?: number }> = [
  { ext: ["png"], bytes: [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]] },
  { ext: ["jpg", "jpeg"], bytes: [[0xff, 0xd8, 0xff]] },
  { ext: ["gif"], bytes: [[0x47, 0x49, 0x46, 0x38]] },
  { ext: ["webp"], bytes: [[0x52, 0x49, 0x46, 0x46]] }, // RIFF + check WEBP at offset 8
  { ext: ["pdf"], bytes: [[0x25, 0x50, 0x44, 0x46]] },
];

// Executable headers — ALWAYS reject
const EXECUTABLE_SIGS: Array<{ name: string; bytes: number[]; offset?: number }> = [
  { name: "PE (Windows .exe/.dll)", bytes: [0x4d, 0x5a] }, // MZ
  { name: "ELF (Linux executable)", bytes: [0x7f, 0x45, 0x4c, 0x46] }, // .ELF
  { name: "Mach-O 32-bit (macOS)", bytes: [0xfe, 0xed, 0xfa, 0xce] },
  { name: "Mach-O 64-bit (macOS)", bytes: [0xfe, 0xed, 0xfa, 0xcf] },
  { name: "Java class file", bytes: [0xca, 0xfe, 0xba, 0xbe] },
  { name: "DEX (Android)", bytes: [0x64, 0x65, 0x78, 0x0a] },
];

// ─── EICAR ─────────────────────────────────────────────────────
// Industry-standard antivirus test string. Real malware never contains it,
// but legitimate AV products always flag it. Used here as a basic verifier.
const EICAR_TEST_STRING =
  "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*";

// ─── Suspicious patterns in text content ──────────────────────
const SUSPICIOUS_PATTERNS: Array<{ pattern: RegExp; threat: string; warningOnly?: boolean }> = [
  { pattern: /eval\s*\(\s*atob\s*\(/i, threat: "Obfuscated script (eval+atob)" },
  { pattern: /document\.write\s*\(\s*unescape\s*\(/i, threat: "Obfuscated DOM injection" },
  { pattern: /<iframe[^>]+src\s*=\s*["']?data:/i, threat: "Data-URI iframe (drive-by injection)" },
  { pattern: /<script[^>]*>\s*[A-Za-z0-9+/=]{200,}/i, threat: "Long base64 blob in script tag" },
  { pattern: /javascript:\s*[^"'\s]{50,}/i, threat: "Long inline javascript: URL" },
  { pattern: /\\x[0-9a-f]{2}(\\x[0-9a-f]{2}){50,}/i, threat: "Hex-encoded shellcode pattern" },
  { pattern: /String\.fromCharCode\s*\([^)]{200,}/i, threat: "Encoded String.fromCharCode payload" },
  // SVG-specific — SVGs can carry scripts
  { pattern: /<svg[^>]*>[\s\S]*<script/i, threat: "Script tag inside SVG" },
  { pattern: /on(load|error|click|mouseover)\s*=\s*["'][^"']*\b(eval|fetch|XMLHttpRequest)\b/i, threat: "Inline event handler with network access" },
  // Warnings
  { pattern: /<script[^>]*src\s*=\s*["']https?:\/\//i, threat: "External script reference", warningOnly: true },
  { pattern: /<form[^>]+action\s*=\s*["']https?:\/\//i, threat: "External form submission", warningOnly: true },
];

// ─── Helpers ──────────────────────────────────────────────────
const fileExtension = (name: string): string =>
  name.split(".").pop()?.toLowerCase() ?? "";

const matchSig = (buf: Uint8Array, sig: number[], offset = 0): boolean => {
  if (buf.length < offset + sig.length) return false;
  return sig.every((b, i) => buf[offset + i] === b);
};

const decodeUtf8 = (buf: Uint8Array): string => {
  try {
    return new TextDecoder("utf-8", { fatal: false }).decode(buf);
  } catch {
    return "";
  }
};

// ─── Main scan ────────────────────────────────────────────────
export const scanFile = async (
  file: File,
  options: ScanOptions = {}
): Promise<ScanResult> => {
  const start = performance.now();
  const category: ScanCategory = options.category ?? "any";
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES[category];
  const allowedMime = options.allowedMime ?? MIME_WHITELIST[category];

  const threats: string[] = [];
  const warnings: string[] = [];

  // 1. Size
  if (file.size === 0) {
    threats.push("Empty file");
  } else if (file.size > maxBytes) {
    threats.push(`File exceeds ${(maxBytes / 1024 / 1024).toFixed(1)} MB limit`);
  }

  // 2. MIME whitelist
  if (allowedMime.length > 0 && !allowedMime.includes(file.type)) {
    threats.push(`Disallowed MIME type: ${file.type || "unknown"}`);
  }

  // Read bytes for deeper checks
  const buf = new Uint8Array(await file.arrayBuffer());

  // 3. Executable headers — instant reject
  for (const sig of EXECUTABLE_SIGS) {
    if (matchSig(buf, sig.bytes, sig.offset)) {
      threats.push(`Executable detected: ${sig.name}`);
      break;
    }
  }

  // 4. Magic-byte vs extension mismatch (only for images)
  if (category === "image") {
    const ext = fileExtension(file.name);
    const sig = MAGIC_BYTES.find((s) => s.ext.includes(ext));
    if (sig) {
      const matches = sig.bytes.some((b) => matchSig(buf, b, sig.offset));
      if (!matches && ext !== "svg") {
        threats.push(`File extension .${ext} does not match content signature`);
      }
    }
    // WEBP needs a second-stage check
    if (ext === "webp" && matchSig(buf, [0x52, 0x49, 0x46, 0x46], 0)) {
      const isWebp = matchSig(buf, [0x57, 0x45, 0x42, 0x50], 8);
      if (!isWebp) threats.push("RIFF container is not WEBP");
    }
  }

  // 5. EICAR test string (textual)
  const text = buf.length < 5 * 1024 * 1024 ? decodeUtf8(buf) : "";
  if (text.includes(EICAR_TEST_STRING)) {
    threats.push("EICAR antivirus test signature");
  }

  // 6. Suspicious patterns (only meaningful for textual / SVG content)
  if (text) {
    for (const { pattern, threat, warningOnly } of SUSPICIOUS_PATTERNS) {
      if (pattern.test(text)) {
        if (warningOnly) warnings.push(threat);
        else threats.push(threat);
      }
    }
  }

  // 7. Embedded script in non-SVG image
  if (category === "image" && file.type !== "image/svg+xml" && text) {
    if (/<script\b/i.test(text) || /<\?php/i.test(text)) {
      threats.push("Script payload embedded in image bytes");
    }
  }

  // 8. ZIP / archive in disguise (PK magic bytes inside non-archive)
  if (matchSig(buf, [0x50, 0x4b, 0x03, 0x04]) && category !== "any") {
    threats.push("ZIP archive disguised as another file type");
  }

  return {
    safe: threats.length === 0,
    threats,
    warnings,
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type,
    scanDurationMs: Math.round(performance.now() - start),
  };
};

/**
 * Convenience wrapper that throws on threat — use in event handlers
 * where you want a single try/catch.
 */
export const scanFileOrThrow = async (
  file: File,
  options?: ScanOptions
): Promise<ScanResult> => {
  const result = await scanFile(file, options);
  if (!result.safe) {
    throw new Error(`Upload rejected: ${result.threats.join("; ")}`);
  }
  return result;
};
