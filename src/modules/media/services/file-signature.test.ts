import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { detectFile } from "./file-signature.js";

function padded(bytes: number[], length = 64): Buffer {
  const buffer = Buffer.alloc(Math.max(length, bytes.length));
  Buffer.from(bytes).copy(buffer);
  return buffer;
}

function png(width: number, height: number): Buffer {
  const buffer = padded([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);
  return buffer;
}

function jpeg(width: number, height: number): Buffer {
  // SOI, APP0 (length 16), SOF0 (length 17: precision, height, width, ...)
  const app0 = [0xff, 0xe0, 0x00, 0x10, ...Buffer.from("JFIF\0"), 1, 1, 0, 0, 1, 0, 1, 0, 0];
  const sof = [0xff, 0xc0, 0x00, 0x11, 8, height >> 8, height & 0xff, width >> 8, width & 0xff, 3];
  return padded([0xff, 0xd8, ...app0, ...sof], 80);
}

function ftyp(brand: string): Buffer {
  return padded([0, 0, 0, 0x18, ...Buffer.from("ftyp"), ...Buffer.from(brand)]);
}

describe("detectFile", () => {
  it("detects PNG with dimensions", () => {
    assert.deepEqual(detectFile(png(640, 480)), { kind: "IMAGE", mimeType: "image/png", extension: "png", width: 640, height: 480 });
  });

  it("detects JPEG and reads the SOF frame size", () => {
    assert.deepEqual(detectFile(jpeg(1920, 1080)), { kind: "IMAGE", mimeType: "image/jpeg", extension: "jpg", width: 1920, height: 1080 });
  });

  it("detects GIF and lossless WebP sizes", () => {
    const gif = padded([...Buffer.from("GIF89a"), 0x20, 0x03, 0x58, 0x02]);
    assert.equal(detectFile(gif)?.width, 800);
    assert.equal(detectFile(gif)?.height, 600);

    const webp = padded([...Buffer.from("RIFF"), 0, 0, 0, 0, ...Buffer.from("WEBPVP8L"), 0, 0, 0, 0, 0x2f]);
    // 14-bit width-1 and height-1 packed little-endian: width 100, height 50.
    const packed = 99 | (49 << 14);
    webp.writeUInt32LE(packed, 21);
    assert.deepEqual(detectFile(webp), { kind: "IMAGE", mimeType: "image/webp", extension: "webp", width: 100, height: 50 });
  });

  it("detects MP4, WebM, AVIF and PDF", () => {
    assert.equal(detectFile(ftyp("isom"))?.mimeType, "video/mp4");
    assert.equal(detectFile(ftyp("avif"))?.mimeType, "image/avif");
    assert.equal(detectFile(padded([0x1a, 0x45, 0xdf, 0xa3, ...Buffer.from("....B\x82webm")]))?.mimeType, "video/webm");
    assert.equal(detectFile(padded([...Buffer.from("%PDF-1.7")]))?.kind, "DOCUMENT");
  });

  it("rejects SVG, HTML, unknown ftyp brands and tiny buffers", () => {
    assert.equal(detectFile(padded([...Buffer.from('<svg xmlns="http://www.w3.org/2000/svg">')])), null);
    assert.equal(detectFile(padded([...Buffer.from("<!doctype html><script>")])), null);
    assert.equal(detectFile(ftyp("qt  ")), null);
    assert.equal(detectFile(Buffer.from([0xff, 0xd8])), null);
  });

  it("does not trust a PNG signature with a broken header for dimensions", () => {
    const broken = png(10, 10);
    broken.write("XXXX", 12, "latin1");
    assert.deepEqual(detectFile(broken), { kind: "IMAGE", mimeType: "image/png", extension: "png" });
  });
});
