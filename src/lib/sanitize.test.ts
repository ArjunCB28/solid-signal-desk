import { describe, expect, it } from "vitest";
import { sanitizeBody, sanitizeName, sanitizeTitle, stripControl, stripHtml } from "./sanitize";

describe("stripHtml", () => {
  it("removes basic tags", () => {
    expect(stripHtml("<b>hello</b>")).toBe("hello");
  });

  it("removes script tags leaving inner content", () => {
    expect(stripHtml("<script>alert('xss')</script>")).toBe("alert('xss')");
  });

  it("removes attributes", () => {
    expect(stripHtml('<a href="https://example.com">link</a>')).toBe("link");
  });

  it("removes multiple tags", () => {
    expect(stripHtml("<h1>Title</h1><p>Body</p>")).toBe("TitleBody");
  });

  it("leaves plain text untouched", () => {
    expect(stripHtml("no tags here")).toBe("no tags here");
  });

  it("handles empty string", () => {
    expect(stripHtml("")).toBe("");
  });
});

describe("stripControl", () => {
  it("removes null bytes", () => {
    expect(stripControl("hello\x00world")).toBe("helloworld");
  });

  it("removes other control characters", () => {
    expect(stripControl("a\x01b\x1Fc")).toBe("abc");
  });

  it("preserves newlines (\\x0A)", () => {
    expect(stripControl("line1\nline2")).toBe("line1\nline2");
  });

  it("preserves tabs (\\x09)", () => {
    expect(stripControl("col1\tcol2")).toBe("col1\tcol2");
  });

  it("leaves plain text untouched", () => {
    expect(stripControl("hello world")).toBe("hello world");
  });
});

describe("sanitizeName", () => {
  it("passes through a normal name", () => {
    expect(sanitizeName("Jane Smith")).toBe("Jane Smith");
  });

  it("strips HTML tags", () => {
    expect(sanitizeName("<b>Bob</b>")).toBe("Bob");
  });

  it("removes disallowed characters", () => {
    expect(sanitizeName("Jane@Smith!")).toBe("JaneSmith");
  });

  it("allows hyphens, apostrophes, and dots", () => {
    expect(sanitizeName("Mary-Jane O'Brien")).toBe("Mary-Jane O'Brien");
  });

  it("trims surrounding whitespace", () => {
    expect(sanitizeName("  Alice  ")).toBe("Alice");
  });

  it("truncates to 30 characters", () => {
    const long = "A".repeat(35);
    expect(sanitizeName(long)).toHaveLength(30);
  });

  it("handles empty string", () => {
    expect(sanitizeName("")).toBe("");
  });
});

describe("sanitizeTitle", () => {
  it("passes through normal text", () => {
    expect(sanitizeTitle("Hello, World!")).toBe("Hello, World!");
  });

  it("strips HTML tags", () => {
    expect(sanitizeTitle("<h1>Update</h1>")).toBe("Update");
  });

  it("allows punctuation: .,!?\"':;()", () => {
    expect(sanitizeTitle("Fix: bug (critical)!")).toBe("Fix: bug (critical)!");
  });

  it("removes disallowed characters like @", () => {
    expect(sanitizeTitle("Hello@World")).toBe("HelloWorld");
  });

  it("trims surrounding whitespace", () => {
    expect(sanitizeTitle("  My Title  ")).toBe("My Title");
  });

  it("truncates to 30 characters", () => {
    const long = "A".repeat(35);
    expect(sanitizeTitle(long)).toHaveLength(30);
  });

  it("handles empty string", () => {
    expect(sanitizeTitle("")).toBe("");
  });
});

describe("sanitizeBody", () => {
  it("passes through normal text", () => {
    expect(sanitizeBody("This is a post body.")).toBe("This is a post body.");
  });

  it("strips HTML tags", () => {
    expect(sanitizeBody("<p>Content</p>")).toBe("Content");
  });

  it("allows @ and # characters", () => {
    expect(sanitizeBody("Hello @user #tag")).toBe("Hello @user #tag");
  });

  it("preserves newlines", () => {
    expect(sanitizeBody("Line 1\nLine 2")).toBe("Line 1\nLine 2");
  });

  it("allows special chars: &*%+=/", () => {
    expect(sanitizeBody("50% off & more = great")).toBe("50% off & more = great");
  });

  it("removes disallowed characters like backticks", () => {
    expect(sanitizeBody("hello `world`")).toBe("hello world");
  });

  it("trims surrounding whitespace", () => {
    expect(sanitizeBody("  body text  ")).toBe("body text");
  });

  it("truncates to 100 characters", () => {
    const long = "A".repeat(110);
    expect(sanitizeBody(long)).toHaveLength(100);
  });

  it("handles empty string", () => {
    expect(sanitizeBody("")).toBe("");
  });
});
