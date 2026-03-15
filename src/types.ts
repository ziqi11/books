export interface User {
  id: string;
  nickname: string;
  avatar: string;
}

export interface Book {
  id: string;
  authorUid: string;
  title: string;
  cover: string;
  description: string;
  createdAt: string;
}

export interface Entry {
  id: string;
  bookId: string;
  title: string;
  content: string;
  image: string;
  feelings: string;
  createdAt: string;
}

export interface CommunityPost {
  id: string;
  authorUid: string;
  bookId: string;
  entryId: string;
  type: string;
  content: string;
  likes: number;
  isPinned?: boolean;
  createdAt: string;
  nickname: string;
  avatar: string;
  book_title?: string;
  book_cover?: string;
  entry_content?: string;
  entry_title?: string;
}

export interface Comment {
  id: string;
  targetId: string;
  authorUid: string;
  content: string;
  createdAt: string;
  nickname: string;
  avatar: string;
}

export interface Activity {
  id: string;
  authorUid?: string;
  title: string;
  announcement: string;
  location: string;
  time: string;
  posters: string | string[]; // Can be JSON string or array
  createdAt: string;
  author_nickname?: string;
  author_avatar?: string;
  participants?: { nickname: string, user_id: string }[];
}

export interface Annotation {
  id: string;
  postId: string;
  authorUid: string;
  sentenceIndex: number;
  content: string;
  createdAt: string;
  nickname: string;
  avatar: string;
}

export interface ActivityComment {
  id: string;
  targetId: string;
  authorUid: string;
  content: string;
  createdAt: string;
  nickname: string;
  avatar: string;
}

export type Language = 'zh' | 'en';
