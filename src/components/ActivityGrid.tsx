"use client";

import {
  format,
  parseISO,
  eachDayOfInterval,
  startOfYear,
  endOfYear,
} from "date-fns";
import { useMemo, useState, useRef } from "react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Skeleton } from "./ui/skeleton";
import Image from "next/image";
import html2canvas from "html2canvas";
import ShareImage from "./ShareImage";
import { ShareIcon } from "lucide-react";
import { useGetActivities } from "@/hooks/queries/useGetActivities";
import { useQueryError } from "@/hooks/useQueryError";
import { useResponsive } from "@/hooks/useResponsive";
import { toast } from "@/hooks/use-toast";

type NavigatorWithCanShare = Navigator & {
  canShare?: (data: ShareData) => boolean;
};

interface ActivityGridProps {
  totalDistance: number | undefined;
}

interface CellContentProps {
  distance: number;
  isFirstDayOfMonth: boolean;
  date: Date;
  showDistance: boolean;
}

// 배경색에 따른 텍스트 색상 결정
const getTextColor = (distance: number) => {
  if (distance === 0) return "text-gray-900 dark:text-gray-100";
  if (distance < 5) return "text-gray-900 dark:text-gray-100";
  if (distance < 10) return "text-gray-900 dark:text-white";
  return "text-white dark:text-white";
};

function CellContent({
  distance,
  isFirstDayOfMonth,
  date,
  showDistance,
}: CellContentProps) {
  return (
    <div className="flex flex-col items-center justify-center w-full h-full">
      {isFirstDayOfMonth && (
        <span
          className={`
            text-sm md:text-lg font-semibold
            ${getTextColor(distance)}
            drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]
            dark:drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]
          `}
        >
          {format(date, "M")}월
        </span>
      )}
      {showDistance && distance > 0 && (
        <span
          className={`
            text-xs md:text-sm font-medium
            ${getTextColor(distance)}
            drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]
            dark:drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]
            ${isFirstDayOfMonth ? "mt-1" : ""}
          `}
        >
          {distance.toFixed(1)}km
        </span>
      )}
    </div>
  );
}

export default function ActivityGrid({ totalDistance }: ActivityGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const shareImageRef = useRef<HTMLDivElement>(null);
  const screenSize = useResponsive();
  const [isSharing, setIsSharing] = useState(false);

  const { onFailure } = useQueryError();

  const {
    data: activities,
    isLoading,
    // isError
  } = useGetActivities({
    ...onFailure,
  });
  // 활동 데이터로부터 연도 목록 추출
  const years = useMemo(() => {
    if (!activities?.length) return [];
    const yearSet = new Set(
      activities
        .filter((activity) => activity.type === "Run")
        .map((activity) => format(parseISO(activity.start_date), "yyyy"))
    );
    return Array.from(yearSet).sort();
  }, [activities]);

  const [selectedYear, setSelectedYear] = useState(
    years[0] || new Date().getFullYear().toString()
  );
  const [selectedDates, setSelectedDates] = useState<string[]>([]);

  // 선택된 연도의 활동 데이터 매핑
  const activityMap = useMemo(() => {
    const map = new Map<string, number>();

    activities
      ?.filter((activity) => activity.type === "Run")
      .forEach((activity) => {
        const date = format(parseISO(activity.start_date), "yyyy-MM-dd");
        if (!date.startsWith(selectedYear)) return;
        const distance = activity.distance / 1000;
        map.set(date, (map.get(date) || 0) + distance);
      });

    return map;
  }, [activities, selectedYear]);

  // 선택된 연도의 모든 날짜 생성
  const daysInYear = useMemo(() => {
    const start = startOfYear(new Date(parseInt(selectedYear), 0));
    const end = endOfYear(new Date(parseInt(selectedYear), 0));
    return eachDayOfInterval({ start, end });
  }, [selectedYear]);

  // 월별 날짜 그룹화
  const monthGroups = useMemo(() => {
    const groups: { [key: string]: Date[] } = {};
    daysInYear.forEach((date) => {
      const monthKey = format(date, "yyyy-MM");
      if (!groups[monthKey]) {
        groups[monthKey] = [];
      }
      groups[monthKey].push(date);
    });
    return groups;
  }, [daysInYear]);

  const getIntensityColor = (distance: number) => {
    if (distance === 0) return "bg-gray-100 dark:bg-gray-800";
    if (distance < 5) return "bg-green-100 dark:bg-green-900";
    if (distance < 10) return "bg-green-300 dark:bg-green-700";
    if (distance < 15) return "bg-green-500 dark:bg-green-600";
    return "bg-green-700 dark:bg-green-500";
  };

  const handleShare = async () => {
    if (!shareImageRef.current) return;

    if (isSharing) return;
    setIsSharing(true);
    const t = toast({
      title: "공유 이미지 생성 중",
      description: "잠시만 기다려주세요...",
    });

    try {
      const canvas = await html2canvas(shareImageRef.current, {
        backgroundColor: document.documentElement.classList.contains("dark")
          ? "#1a1a1a"
          : "#ffffff",
        scale: 2,
        useCORS: true,
      });

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => {
          if (!b)
            return reject(new Error("이미지 변환(toBlob)에 실패했습니다."));
          resolve(b);
        }, "image/png");
      });

      const file = new File([blob], "running-grass.png", { type: "image/png" });
      const nav = navigator as NavigatorWithCanShare;

      const canNativeShareFiles =
        typeof navigator !== "undefined" &&
        typeof navigator.share === "function" &&
        (typeof nav.canShare !== "function" || nav.canShare({ files: [file] }));

      if (canNativeShareFiles) {
        try {
          await navigator.share({
            files: [file],
            title: "나의 러닝 잔디밭",
            text: "스트라바 러닝 기록을 잔디밭으로 공유합니다!",
          });

          t.update({
            id: t.id,
            title: "공유 완료",
            description: "공유 창을 확인해주세요.",
          });
          return;
        } catch (error) {
          // 사용자가 공유 창을 닫은 경우(취소)는 실패로 취급하지 않음
          if (error instanceof DOMException && error.name === "AbortError") {
            t.update({
              id: t.id,
              title: "공유 취소",
              description: "공유가 취소되었습니다.",
            });
            return;
          }
          // 공유 실패 시 다운로드 fallback으로 이어짐
        }
      }

      // 네이티브 파일 공유가 불가능/실패하는 환경에서는 다운로드로 fallback
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = "running-grass.png";
      link.href = url;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      t.update({
        id: t.id,
        title: "이미지 다운로드",
        description: canNativeShareFiles
          ? "공유가 실패하여 다운로드로 대체했어요."
          : "브라우저가 파일 공유를 지원하지 않아 다운로드로 대체했어요.",
      });
    } catch (error) {
      console.error("Failed to share:", error);
      t.update({
        id: t.id,
        title: "공유 실패",
        description:
          "이미지 생성/공유 중 오류가 발생했습니다. 콘솔 로그를 확인해주세요.",
        variant: "destructive",
      });
    } finally {
      setIsSharing(false);
    }
  };

  // 활동 통계 계산
  const stats = useMemo(() => {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const totalDays = Math.floor(
      (now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)
    );
    const runningDays = activities?.filter(
      (a) =>
        a.type === "Run" &&
        format(parseISO(a.start_date), "yyyy") === now.getFullYear().toString()
    ).length;

    return {
      totalDays,
      runningDays,
    };
  }, [activities]);

  if (isLoading) {
    return <ActivityGridSkeleton />;
  }

  return (
    <div className="relative pb-16">
      <div
        ref={gridRef}
        className="space-y-4 bg-white dark:bg-gray-900 p-4 rounded-lg"
      >
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Image
              src="/images/grass.png"
              alt="러닝 잔디"
              width={24}
              height={24}
            />
            <span className="text-green-600 font-bold mt-1">러닝 잔디밭</span>
          </h2>
          <ScrollArea className="max-w-[60%]">
            <div className="flex space-x-[2px] p-1">
              {years.map((year) => (
                <Button
                  key={year}
                  variant={selectedYear === year ? "outline" : "ghost"}
                  size={screenSize === "mobile" ? "xs" : "sm"}
                  onClick={() => setSelectedYear(year)}
                  className="flex-shrink-0 text-sm md:text-base"
                >
                  {year}
                </Button>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
            <div
              key={day}
              className="text-center text-md md:text-lg text-gray-500 dark:text-gray-400"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-3">
          {Object.entries(monthGroups).map(([monthKey, dates]) => {
            const firstDate = dates[0];
            const startCol = firstDate.getDay();
            const monthLength = dates.length;
            const rowSpan = Math.ceil((monthLength + startCol) / 7);

            return (
              <div
                key={monthKey}
                className="col-span-7 grid grid-cols-7 relative"
                style={{
                  gridRow: `span ${rowSpan}`,
                }}
              >
                <div className="absolute inset-0 border border-gray-200 dark:border-gray-700 rounded-lg -m-0.5" />

                {/* 첫 주의 빈 셀들 */}
                {Array.from({ length: startCol }).map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square" />
                ))}

                {dates.map((date) => {
                  const dateStr = format(date, "yyyy-MM-dd");
                  const distance = activityMap.get(dateStr) || 0;
                  const isFirstDayOfMonth = date.getDate() === 1;
                  const isSelected = selectedDates.includes(dateStr);

                  return (
                    <div key={dateStr} className="relative group p-0.5">
                      <div
                        className={`aspect-square rounded-sm ${getIntensityColor(
                          distance
                        )}
                          hover:ring-2 hover:ring-offset-2 hover:ring-green-500/50 
                          dark:hover:ring-green-400/50 dark:ring-offset-gray-900
                          relative
                          cursor-pointer
                          ${
                            isFirstDayOfMonth
                              ? "flex items-center justify-center"
                              : ""
                          }
                          ${
                            isSelected
                              ? "ring-2 ring-offset-2 ring-green-500 dark:ring-green-400"
                              : ""
                          }`}
                        onClick={() => {
                          setSelectedDates((prev) =>
                            isSelected
                              ? prev.filter((d) => d !== dateStr)
                              : [...prev, dateStr]
                          );
                        }}
                        title={`${format(date, "M월 d일")}: ${distance.toFixed(
                          1
                        )}km`}
                      >
                        <CellContent
                          distance={distance}
                          isFirstDayOfMonth={isFirstDayOfMonth}
                          date={date}
                          showDistance={isSelected}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* 범례 */}
        <div className="flex items-center justify-end gap-2">
          <span className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
            짧게
          </span>
          {[0, 3, 7, 12, 20].map((value) => (
            <div
              key={value}
              className={`w-3 h-3 md:w-4 md:h-4 rounded-sm ${getIntensityColor(
                value
              )}`}
              title={`${value}km`}
            />
          ))}
          <span className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
            길게
          </span>
        </div>
      </div>

      {/* 공유용 이미지 (숨김) */}
      <div className="fixed left-[-9999px]" ref={shareImageRef}>
        <ShareImage
          activities={stats.runningDays || 0}
          totalDays={stats.totalDays || 0}
          year={selectedYear}
          activityMap={activityMap}
          totalDistance={Math.round((totalDistance || 0) / 1000)}
        />
      </div>

      {/* 공유하기 버튼 */}
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-10">
        <Button
          onClick={handleShare}
          disabled={isSharing}
          className="bg-green-500 hover:bg-green-600 text-white px-9 py-6 rounded-full shadow-lg
            flex items-center gap-2 transition-all duration-200 hover:scale-105"
        >
          <ShareIcon className="w-6 h-6" />
          <span className="text-lg md:text-xl font-bold mt-1">
            {isSharing ? "이미지 생성 중..." : "나의 잔디밭 공유하기"}
          </span>
        </Button>
      </div>
    </div>
  );
}

function ActivityGridSkeleton() {
  return (
    <div className="space-y-4">
      {/* 헤더 스켈레톤 */}
      <div className="flex justify-between items-center">
        <Skeleton className="h-7 w-32" /> {/* 활동 기록 제목 */}
        <div className="flex space-x-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-8 w-16" />
          ))}
        </div>
      </div>

      {/* 요일 레이블 스켈레톤 */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-5 w-full" />
        ))}
      </div>

      {/* 그리드 셀 스켈레톤 */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 42 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square w-full rounded-sm" />
        ))}
      </div>

      {/* 범례 스켈레톤 */}
      <div className="flex items-center justify-end gap-2">
        <Skeleton className="h-4 w-8" /> {/* Less */}
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-3 w-3 rounded-sm" />
        ))}
        <Skeleton className="h-4 w-8" /> {/* More */}
      </div>
    </div>
  );
}
