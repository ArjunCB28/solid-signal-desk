import { beforeEach, describe, expect, it, vi } from "vitest";
import { getRequestEvent } from "solid-js/web";
import { createPost, deletePost, getPosts } from "./db";
import type { Post } from "./types";

vi.mock("solid-js/web", () => ({
  getRequestEvent: vi.fn(),
}));

const mockGetRequestEvent = vi.mocked(getRequestEvent);

// Builds a chainable D1 statement stub
function makeStmt(overrides: { all?: any; run?: any } = {}) {
  const stmt = {
    bind: vi.fn(),
    all: overrides.all ?? vi.fn().mockResolvedValue({ results: [] }),
    run: overrides.run ?? vi.fn().mockResolvedValue(undefined),
  };
  stmt.bind.mockReturnValue(stmt);
  return stmt;
}

// Wires up getRequestEvent to return a mock DB that uses the given stmt
function setupMockDB(stmt: ReturnType<typeof makeStmt>) {
  const db = { prepare: vi.fn(() => stmt) };
  mockGetRequestEvent.mockReturnValue({
    nativeEvent: { context: { cloudflare: { env: { DB: db } } } },
  } as any);
  return db;
}

describe("getPosts", () => {
  it("prepares the correct SQL with LIMIT and OFFSET", async () => {
    const stmt = makeStmt();
    const db = setupMockDB(stmt);

    await getPosts(0, 5);

    expect(db.prepare).toHaveBeenCalledWith(
      "SELECT id, title, body, author, created_at FROM posts ORDER BY created_at DESC LIMIT ? OFFSET ?"
    );
  });

  it("binds limit then offset", async () => {
    const stmt = makeStmt();
    setupMockDB(stmt);

    await getPosts(10, 5);

    expect(stmt.bind).toHaveBeenCalledWith(5, 10);
  });

  it("returns the results array from D1", async () => {
    const posts: Post[] = [
      { id: 1, title: "Hello", body: "World", author: "Alice", created_at: "2024-01-01" },
    ];
    const stmt = makeStmt({ all: vi.fn().mockResolvedValue({ results: posts }) });
    setupMockDB(stmt);

    const result = await getPosts(0, 5);

    expect(result).toEqual(posts);
  });

  it("returns empty array when there are no posts", async () => {
    const stmt = makeStmt({ all: vi.fn().mockResolvedValue({ results: [] }) });
    setupMockDB(stmt);

    const result = await getPosts(0, 5);

    expect(result).toEqual([]);
  });

  it("throws 'Failed to load posts' when D1 errors", async () => {
    const stmt = makeStmt({ all: vi.fn().mockRejectedValue(new Error("D1 error")) });
    setupMockDB(stmt);

    await expect(getPosts(0, 5)).rejects.toThrow("Failed to load posts");
  });
});

describe("createPost", () => {
  it("prepares the correct INSERT SQL", async () => {
    const stmt = makeStmt();
    const db = setupMockDB(stmt);

    await createPost({ title: "T", body: "B", author: "A" });

    expect(db.prepare).toHaveBeenCalledWith(
      "INSERT INTO posts (title, body, author) VALUES (?, ?, ?)"
    );
  });

  it("binds title, body, author in order", async () => {
    const stmt = makeStmt();
    setupMockDB(stmt);

    await createPost({ title: "My Title", body: "My Body", author: "Jane" });

    expect(stmt.bind).toHaveBeenCalledWith("My Title", "My Body", "Jane");
  });

  it("calls run() to execute the insert", async () => {
    const stmt = makeStmt();
    setupMockDB(stmt);

    await createPost({ title: "T", body: "B", author: "A" });

    expect(stmt.run).toHaveBeenCalled();
  });

  it("throws 'Failed to create post' when D1 errors", async () => {
    const stmt = makeStmt({ run: vi.fn().mockRejectedValue(new Error("D1 error")) });
    setupMockDB(stmt);

    await expect(createPost({ title: "T", body: "B", author: "A" })).rejects.toThrow(
      "Failed to create post"
    );
  });
});

describe("deletePost", () => {
  it("prepares the correct DELETE SQL", async () => {
    const stmt = makeStmt();
    const db = setupMockDB(stmt);

    await deletePost(1, "Alice");

    expect(db.prepare).toHaveBeenCalledWith(
      "DELETE FROM posts WHERE id = ? AND author = ?"
    );
  });

  it("binds id and author in order", async () => {
    const stmt = makeStmt();
    setupMockDB(stmt);

    await deletePost(42, "Bob");

    expect(stmt.bind).toHaveBeenCalledWith(42, "Bob");
  });

  it("calls run() to execute the delete", async () => {
    const stmt = makeStmt();
    setupMockDB(stmt);

    await deletePost(1, "Alice");

    expect(stmt.run).toHaveBeenCalled();
  });

  it("throws 'Failed to delete post' when D1 errors", async () => {
    const stmt = makeStmt({ run: vi.fn().mockRejectedValue(new Error("D1 error")) });
    setupMockDB(stmt);

    await expect(deletePost(1, "Alice")).rejects.toThrow("Failed to delete post");
  });
});
