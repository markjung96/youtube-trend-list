import { VideoList } from "@/components/video-list";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            YouTube 인기 영상
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            조회수가 높은 유튜브 영상들을 확인해보세요
          </p>
        </header>
        <VideoList />
      </div>
    </main>
  );
}

