export interface User {
  id: number;
  nickname: string;
  avatar: string;
}

export interface Book {
  id: number;
  user_id: number;
  title: string;
  cover: string;
  description: string;
  created_at: string;
}

export interface Entry {
  id: number;
  book_id: number;
  title: string;
  content: string;
  image: string;
  feelings: string;
  created_at: string;
}

export interface CommunityPost {
  id: number;
  user_id: number;
  book_id: number;
  entry_id: number;
  type: string;
  content: string;
  likes: number;
  created_at: string;
  nickname: string;
  avatar: string;
  book_title?: string;
  book_cover?: string;
  entry_content?: string;
  entry_title?: string;
}

export interface Comment {
  id: number;
  post_id: number;
  user_id: number;
  content: string;
  created_at: string;
  nickname: string;
  avatar: string;
}

export interface Activity {
  id: number;
  user_id?: number;
  title: string;
  announcement: string;
  location: string;
  time: string;
  posters: string; // JSON string of array
  created_at: string;
  author_nickname?: string;
  author_avatar?: string;
  participants?: { nickname: string, user_id: number }[];
}

export interface Annotation {
  id: number;
  post_id: number;
  user_id: number;
  sentence_index: number;
  content: string;
  created_at: string;
  nickname: string;
  avatar: string;
}

export interface ActivityComment {
  id: number;
  activity_id: number;
  user_id: number;
  content: string;
  created_at: string;
  nickname: string;
  avatar: string;
}

export type Language = 'zh' | 'en';
