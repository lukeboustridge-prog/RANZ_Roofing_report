/**
 * Validation Utility Tests
 *
 * Tests for form validation utilities used for data integrity.
 */

import { describe, it, expect } from "vitest";
import {
  validators,
  combineValidators,
  validateForm,
  sanitize,
  fileValidators,
} from "./validation";

describe("validators", () => {
  describe("required", () => {
    const validate = validators.required("Field");

    it("should fail for empty string", () => {
      expect(validate("")).toEqual({
        valid: false,
        error: "Field is required",
      });
    });

    it("should fail for whitespace only", () => {
      expect(validate("   ")).toEqual({
        valid: false,
        error: "Field is required",
      });
    });

    it("should fail for null", () => {
      expect(validate(null)).toEqual({
        valid: false,
        error: "Field is required",
      });
    });

    it("should fail for undefined", () => {
      expect(validate(undefined)).toEqual({
        valid: false,
        error: "Field is required",
      });
    });

    it("should pass for non-empty string", () => {
      expect(validate("test")).toEqual({ valid: true });
    });
  });

  describe("email", () => {
    const validate = validators.email();

    it("should pass for valid email", () => {
      expect(validate("test@example.com")).toEqual({ valid: true });
    });

    it("should pass for email with subdomain", () => {
      expect(validate("user@mail.example.co.nz")).toEqual({ valid: true });
    });

    it("should fail for email without @", () => {
      expect(validate("testexample.com")).toEqual({
        valid: false,
        error: "Please enter a valid email address",
      });
    });

    it("should fail for email without domain", () => {
      expect(validate("test@")).toEqual({
        valid: false,
        error: "Please enter a valid email address",
      });
    });

    it("should fail for email without TLD", () => {
      expect(validate("test@example")).toEqual({
        valid: false,
        error: "Please enter a valid email address",
      });
    });
  });

  describe("minLength", () => {
    const validate = validators.minLength(5, "Password");

    it("should pass for string at minimum length", () => {
      expect(validate("12345")).toEqual({ valid: true });
    });

    it("should pass for string above minimum length", () => {
      expect(validate("123456789")).toEqual({ valid: true });
    });

    it("should fail for string below minimum length", () => {
      expect(validate("1234")).toEqual({
        valid: false,
        error: "Password must be at least 5 characters",
      });
    });
  });

  describe("maxLength", () => {
    const validate = validators.maxLength(10, "Username");

    it("should pass for string at maximum length", () => {
      expect(validate("1234567890")).toEqual({ valid: true });
    });

    it("should pass for string below maximum length", () => {
      expect(validate("12345")).toEqual({ valid: true });
    });

    it("should fail for string above maximum length", () => {
      expect(validate("12345678901")).toEqual({
        valid: false,
        error: "Username must be at most 10 characters",
      });
    });
  });

  describe("phone", () => {
    const validate = validators.phone();

    it("should pass for NZ mobile with +64", () => {
      expect(validate("+64 21 123 4567")).toEqual({ valid: true });
    });

    it("should pass for NZ mobile with 0", () => {
      expect(validate("021 123 4567")).toEqual({ valid: true });
    });

    it("should pass for NZ landline", () => {
      expect(validate("09 123 4567")).toEqual({ valid: true });
    });

    it("should fail for too short number", () => {
      expect(validate("021 123")).toEqual({
        valid: false,
        error: "Please enter a valid NZ phone number",
      });
    });

    it("should fail for number with letters", () => {
      expect(validate("021 ABC 4567")).toEqual({
        valid: false,
        error: "Please enter a valid NZ phone number",
      });
    });
  });

  describe("url", () => {
    const validate = validators.url();

    it("should pass for valid HTTP URL", () => {
      expect(validate("http://example.com")).toEqual({ valid: true });
    });

    it("should pass for valid HTTPS URL", () => {
      expect(validate("https://example.com/path?query=1")).toEqual({
        valid: true,
      });
    });

    it("should fail for invalid URL", () => {
      expect(validate("not-a-url")).toEqual({
        valid: false,
        error: "Please enter a valid URL",
      });
    });

    it("should fail for missing protocol", () => {
      expect(validate("example.com")).toEqual({
        valid: false,
        error: "Please enter a valid URL",
      });
    });
  });

  describe("positiveNumber", () => {
    const validate = validators.positiveNumber("Amount");

    it("should pass for positive number", () => {
      expect(validate(10)).toEqual({ valid: true });
    });

    it("should pass for decimal positive number", () => {
      expect(validate(0.5)).toEqual({ valid: true });
    });

    it("should fail for zero", () => {
      expect(validate(0)).toEqual({
        valid: false,
        error: "Amount must be a positive number",
      });
    });

    it("should fail for negative number", () => {
      expect(validate(-5)).toEqual({
        valid: false,
        error: "Amount must be a positive number",
      });
    });

    it("should fail for NaN", () => {
      expect(validate(NaN)).toEqual({
        valid: false,
        error: "Amount must be a positive number",
      });
    });
  });

  describe("dateNotInFuture", () => {
    const validate = validators.dateNotInFuture("Inspection date");

    it("should pass for past date", () => {
      expect(validate(new Date("2020-01-01"))).toEqual({ valid: true });
    });

    it("should pass for today", () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      expect(validate(today)).toEqual({ valid: true });
    });

    it("should fail for future date", () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      expect(validate(futureDate)).toEqual({
        valid: false,
        error: "Inspection date cannot be in the future",
      });
    });

    it("should handle date string", () => {
      expect(validate("2020-01-01")).toEqual({ valid: true });
    });
  });

  describe("nzPostcode", () => {
    const validate = validators.nzPostcode();

    it("should pass for valid 4-digit postcode", () => {
      expect(validate("1010")).toEqual({ valid: true });
    });

    it("should pass for postcode starting with 0", () => {
      expect(validate("0600")).toEqual({ valid: true });
    });

    it("should fail for 3-digit postcode", () => {
      expect(validate("101")).toEqual({
        valid: false,
        error: "Please enter a valid 4-digit NZ postcode",
      });
    });

    it("should fail for 5-digit postcode", () => {
      expect(validate("10100")).toEqual({
        valid: false,
        error: "Please enter a valid 4-digit NZ postcode",
      });
    });

    it("should fail for non-numeric postcode", () => {
      expect(validate("ABCD")).toEqual({
        valid: false,
        error: "Please enter a valid 4-digit NZ postcode",
      });
    });
  });
});

describe("combineValidators", () => {
  it("should pass when all validators pass", () => {
    const combined = combineValidators(
      validators.required("Field"),
      validators.minLength(3, "Field")
    );
    expect(combined("test")).toEqual({ valid: true });
  });

  it("should fail with first failing validator error", () => {
    const combined = combineValidators(
      validators.required("Field"),
      validators.minLength(10, "Field")
    );
    expect(combined("test")).toEqual({
      valid: false,
      error: "Field must be at least 10 characters",
    });
  });

  it("should fail immediately on first error", () => {
    const combined = combineValidators(
      validators.required("Field"),
      validators.minLength(3, "Field")
    );
    expect(combined("")).toEqual({
      valid: false,
      error: "Field is required",
    });
  });
});

describe("validateForm", () => {
  it("should validate entire form object", () => {
    const data = {
      email: "test@example.com",
      name: "Test User",
    };
    const schema = {
      email: validators.email(),
      name: validators.required("Name"),
    };

    const result = validateForm(data, schema);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it("should return all errors for invalid form", () => {
    const data = {
      email: "invalid-email",
      name: "",
    };
    const schema = {
      email: validators.email(),
      name: validators.required("Name"),
    };

    const result = validateForm(data, schema);
    expect(result.valid).toBe(false);
    expect(result.errors.email).toBe("Please enter a valid email address");
    expect(result.errors.name).toBe("Name is required");
  });

  it("should skip fields without validators", () => {
    const data = {
      email: "test@example.com",
      optional: "",
    };
    const schema = {
      email: validators.email(),
    };

    const result = validateForm(data, schema);
    expect(result.valid).toBe(true);
  });
});

describe("sanitize", () => {
  describe("trim", () => {
    it("should remove leading and trailing whitespace", () => {
      expect(sanitize.trim("  test  ")).toBe("test");
    });

    it("should preserve internal whitespace", () => {
      expect(sanitize.trim("  hello world  ")).toBe("hello world");
    });
  });

  describe("stripHtml", () => {
    it("should remove HTML tags", () => {
      expect(sanitize.stripHtml("<p>Hello</p>")).toBe("Hello");
    });

    it("should remove nested tags", () => {
      expect(sanitize.stripHtml("<div><span>Test</span></div>")).toBe("Test");
    });

    it("should handle self-closing tags", () => {
      expect(sanitize.stripHtml("Hello<br/>World")).toBe("HelloWorld");
    });
  });

  describe("escapeHtml", () => {
    it("should escape ampersand", () => {
      expect(sanitize.escapeHtml("A & B")).toBe("A &amp; B");
    });

    it("should escape angle brackets", () => {
      expect(sanitize.escapeHtml("<script>")).toBe("&lt;script&gt;");
    });

    it("should escape quotes", () => {
      expect(sanitize.escapeHtml('"test"')).toBe("&quot;test&quot;");
      expect(sanitize.escapeHtml("'test'")).toBe("&#039;test&#039;");
    });
  });

  describe("normalizeWhitespace", () => {
    it("should collapse multiple spaces", () => {
      expect(sanitize.normalizeWhitespace("hello    world")).toBe(
        "hello world"
      );
    });

    it("should trim and collapse", () => {
      expect(sanitize.normalizeWhitespace("  hello   world  ")).toBe(
        "hello world"
      );
    });

    it("should handle newlines and tabs", () => {
      expect(sanitize.normalizeWhitespace("hello\n\tworld")).toBe(
        "hello world"
      );
    });
  });

  describe("toSlug", () => {
    it("should convert to lowercase", () => {
      expect(sanitize.toSlug("Hello World")).toBe("hello-world");
    });

    it("should replace spaces with hyphens", () => {
      expect(sanitize.toSlug("my blog post")).toBe("my-blog-post");
    });

    it("should remove special characters", () => {
      expect(sanitize.toSlug("Hello! World?")).toBe("hello-world");
    });

    it("should remove leading and trailing hyphens", () => {
      expect(sanitize.toSlug("--test--")).toBe("test");
    });

    it("should collapse multiple hyphens", () => {
      expect(sanitize.toSlug("hello   world")).toBe("hello-world");
    });
  });
});

describe("fileValidators", () => {
  const createMockFile = (name: string, size: number, type: string): File => {
    const blob = new Blob(["x".repeat(size)], { type });
    return new File([blob], name, { type });
  };

  describe("maxSize", () => {
    const validate = fileValidators.maxSize(5 * 1024 * 1024); // 5MB

    it("should pass for file under limit", () => {
      const file = createMockFile("test.jpg", 1024 * 1024, "image/jpeg"); // 1MB
      expect(validate(file)).toEqual({ valid: true });
    });

    it("should pass for file at limit", () => {
      const file = createMockFile("test.jpg", 5 * 1024 * 1024, "image/jpeg"); // 5MB
      expect(validate(file)).toEqual({ valid: true });
    });

    it("should fail for file over limit", () => {
      const file = createMockFile("test.jpg", 6 * 1024 * 1024, "image/jpeg"); // 6MB
      const result = validate(file);
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/less than 5MB/);
    });
  });

  describe("allowedTypes", () => {
    const validate = fileValidators.allowedTypes([
      "image/jpeg",
      "image/png",
      "application/pdf",
    ]);

    it("should pass for allowed type", () => {
      const file = createMockFile("test.jpg", 1024, "image/jpeg");
      expect(validate(file)).toEqual({ valid: true });
    });

    it("should fail for disallowed type", () => {
      const file = createMockFile("test.exe", 1024, "application/x-msdownload");
      const result = validate(file);
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/must be one of/);
    });
  });

  describe("isImage", () => {
    const validate = fileValidators.isImage();

    it("should pass for JPEG image", () => {
      const file = createMockFile("test.jpg", 1024, "image/jpeg");
      expect(validate(file)).toEqual({ valid: true });
    });

    it("should pass for PNG image", () => {
      const file = createMockFile("test.png", 1024, "image/png");
      expect(validate(file)).toEqual({ valid: true });
    });

    it("should pass for WebP image", () => {
      const file = createMockFile("test.webp", 1024, "image/webp");
      expect(validate(file)).toEqual({ valid: true });
    });

    it("should fail for PDF", () => {
      const file = createMockFile("test.pdf", 1024, "application/pdf");
      expect(validate(file)).toEqual({
        valid: false,
        error: "File must be an image",
      });
    });

    it("should fail for text file", () => {
      const file = createMockFile("test.txt", 1024, "text/plain");
      expect(validate(file)).toEqual({
        valid: false,
        error: "File must be an image",
      });
    });
  });
});
