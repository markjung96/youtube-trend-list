import { VideoList } from "@/components/video-list";

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <p className="text-muted-foreground">조회수가 높은 유튜브 영상들을 확인해보세요</p>
        </div>
        <VideoList />
      </div>
    </main>
  );
}
