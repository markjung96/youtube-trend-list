"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { VideoCard } from "./video-card";
import { VideoListResponse, Video as YouTubeVideo } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, ChevronLeft, ChevronRight, Video, Scissors, Globe, Calendar, ArrowUpDown } from "lucide-react";

async function fetchVideos(
  type: "popular" | "shorts",
  regionCode: string,
  dateFilter: string,
  sortOrder: string,
  pageToken?: string
): Promise<VideoListResponse> {
  let url = `/api/youtube?maxResults=25&type=${type}&regionCode=${regionCode}&dateFilter=${dateFilter}&sortOrder=${sortOrder}`;
  if (pageToken) {
    url += `&pageToken=${pageToken}`;
  }
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to fetch videos");
  }
  return response.json();
}

export function VideoList() {
  const [pageToken, setPageToken] = useState<string | undefined>(undefined);
  const [pageHistory, setPageHistory] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"popular" | "shorts">("shorts");
  const [selectedRegion, setSelectedRegion] = useState<string>("KR");
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>("week");
  const [selectedSortOrder, setSelectedSortOrder] = useState<string>("popular");

  // 날짜 필터별 캐시 (쇼츠용)
  const [dateFilterCache, setDateFilterCache] = useState<Record<string, YouTubeVideo[]>>({});

  // 탭 변경 시 페이지 초기화
  const handleTabChange = (value: string) => {
    setActiveTab(value as "popular" | "shorts");
    setPageToken(undefined);
    setPageHistory([]);
  };

  // 국가 변경 시 페이지 초기화
  const handleRegionChange = (regionCode: string) => {
    setSelectedRegion(regionCode);
    setPageToken(undefined);
    setPageHistory([]);
  };

  // 날짜 필터 변경 시 페이지 초기화
  const handleDateFilterChange = (dateFilter: string) => {
    setSelectedDateFilter(dateFilter);
    setPageToken(undefined);
    setPageHistory([]);
  };

  // 정렬 순서 변경 시 페이지 초기화
  const handleSortOrderChange = (sortOrder: string) => {
    setSelectedSortOrder(sortOrder);
    setPageToken(undefined);
    setPageHistory([]);
  };

  const {
    data: rawData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["videos", activeTab, selectedRegion, selectedDateFilter, selectedSortOrder, pageToken],
    queryFn: () => fetchVideos(activeTab, selectedRegion, selectedDateFilter, selectedSortOrder, pageToken),
    enabled: true,
  });

  // 쇼츠 데이터 캐싱 및 누적
  useEffect(() => {
    if (rawData && activeTab === "shorts" && rawData.videos.length > 0) {
      const cacheKey = `${selectedRegion}-${selectedDateFilter}-${selectedSortOrder}`;

      // 현재 필터의 데이터를 캐시에 저장
      setDateFilterCache((prev) => ({
        ...prev,
        [cacheKey]: rawData.videos,
      }));
    }
  }, [rawData, activeTab, selectedRegion, selectedDateFilter, selectedSortOrder]);

  // 쇼츠일 때 캐시 데이터 병합
  const data = useMemo(() => {
    if (!rawData) return rawData;
    if (activeTab !== "shorts") return rawData;

    // 날짜 필터 계층: today < week < month < 3months
    const filterHierarchy: Record<string, string[]> = {
      today: ["today"],
      week: ["today", "week"],
      month: ["today", "week", "month"],
      "3months": ["today", "week", "month", "3months"],
    };

    const filtersToMerge = filterHierarchy[selectedDateFilter] || [selectedDateFilter];

    // 모든 관련 캐시 데이터 수집
    const allVideos: YouTubeVideo[] = [];
    const seenIds = new Set<string>();

    for (const filter of filtersToMerge) {
      const cacheKey = `${selectedRegion}-${filter}-${selectedSortOrder}`;
      const cachedVideos = dateFilterCache[cacheKey] || [];

      for (const video of cachedVideos) {
        if (!seenIds.has(video.id)) {
          seenIds.add(video.id);
          allVideos.push(video);
        }
      }
    }

    // 현재 API 응답 데이터 추가
    for (const video of rawData.videos) {
      if (!seenIds.has(video.id)) {
        seenIds.add(video.id);
        allVideos.push(video);
      }
    }

    // 정렬 재적용
    if (selectedSortOrder === "popular") {
      allVideos.sort((a, b) => b.viewCount - a.viewCount);
    } else {
      allVideos.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    }

    console.log(
      `[Cache Merge] Filter: ${selectedDateFilter}, Original: ${rawData.videos.length}, Merged: ${allVideos.length}`
    );

    return {
      ...rawData,
      videos: allVideos,
      totalResults: allVideos.length,
    };
  }, [rawData, activeTab, selectedDateFilter, selectedRegion, selectedSortOrder, dateFilterCache]);

  const handleNextPage = () => {
    if (data?.nextPageToken) {
      if (pageToken) {
        setPageHistory([...pageHistory, pageToken]);
      }
      setPageToken(data.nextPageToken);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePrevPage = () => {
    if (pageHistory.length > 0) {
      const newHistory = [...pageHistory];
      const prevToken = newHistory.pop();
      setPageHistory(newHistory);
      setPageToken(prevToken || undefined);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      setPageToken(undefined);
      setPageHistory([]);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  if (error) {
    return (
      <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6">
        <h3 className="text-destructive font-semibold mb-2">오류가 발생했습니다</h3>
        <p className="text-destructive/80 mb-4">{error instanceof Error ? error.message : "알 수 없는 오류"}</p>
        <Button onClick={() => refetch()} variant="destructive" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          다시 시도
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (!data || data.videos.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-600 dark:text-gray-400 mb-4">표시할 영상이 없습니다.</p>
      </div>
    );
  }

  const currentPage = pageToken === undefined ? 1 : pageHistory.length + 2;
  const hasNextPage = !!data?.nextPageToken;
  const hasPrevPage = pageHistory.length > 0 || pageToken !== undefined;

  return (
    <div>
      {/* 탭 메뉴 */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="mb-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="popular" className="gap-2">
            <Video className="h-4 w-4" />
            인기 영상
          </TabsTrigger>
          <TabsTrigger value="shorts" className="gap-2">
            <Scissors className="h-4 w-4" />
            쇼츠
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* 국가 필터 */}
      <div className="mb-6">
        <p className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
          <Globe className="h-4 w-4" />
          국가
        </p>
        <div className="flex flex-wrap gap-2">
          {[
            { code: "KR", name: "한국", flag: "🇰🇷" },
            { code: "US", name: "미국", flag: "🇺🇸" },
            { code: "JP", name: "일본", flag: "🇯🇵" },
          ].map((region) => (
            <Button
              key={region.code}
              onClick={() => handleRegionChange(region.code)}
              variant={selectedRegion === region.code ? "default" : "outline"}
              size="sm"
              className={selectedRegion === region.code ? "bg-red-600 hover:bg-red-700 text-white border-red-600" : ""}
            >
              <span className="mr-1.5">{region.flag}</span>
              {region.name}
            </Button>
          ))}
        </div>
      </div>

      {/* 날짜 필터 */}
      <div className="mb-6">
        <p className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          기간
        </p>
        <div className="flex flex-wrap gap-2">
          {[
            { id: "today", name: "오늘" },
            { id: "week", name: "1주일" },
            { id: "month", name: "1개월" },
            { id: "3months", name: "3개월" },
          ].map((filter) => (
            <Button
              key={filter.id}
              onClick={() => handleDateFilterChange(filter.id)}
              variant={selectedDateFilter === filter.id ? "default" : "outline"}
              size="sm"
              className={
                selectedDateFilter === filter.id ? "bg-red-600 hover:bg-red-700 text-white border-red-600" : ""
              }
            >
              {filter.name}
            </Button>
          ))}
        </div>
      </div>

      {/* 정렬 필터 */}
      <div className="mb-6">
        <p className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
          <ArrowUpDown className="h-4 w-4" />
          정렬
        </p>
        <div className="flex flex-wrap gap-2">
          {[
            { id: "popular", name: "인기순" },
            { id: "date", name: "최신순" },
          ].map((sort) => (
            <Button
              key={sort.id}
              onClick={() => handleSortOrderChange(sort.id)}
              variant={selectedSortOrder === sort.id ? "default" : "outline"}
              size="sm"
              className={selectedSortOrder === sort.id ? "bg-red-600 hover:bg-red-700 text-white border-red-600" : ""}
            >
              {sort.name}
            </Button>
          ))}
        </div>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <p className="text-gray-600 dark:text-gray-400">
            {activeTab === "shorts" ? "쇼츠" : "인기 영상"}
            {activeTab === "popular" && ` - 현재 페이지: ${currentPage}`}
            {data.totalResults > 0 && (
              <span className="ml-2 text-sm text-muted-foreground">(표시된 영상: {data.videos.length}개)</span>
            )}
          </p>
        </div>
        <Button
          onClick={() => {
            setPageToken(undefined);
            setPageHistory([]);
            refetch();
          }}
          variant="secondary"
          size="sm"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          새로고침
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {data.videos.map((video) => (
          <VideoCard key={video.id} video={video} />
        ))}
      </div>

      {/* 인기 영상일 때만 페이지네이션 표시 */}
      {activeTab === "popular" && (hasNextPage || hasPrevPage) && (
        <div className="mt-8 flex justify-center items-center gap-4">
          <Button onClick={handlePrevPage} disabled={!hasPrevPage} variant="outline" size="default">
            <ChevronLeft className="h-4 w-4 mr-2" />
            이전
          </Button>
          <span className="text-muted-foreground px-4">페이지 {currentPage}</span>
          <Button onClick={handleNextPage} disabled={!hasNextPage} variant="outline" size="default">
            다음
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
}
