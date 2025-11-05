"use client";

import { useQuery } from "@tanstack/react-query";
import { VideoCard } from "./video-card";
import { VideoListResponse } from "@/lib/types";

async function fetchVideos(): Promise<VideoListResponse> {
  const response = await fetch("/api/youtube?maxResults=25&regionCode=KR");
  if (!response.ok) {
    throw new Error("Failed to fetch videos");
  }
  return response.json();
}

export function VideoList() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["videos"],
    queryFn: fetchVideos,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <h3 className="text-red-800 dark:text-red-200 font-semibold mb-2">
          오류가 발생했습니다
        </h3>
        <p className="text-red-600 dark:text-red-300 mb-4">
          {error instanceof Error ? error.message : "알 수 없는 오류"}
        </p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
        >
          다시 시도
        </button>
      </div>
    );
  }

  if (!data || data.videos.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-600 dark:text-gray-400">
          표시할 영상이 없습니다.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <p className="text-gray-600 dark:text-gray-400">
          총 {data.totalResults}개의 영상
        </p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          새로고침
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {data.videos.map((video) => (
          <VideoCard key={video.id} video={video} />
        ))}
      </div>
    </div>
  );
}

