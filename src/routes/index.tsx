import { action, cache, createAsync, revalidate } from "@solidjs/router";
import { For } from "solid-js";
import { createPost, deletePost, getPosts } from "~/lib/db";
import type { Post } from "~/lib/types";

const getPostsData = cache(async (): Promise<Post[]> => {
  "use server";
  return getPosts();
}, "posts");

export const route = {
  load: () => getPostsData(),
};

const createPostAction = action(async (formData: FormData) => {
  "use server";
  const title = (formData.get("title") as string)?.trim();
  const body = (formData.get("body") as string)?.trim();
  const author = (formData.get("author") as string)?.trim();
  if (!title || !body || !author) return { error: "All fields required" };
  await createPost({ title, body, author });
  return revalidate(getPostsData.key);
}, "createPost");

const deletePostAction = action(async (formData: FormData) => {
  "use server";
  const id = Number(formData.get("id"));
  const author = formData.get("author") as string;
  if (!id || !author) return;
  await deletePost(id, author);
  return revalidate(getPostsData.key);
}, "deletePost");

export default function Home() {
  const posts = createAsync(() => getPostsData());

  return (
    <main class="container">
      <h1>Signal Desk</h1>

      <section class="create-form">
        <h2>New Post</h2>
        <form action={createPostAction} method="post">
          <div class="field">
            <label for="title">Title</label>
            <input id="title" name="title" type="text" required maxLength={200} placeholder="What's the update?" />
          </div>
          <div class="field">
            <label for="body">Body</label>
            <textarea id="body" name="body" required rows={4} placeholder="Share more details..." />
          </div>
          <div class="field">
            <label for="author">Your name</label>
            <input id="author" name="author" type="text" required maxLength={100} placeholder="Jane Smith" />
          </div>
          <button type="submit">Post update</button>
        </form>
      </section>

      <section class="feed">
        <h2>Recent updates</h2>
        <For each={posts()} fallback={<p class="empty">No posts yet. Be the first!</p>}>
          {(post) => (
            <article class="post-card">
              <div class="post-header">
                <h3>{post.title}</h3>
                <form action={deletePostAction} method="post">
                  <input type="hidden" name="id" value={post.id} />
                  <input type="hidden" name="author" value={post.author} />
                  <button type="submit" class="delete-btn" title="Only works if you are the author">
                    Delete
                  </button>
                </form>
              </div>
              <p class="post-body">{post.body}</p>
              <footer class="post-meta">
                <span class="author">{post.author}</span>
                <time dateTime={post.created_at}>
                  {new Date(post.created_at).toLocaleString()}
                </time>
              </footer>
            </article>
          )}
        </For>
      </section>
    </main>
  );
}
