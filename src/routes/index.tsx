import { action, cache, createAsync, revalidate, useSearchParams, useSubmission } from "@solidjs/router";
import { For, createEffect, on } from "solid-js";
import { createPost, deletePost, getPosts } from "~/lib/db";
import { sanitizeBody, sanitizeName, sanitizeTitle } from "~/lib/sanitize";
import type { Post } from "~/lib/types";

const PAGE_SIZE = 5;

const getPostsData = cache(async (page: number): Promise<{ posts: Post[]; hasMore: boolean }> => {
  "use server";
  const offset = (page - 1) * PAGE_SIZE;
  const rows = await getPosts(offset, PAGE_SIZE + 1);
  return { posts: rows.slice(0, PAGE_SIZE), hasMore: rows.length > PAGE_SIZE };
}, "posts");

export const route = {
  load: () => getPostsData(1),
};

const createPostAction = action(async (formData: FormData) => {
  "use server";
  const title = sanitizeTitle(formData.get("title") as string ?? "");
  const body = sanitizeBody(formData.get("body") as string ?? "");
  const author = sanitizeName(formData.get("author") as string ?? "");
  if (!title || !body || !author) return { error: "All fields required" };
  try {
    await createPost({ title, body, author });
  } catch {
    return { error: "Failed to save post. Please try again." };
  }
  return revalidate(getPostsData.key);
}, "createPost");

const deletePostAction = action(async (formData: FormData) => {
  "use server";
  const id = Number(formData.get("id"));
  const author = formData.get("author") as string;
  if (!id || !author) return;
  try {
    await deletePost(id, author);
  } catch {
    return;
  }
  return revalidate(getPostsData.key);
}, "deletePost");

export default function Home() {
  let formRef: HTMLFormElement | undefined;
  const [params, setParams] = useSearchParams();
  const page = () => Math.max(1, Number(params.page || 1));
  const data = createAsync(() => getPostsData(page()));
  const createSub = useSubmission(createPostAction);

  createEffect(on(() => createSub.pending, (pending, prevPending) => {
    if (prevPending && !pending && !createSub.result?.error) {
      formRef?.reset();
    }
  }, { defer: true }));

  return (
    <main class="container">
      <h1>Signal Desk</h1>

      <section class="create-form">
        <h2>New Post</h2>
        <form ref={formRef} action={createPostAction} method="post">
          <div class="field">
            <label for="title">Title</label>
            <input id="title" name="title" type="text" required maxLength={30} placeholder="What's the update?" />
          </div>
          <div class="field">
            <label for="body">Body</label>
            <textarea id="body" name="body" required rows={4} maxLength={100} placeholder="Share more details..." />
          </div>
          <div class="field">
            <label for="author">Your name</label>
            <input id="author" name="author" type="text" required maxLength={30} placeholder="Jane Smith" />
          </div>
          <button type="submit">Post update</button>
          {createSub.result?.error && (
            <p class="error">{createSub.result.error}</p>
          )}
        </form>
      </section>

      <section class="feed">
        <h2>Recent updates</h2>
        <For each={data()?.posts} fallback={<p class="empty">No posts yet. Be the first!</p>}>
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
        <div class="pagination">
          <button
            type="button"
            class="pagination-btn"
            disabled={page() <= 1}
            onClick={() => setParams({ page: page() - 1 })}
          >
            ← Prev
          </button>
          <span class="pagination-info">Page {page()}</span>
          <button
            type="button"
            class="pagination-btn"
            disabled={!data()?.hasMore}
            onClick={() => setParams({ page: page() + 1 })}
          >
            Next →
          </button>
        </div>
      </section>
    </main>
  );
}
