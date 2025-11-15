export interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  createdAt: string;
}

export interface GeneratedText {
  id: string;
  content: string;
  prompt: string;
  createdAt: string;
}

export interface ArtworkData {
  id: string;
  title: string;
  description: string;
  images: GeneratedImage[];
  texts: GeneratedText[];
  createdAt: string;
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}