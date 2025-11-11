import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(num: number): string {
  // 1억 이상
  if (num >= 100000000) {
    const eok = num / 100000000;
    return eok.toFixed(1).replace(/\.0$/, "") + "억";
  }
  // 1만 이상
  if (num >= 10000) {
    const man = num / 10000;
    return man.toFixed(1).replace(/\.0$/, "") + "만";
  }
  // 1천 이상 - 쉼표 추가
  if (num >= 1000) {
    return num.toLocaleString("ko-KR");
  }
  return num.toString();
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return "오늘";
  if (days === 1) return "어제";
  if (days < 7) return `${days}일 전`;
  if (days < 30) return `${Math.floor(days / 7)}주 전`;
  if (days < 365) return `${Math.floor(days / 30)}개월 전`;
  return `${Math.floor(days / 365)}년 전`;
}

