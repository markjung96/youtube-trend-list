"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { VideoCard } from "./video-card";
import { VideoListResponse, DATE_FILTERS, DateFilter } from "@/lib/types";
import { VIDEO_CATEGORIES } from "@/lib/categories";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RefreshCw, ChevronLeft, ChevronRight, Video, Scissors, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
async function fetchVideos(
  pageToken?: string,
  categoryId?: string,
  type: "popular" | "shorts" = "shorts",
  regionCode?: string,
  dateFilter?: DateFilter
): Promise<VideoListResponse> {
  let url = `/api/youtube?maxResults=25&regionCode=${regionCode || "KR"}&type=${type}`;
  if (pageToken) {
    url += `&pageToken=${pageToken}`;
  }
  // 두 탭 모두에서 카테고리 필터 사용
  if (categoryId) {
    url += `&videoCategoryId=${categoryId}`;
  }
  // 날짜 필터 추가
  if (dateFilter && dateFilter !== "all") {
    url += `&dateFilter=${dateFilter}`;
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
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedRegion, setSelectedRegion] = useState<string>("KR");
  const [activeTab, setActiveTab] = useState<"popular" | "shorts">("shorts");
  const [selectedDateFilter, setSelectedDateFilter] = useState<DateFilter>("all");

  // 탭 변경 시 페이지 초기화
  const handleTabChange = (value: string) => {
    setActiveTab(value as "popular" | "shorts");
    setPageToken(undefined);
    setPageHistory([]);
    // 카테고리는 유지 (두 탭 공통 사용)
  };

  // 지역 변경 시 페이지 초기화
  const handleRegionChange = (regionCode: string) => {
    setSelectedRegion(regionCode);
    setPageToken(undefined);
    setPageHistory([]);
  };

  // 카테고리 변경 시 페이지 초기화
  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setPageToken(undefined);
    setPageHistory([]);
  };

  // 날짜 필터 변경 시 페이지 초기화
  const handleDateFilterChange = (dateFilter: DateFilter) => {
    setSelectedDateFilter(dateFilter);
    setPageToken(undefined);
    setPageHistory([]);
  };

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["videos", pageToken, selectedCategory, activeTab, selectedRegion, selectedDateFilter],
    queryFn: () => fetchVideos(pageToken, selectedCategory, activeTab, selectedRegion, selectedDateFilter),
    enabled: true,
  });

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
      // 첫 페이지로 돌아가기
      setPageToken(undefined);
      setPageHistory([]);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (error) {
    // 필터 초기화 함수
    const handleResetFilters = () => {
      setSelectedCategory("");
      setSelectedRegion("KR");
      setSelectedDateFilter("all");
      setPageToken(undefined);
      setPageHistory([]);
    };

    return (
      <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6">
        <h3 className="text-destructive font-semibold mb-2">
          오류가 발생했습니다
        </h3>
        <p className="text-destructive/80 mb-4">
          {error instanceof Error ? error.message : "알 수 없는 오류"}
        </p>
        <div className="flex gap-2">
          <Button
            onClick={() => refetch()}
            variant="destructive"
            size="sm"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            다시 시도
          </Button>
          <Button
            onClick={handleResetFilters}
            variant="outline"
            size="sm"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            필터 초기화
          </Button>
        </div>
      </div>
    );
  }

  // 필터 초기화 함수
  const handleResetFilters = () => {
    setSelectedCategory("");
    setSelectedRegion("KR");
    setSelectedDateFilter("all");
    setPageToken(undefined);
    setPageHistory([]);
  };

  if (!data || data.videos.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          표시할 영상이 없습니다.
        </p>
        <p className="text-sm text-muted-foreground mb-6">
          필터 조건이 너무 엄격하거나 선택한 지역에서 영상이 없을 수 있습니다.
        </p>
        <Button
          onClick={handleResetFilters}
          variant="outline"
          size="default"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          필터 초기화
        </Button>
      </div>
    );
  }

  // 페이지네이션: YouTube API는 정확한 총 페이지 수를 제공하지 않으므로
  // nextPageToken/prevPageToken 기반으로만 표시
  // pageToken이 undefined면 첫 페이지(1), 있으면 pageHistory.length + 2
  const currentPage = pageToken === undefined ? 1 : pageHistory.length + 2;
  // totalPages는 정확히 계산할 수 없으므로 표시하지 않음
  // (YouTube API는 무한 스크롤 방식의 페이지네이션을 사용)
  // 쇼츠는 페이지네이션 없이 모든 결과를 표시
  const hasNextPage = activeTab === "shorts" ? false : !!data?.nextPageToken;
  const hasPrevPage = activeTab === "shorts" ? false : (pageHistory.length > 0 || pageToken !== undefined);

  return (
    <div>
      {/* 탭 메뉴 */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="mb-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="shorts" className="gap-2">
            <Scissors className="h-4 w-4" />
            쇼츠
          </TabsTrigger>
          <TabsTrigger value="popular" className="gap-2">
            <Video className="h-4 w-4" />
            인기 영상
          </TabsTrigger>
        </TabsList>

        <TabsContent value="shorts" className="mt-6">
          {/* 카테고리 필터 (쇼츠 탭) */}
          <div className="mb-6">
            <p className="text-sm text-muted-foreground mb-2">카테고리</p>
            <div className="flex flex-wrap gap-2">
              {VIDEO_CATEGORIES.map((category) => {
                const Icon = category.icon;
                return (
                  <Button
                    key={category.id}
                    onClick={() => handleCategoryChange(category.id)}
                    variant={selectedCategory === category.id ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "gap-2",
                      selectedCategory === category.id &&
                        "bg-red-600 hover:bg-red-700 text-white border-red-600"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {category.name}
                  </Button>
                );
              })}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="popular" className="mt-6">
          {/* 카테고리 필터 (인기 영상 탭) */}
          <div className="mb-6">
            <p className="text-sm text-muted-foreground mb-2">카테고리</p>
            <div className="flex flex-wrap gap-2">
              {VIDEO_CATEGORIES.map((category) => {
                const Icon = category.icon;
                return (
                  <Button
                    key={category.id}
                    onClick={() => handleCategoryChange(category.id)}
                    variant={selectedCategory === category.id ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "gap-2",
                      selectedCategory === category.id &&
                        "bg-red-600 hover:bg-red-700 text-white border-red-600"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {category.name}
                  </Button>
                );
              })}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* 공통 필터: 지역 선택 */}
      <div className="mb-6">
        <p className="text-sm text-muted-foreground mb-2">지역</p>
        <div className="flex flex-wrap gap-2">
          {[
            { code: "KR", name: "한국" },
            { code: "US", name: "미국" },
            { code: "JP", name: "일본" },
            { code: "GB", name: "영국" },
            { code: "CN", name: "중국" },
          ].map((region) => (
            <Button
              key={region.code}
              onClick={() => handleRegionChange(region.code)}
              variant={selectedRegion === region.code ? "default" : "outline"}
              size="sm"
              className={cn(
                selectedRegion === region.code &&
                  "bg-red-600 hover:bg-red-700 text-white border-red-600"
              )}
            >
              {region.name}
            </Button>
          ))}
        </div>
      </div>

      {/* 공통 필터: 날짜 선택 */}
      <div className="mb-6">
        <p className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          기간
        </p>
        <div className="flex flex-wrap gap-2">
          {DATE_FILTERS.map((filter) => (
            <Button
              key={filter.id}
              onClick={() => handleDateFilterChange(filter.id as DateFilter)}
              variant={selectedDateFilter === filter.id ? "default" : "outline"}
              size="sm"
              className={cn(
                selectedDateFilter === filter.id &&
                  "bg-red-600 hover:bg-red-700 text-white border-red-600"
              )}
            >
              {filter.name}
            </Button>
          ))}
        </div>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <p className="text-gray-600 dark:text-gray-400">
            현재 페이지: {currentPage}
            {data.totalResults > 0 && (
              <span className="ml-2 text-sm text-muted-foreground">
                (표시된 영상: {data.videos.length}개)
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
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
          <Button
            onClick={handleResetFilters}
            variant="outline"
            size="sm"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            필터 초기화
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {data.videos.map((video) => (
          <VideoCard key={video.id} video={video} />
        ))}
      </div>
      
      {/* 페이지네이션 컨트롤 */}
      {(hasNextPage || hasPrevPage) && (
        <div className="mt-8 flex justify-center items-center gap-4">
          <Button
            onClick={handlePrevPage}
            disabled={!hasPrevPage}
            variant="outline"
            size="default"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            이전
          </Button>
                  <span className="text-muted-foreground px-4">
                    페이지 {currentPage}
                  </span>
          <Button
            onClick={handleNextPage}
            disabled={!hasNextPage}
            variant="outline"
            size="default"
          >
            다음
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
}

