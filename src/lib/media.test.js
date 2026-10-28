import { describe, expect, it } from "vitest";
import { attachmentKind, checkFile, extensionOf, formatBytes, formatDuration, normalizePeaks, playbackUrl, pseudoPeaks } from "./media";

const file = (name, type, size = 1000) => ({ name, type, size });

describe("media helpers", () => {
  it("formats sizes and durations", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2 KB");
    expect(formatBytes(3.5 * 1024 * 1024)).toBe("3.5 MB");
    expect(formatDuration(75)).toBe("1:15");
    expect(formatDuration(4.6)).toBe("0:05");
  });

  it("sends photos inline and everything else, SVG included, as files", () => {
    expect(attachmentKind(file("a.jpg", "image/jpeg"))).toBe("image");
    expect(attachmentKind(file("a.svg", "image/svg+xml"))).toBe("file");
    expect(attachmentKind(file("a.pdf", "application/pdf"))).toBe("file");
  });

  it("rejects empty, executable and oversized files with a reason", () => {
    expect(checkFile(file("a.pdf", "application/pdf", 0), "file")).toMatch(/empty/);
    expect(checkFile(file("setup.exe", "application/x-msdownload"), "file")).toMatch(/safety/);
    expect(checkFile(file("big.jpg", "image/jpeg", 16 * 1024 * 1024), "image")).toMatch(/15 MB/);
    expect(checkFile(file("ok.pdf", "application/pdf"), "file")).toBeNull();
  });

  it("names the file tile from the extension", () => {
    expect(extensionOf("report.final.pdf")).toBe("PDF");
    expect(extensionOf("README")).toBe("FILE");
  });

  it("serves Cloudinary audio as mp3 and leaves other URLs alone", () => {
    expect(playbackUrl("https://res.cloudinary.com/demo/video/upload/v1/ibasoro/voice/a.webm")).toBe(
      "https://res.cloudinary.com/demo/video/upload/v1/ibasoro/voice/a.mp3"
    );
    expect(playbackUrl("blob:http://x/1")).toBe("blob:http://x/1");
  });

  it("reduces samples to a fixed number of normalised peaks", () => {
    const peaks = normalizePeaks([0, 0.2, 0.9, 0.1, 0.5, 0.3], 3);
    expect(peaks).toHaveLength(3);
    expect(Math.max(...peaks)).toBe(100);
    expect(Math.min(...peaks)).toBeGreaterThanOrEqual(8);
    expect(normalizePeaks([], 4)).toEqual([8, 8, 8, 8]);
  });

  it("makes the same fallback waveform for the same message", () => {
    expect(pseudoPeaks("abc")).toEqual(pseudoPeaks("abc"));
    expect(pseudoPeaks("abc")).not.toEqual(pseudoPeaks("abd"));
  });
});
