// src/types.ts

export interface User {
  id: string;
  name: string;
}

export interface Routine {
  id: string;
  name: string;
  frequency: "weekly" | "interval";
  // frequencyData 타입을 좀 더 명확하게 정의합니다.
  frequencyData: { days: number } | string[]; 
  // completions 배열의 타입을 변경합니다. 각 완료 기록은 날짜와 (선택적으로) 소요 시간을 포함합니다.
  completions: { date: string; duration?: number; }[]; // duration은 초 단위
  color: string; // 루틴의 테마 색상 추가
  // timerDuration 필드는 스톱워치로 변경되면서 더 이상 필요하지 않습니다.
}