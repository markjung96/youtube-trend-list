import type React from "react";
import {
  Tv,
  Film,
  Car,
  Music,
  Heart,
  Trophy,
  Gamepad2,
  Plane,
  Laugh,
  Theater,
  Newspaper,
  Sparkles,
  GraduationCap,
  Microscope,
  HandHeart,
} from "lucide-react";

export interface VideoCategory {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const VIDEO_CATEGORIES: VideoCategory[] = [
  { id: "", name: "전체", icon: Tv },
  { id: "1", name: "영화 및 애니메이션", icon: Film },
  { id: "2", name: "자동차", icon: Car },
  { id: "10", name: "음악", icon: Music },
  { id: "15", name: "애완동물", icon: Heart },
  { id: "17", name: "스포츠", icon: Trophy },
  { id: "20", name: "게임", icon: Gamepad2 },
  { id: "22", name: "여행", icon: Plane },
  { id: "23", name: "코미디", icon: Laugh },
  { id: "24", name: "엔터테인먼트", icon: Theater },
  { id: "25", name: "뉴스", icon: Newspaper },
  { id: "26", name: "뷰티 & 스타일", icon: Sparkles },
  { id: "27", name: "교육", icon: GraduationCap },
  { id: "28", name: "과학 & 기술", icon: Microscope },
  { id: "29", name: "비영리", icon: HandHeart },
];
