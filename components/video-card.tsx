"use client";

import Image from "next/image";
import { Video } from "@/lib/types";
import { formatNumber, formatDate } from "@/lib/utils";
import { ThumbsUp, MessageCircle } from "lucide-react";

interface VideoCardProps {
  video: Video;
}

export function VideoCard({ video }: VideoCardProps) {
  return (
    <a
      href={video.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-shadow overflow-hidden group"
    >
      <div className="relative w-full aspect-video bg-gray-200 dark:bg-gray-700">
        <Image
          src={video.thumbnail}
          alt={video.title}
          fill
          className="object-cover group-hover:scale-105 transition-transform"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
        />
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
          {video.title}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{video.channelTitle}</p>
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-500">
          <span>조회수 {formatNumber(video.viewCount)}</span>
          <span>{formatDate(video.publishedAt)}</span>
        </div>
        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <ThumbsUp className="h-3 w-3" />
            {formatNumber(video.likeCount)}
          </span>
          <span className="flex items-center gap-1">
            <MessageCircle className="h-3 w-3" />
            {formatNumber(video.commentCount)}
          </span>
        </div>
      </div>
    </a>
  );
}
