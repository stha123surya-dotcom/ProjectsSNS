export interface Folder {
  id: string;
  name: string;
  thumbnailUrl: string | null;
  imageCount: number;
  description?: string;
}

export interface Project {
  id: string;
  title: string;
  filename: string;
  url: string;
  description: string;
  folder: string;
}

