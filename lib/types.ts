export interface Video {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  channelTitle: string;
  publishedAt: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  url: string;
}

export interface VideoListResponse {
  videos: Video[];
  totalResults: number;
  nextPageToken?: string;
  prevPageToken?: string;
}

export type DateFilter = "all" | "week" | "month" | "3months";

export const DATE_FILTERS = [
  { id: "all", name: "전체", days: null },
  { id: "week", name: "최근 1주일", days: 7 },
  { id: "month", name: "최근 1개월", days: 30 },
  { id: "3months", name: "최근 3개월", days: 90 },
] as const;

