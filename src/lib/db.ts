import { getRequestEvent } from "solid-js/web";
import type { CreatePostInput, Post } from "./types";

function getDB(): D1Database {
  const event = getRequestEvent()!;
  const env = (event.nativeEvent.context as any).cloudflare.env as Env;
  return env.DB;
}

export async function getPosts(offset: number, limit: number): Promise<Post[]> {
  try {
    const db = getDB();
    const { results } = await db
      .prepare("SELECT id, title, body, author, created_at FROM posts ORDER BY created_at DESC LIMIT ? OFFSET ?")
      .bind(limit, offset)
      .all<Post>();
    return results;
  } catch (err) {
    throw new Error("Failed to load posts");
  }
}

export async function createPost(data: CreatePostInput): Promise<void> {
  try {
    const db = getDB();
    await db
      .prepare("INSERT INTO posts (title, body, author) VALUES (?, ?, ?)")
      .bind(data.title, data.body, data.author)
      .run();
  } catch (err) {
    throw new Error("Failed to create post");
  }
}

export async function deletePost(id: number, author: string): Promise<void> {
  try {
    const db = getDB();
    await db
      .prepare("DELETE FROM posts WHERE id = ? AND author = ?")
      .bind(id, author)
      .run();
  } catch (err) {
    throw new Error("Failed to delete post");
  }
}
