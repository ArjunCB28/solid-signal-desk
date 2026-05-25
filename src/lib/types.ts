export interface Post {
  id: number;
  title: string;
  body: string;
  author: string;
  created_at: string;
}

export interface CreatePostInput {
  title: string;
  body: string;
  author: string;
}
