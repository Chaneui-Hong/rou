// src/RoutineDetail.tsx

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { User, Routine } from "./types";
import { Link } from "wouter";

interface Props {
  user: User;
  routine: Routine;
  onDeleteRoutine: (routineId: string) => void;
  onMarkComplete: (routineId: string, updatedRoutine: Routine) => void;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export default function RoutineDetail({ user, routine, onDeleteRoutine, onMarkComplete, showToast }: Props) {
  const [currentRoutine, setCurrentRoutine] = useState<Routine>(routine);
  const [isStopwatchRunning, setIsStopwatchRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0); // 초 단위
  const stopwatchRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0); // 스톱워치 시작 시간 (performance.now())

  // 루틴 prop이 변경될 때마다 currentRoutine 상태 업데이트 및 스톱워치 초기화
  useEffect(() => {
    setCurrentRoutine(routine);
    // 루틴 변경 시 스톱워치 상태 초기화
    setIsStopwatchRunning(false);
    setElapsedTime(0);
    if (stopwatchRef.current) {
        clearInterval(stopwatchRef.current);
        stopwatchRef.current = null;
    }
    startTimeRef.current = 0;
  }, [routine]);

  // 스톱워치 로직
  useEffect(() => {
    if (isStopwatchRunning) {
        startTimeRef.current = performance.now() - elapsedTime * 1000; // 스톱워치 재개 시, 현재 시간에서 경과 시간만큼 빼서 시작 시간 조정
        stopwatchRef.current = setInterval(() => {
            setElapsedTime(Math.floor((performance.now() - startTimeRef.current) / 1000));
        }, 1000);
    } else if (!isStopwatchRunning && stopwatchRef.current) {
        clearInterval(stopwatchRef.current);
        stopwatchRef.current = null;
    }
    return () => {
        if (stopwatchRef.current) {
            clearInterval(stopwatchRef.current);
        }
    };
  }, [isStopwatchRunning, elapsedTime]); // elapsedTime을 의존성 배열에 추가하여 상태 변경 시 재실행

  // 루틴 완료 처리 함수 (스톱워치 시간 포함)
  const handleRoutineCompletion = useCallback((durationInSeconds?: number) => {
    if (!currentRoutine) return;
    const todayStr = new Date().toISOString().slice(0, 10);

    // 오늘 이미 완료된 기록이 있는지 확인
    const isCompletedTodayCheck = currentRoutine.completions.some(c => c.date === todayStr);

    if (isCompletedTodayCheck) {
      showToast("오늘의 루틴은 이미 완료되었습니다!", "info");
      return;
    }

    // 스톱워치 중지 (완료 시)
    setIsStopwatchRunning(false);
    if (stopwatchRef.current) {
      clearInterval(stopwatchRef.current);
      stopwatchRef.current = null;
    }
    
    // completion 객체 생성 (duration 포함)
    const newCompletion = { 
        date: todayStr, 
        duration: durationInSeconds !== undefined ? durationInSeconds : elapsedTime 
    };

    const updatedRoutine = {
      ...currentRoutine,
      // completions 배열에 새로운 completion을 추가하고 날짜 기준으로 내림차순 정렬
      completions: [...currentRoutine.completions, newCompletion].sort((a, b) => b.date.localeCompare(a.date)),
    };
    onMarkComplete(currentRoutine.id, updatedRoutine); // 완료 처리
    showToast("루틴을 완료했습니다! 🎉", "success");
    setElapsedTime(0); // 완료 후 스톱워치 시간 초기화
  }, [currentRoutine, onMarkComplete, showToast, elapsedTime]);


  const handleStartStopwatch = () => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const isCompletedTodayCheck = currentRoutine.completions.some(c => c.date === todayStr);

    if (isCompletedTodayCheck) {
      showToast("오늘의 루틴은 이미 완료되었습니다!", "info");
      return;
    }
    setIsStopwatchRunning(true);
    startTimeRef.current = performance.now() - elapsedTime * 1000; // 재개 시를 위해 현재 elapsedTime 반영
    showToast("스톱워치가 시작되었습니다!", "info");
  };

  const handlePauseStopwatch = () => {
    setIsStopwatchRunning(false);
    showToast("스톱워치가 일시 중지되었습니다.", "info");
  };

  const handleDelete = () => {
    if (window.confirm("정말로 이 루틴을 삭제하시겠습니까?")) {
      onDeleteRoutine(currentRoutine.id); // App.tsx에 삭제 위임
    }
  };

  // 계산 로직들을 useMemo로 감싸 불필요한 재계산을 방지
  const { nextDueDate, progressPercent, isCompletedToday } = useMemo(() => {
    if (!currentRoutine) return { nextDueDate: null, progressPercent: 0, isCompletedToday: false };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const isCompletedFunc = (date: Date) => {
        const dStr = date.toISOString().slice(0, 10);
        return currentRoutine.completions.some(c => c.date === dStr); // completion 객체 확인
    };

    const getNextDueFunc = () => {
      const completedDatesSet = new Set(currentRoutine.completions.map(c => c.date));
      if (currentRoutine.frequency === "weekly") {
        const dayMap: { [key: string]: number } = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
        const daysNum = (currentRoutine.frequencyData as string[]).map(d => dayMap[d]);
        if (daysNum.length === 0) return null;

        for (let i = 0; i < 365; i++) {
          const checkDay = new Date(today);
          checkDay.setDate(today.getDate() + i);
          if (daysNum.includes(checkDay.getDay()) && !completedDatesSet.has(checkDay.toISOString().slice(0, 10))) {
            return checkDay;
          }
        }
      } else { // interval
        const interval = (currentRoutine.frequencyData as { days: number }).days;
        // 가장 최근 완료일을 찾고, 없으면 1970-01-01을 사용
        const lastCompletedDateStr = currentRoutine.completions.length > 0 
            ? currentRoutine.completions.sort((a, b) => b.date.localeCompare(a.date))[0].date 
            : "1970-01-01"; 
        const lastCompletedDate = new Date(lastCompletedDateStr);
        lastCompletedDate.setHours(0,0,0,0);

        let nextDate = new Date(lastCompletedDate);
        nextDate.setDate(lastCompletedDate.getDate() + interval);
        // 만약 다음 예정일이 오늘보다 이전이면 오늘로 설정
        return nextDate < today ? today : nextDate;
      }
      return null;
    };
    
    const nextDue = getNextDueFunc();
    if (!nextDue) return { nextDueDate: null, progressPercent: 0, isCompletedToday: isCompletedFunc(new Date()) };

    const getProgressPercentFunc = () => {
      if (isCompletedFunc(today)) return 100;

      if (currentRoutine.frequency === 'weekly') {
        const dayMap: { [key: string]: number } = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
        const routineDaysOfWeek = (currentRoutine.frequencyData as string[]).map(d => dayMap[d]);

        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay()); 
        startOfWeek.setHours(0,0,0,0);

        let completedCountThisWeek = 0;
        let totalDueCountThisWeek = 0;

        for (let i = 0; i < 7; i++) {
            const checkDate = new Date(startOfWeek);
            checkDate.setDate(startOfWeek.getDate() + i);
            if (routineDaysOfWeek.includes(checkDate.getDay())) {
                totalDueCountThisWeek++;
                if (isCompletedFunc(checkDate)) {
                    completedCountThisWeek++;
                }
            }
        }
        
        if (totalDueCountThisWeek === 0) return 0;
        return (completedCountThisWeek / totalDueCountThisWeek) * 100;

      } else { // interval
        const interval = (currentRoutine.frequencyData as { days: number }).days;
        const lastCompletedDateStr = currentRoutine.completions.length > 0 
            ? currentRoutine.completions.sort((a, b) => b.date.localeCompare(a.date))[0].date 
            : "1970-01-01";
        const lastCompletedDate = new Date(lastCompletedDateStr);
        lastCompletedDate.setHours(0,0,0,0);

        const elapsedDays = Math.floor((today.getTime() - lastCompletedDate.getTime()) / (1000 * 60 * 60 * 24));
        
        const progress = (elapsedDays / interval) * 100;
        return Math.max(0, Math.min(100, progress));
      }
    };

    return {
        nextDueDate: nextDue,
        progressPercent: getProgressPercentFunc(),
        isCompletedToday: isCompletedFunc(new Date()),
    };
  }, [currentRoutine]);

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    // 시가 0이 아니면 HH:MM:SS, 아니면 MM:SS
    if (hours > 0) {
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatCompletionDate = (completion: { date: string; duration?: number; }) => {
    const date = new Date(completion.date);
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' };
    let dateStr = date.toLocaleDateString('ko-KR', options);

    if (completion.duration !== undefined) {
        dateStr += ` (${formatTime(completion.duration)})`;
    }
    return dateStr;
  };

  if (!currentRoutine) { 
    return <div className="text-center p-10">루틴을 찾을 수 없습니다.</div>;
  }
  
  return (
    <div className="space-y-6 sm:space-y-8">
      <h1 className="text-3xl font-bold text-center text-gray-800 sm:text-4xl">{currentRoutine.name}</h1>
      <Link href="/">
        <a className="absolute top-4 left-4 text-blue-600 hover:text-blue-800 text-sm sm:text-base transition-colors duration-200">
          &larr; 루틴 목록
        </a>
      </Link>

      {/* 원형 진행률 바에 테마 색상 적용 */}
      <div className="relative w-40 h-40 sm:w-56 sm:h-56 mx-auto shadow-lg rounded-full flex items-center justify-center p-2 bg-white">
        <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
          <circle cx="18" cy="18" r="15.9155" className="text-gray-200" strokeWidth="3" stroke="currentColor" fill="transparent" />
          <circle cx="18" cy="18" r="15.9155" stroke={currentRoutine.color || '#3B82F6'} strokeWidth="3" fill="transparent"
            strokeDasharray={`${progressPercent}, 100`} strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-3xl font-bold text-blue-600 sm:text-5xl" style={{ color: currentRoutine.color || '#3B82F6' }}>
          {Math.round(progressPercent)}%
        </div>
      </div>
      
      <div className="text-center text-gray-600 text-base sm:text-lg">
        {(() => {
          if (!nextDueDate) return <p>다음 루틴 일정을 계산할 수 없습니다.</p>;
          const now = new Date();
          const diffMs = nextDueDate.getTime() - now.getTime();
          if (diffMs <= 0) {
            return <p className="font-semibold" style={{ color: currentRoutine.color || '#3B82F6' }}>{isCompletedToday ? "오늘 완료!" : "오늘이 루틴 실행일입니다!"}</p>;
          }
          const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          const diffHours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
          
          let message = "";
          if (diffDays > 0) {
            message += `${diffDays}일 `;
          }
          if (diffHours > 0 || diffDays === 0) { 
            message += `${diffHours}시간 `;
          }
          message += "남음";

          return (
            <p>
              다음 루틴까지:{" "}
              <span className="font-semibold text-gray-800">{message.trim()}</span>
            </p>
          );
        })()}
      </div>

      {isCompletedToday ? (
        <button
          className="w-full py-3 rounded-lg text-white font-semibold text-lg disabled:bg-gray-400 sm:py-4 sm:text-xl shadow-md cursor-not-allowed"
          style={{ backgroundColor: currentRoutine.color || '#3B82F6' }}
          disabled
        >
          오늘 완료!
        </button>
      ) : (
        <>
          {isStopwatchRunning ? (
            <div className="text-center">
              <p className="text-5xl sm:text-6xl font-bold text-gray-800 mb-4">{formatTime(elapsedTime)}</p>
              <div className="flex justify-center gap-4">
                <button
                  onClick={handlePauseStopwatch}
                  className="px-6 py-3 rounded-lg border text-blue-600 font-semibold hover:bg-blue-50 transition-all duration-200 text-lg sm:text-xl shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
                  style={{ borderColor: currentRoutine.color || '#3B82F6', color: currentRoutine.color || '#3B82F6' }}
                >
                  일시 정지
                </button>
                <button
                  onClick={() => handleRoutineCompletion(elapsedTime)} {/* 현재 경과 시간으로 완료 */}
                  className="px-6 py-3 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 transition-all duration-200 text-lg sm:text-xl shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2"
                >
                  완료하기
                </button>
              </div>
            </div>
          ) : (
            <button
              className="w-full py-3 rounded-lg text-white font-semibold text-lg hover:brightness-110 transition-all duration-200 disabled:bg-gray-400 sm:py-4 sm:text-xl shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
              style={{ backgroundColor: currentRoutine.color || '#3B82F6', '--tw-ring-color': currentRoutine.color || '#3B82F6' }}
              onClick={handleStartStopwatch}
              disabled={isCompletedToday}
            >
              오늘 루틴 시작하기
            </button>
          )}
        </>
      )}

      <div className="flex flex-col sm:flex-row justify-center gap-4 mt-4">
        <Link href={`/edit-routine/${currentRoutine.id}`}>
          <a 
            className="inline-block w-full sm:w-auto text-center px-4 py-2 border rounded-lg hover:bg-opacity-10 transition-all duration-200 text-base sm:text-lg shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2"
            style={{ borderColor: currentRoutine.color || '#3B82F6', color: currentRoutine.color || '#3B82F6', backgroundColor: `rgba(${parseInt((currentRoutine.color || '#3B82F6').slice(1,3), 16)}, ${parseInt((currentRoutine.color || '#3B82F6').slice(3,5), 16)}, ${parseInt((currentRoutine.color || '#3B82F6').slice(5,7), 16)}, 0.05)` }}
          >
            루틴 수정
          </a>
        </Link>
        <button
          onClick={handleDelete}
          className="w-full sm:w-auto px-4 py-2 border border-red-600 text-red-600 rounded-lg hover:bg-red-50 transition-all duration-200 text-base sm:text-lg shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2"
        >
          루틴 삭제
        </button>
      </div>

      <div className="mt-8 pt-6 border-t border-gray-200">
        <h3 className="text-xl font-bold mb-4 text-center text-gray-800 sm:text-2xl">완료 기록</h3>
        {currentRoutine.completions && currentRoutine.completions.length > 0 ? (
          <ul className="space-y-2 max-h-60 overflow-y-auto pr-2 sm:max-h-80">
            {currentRoutine.completions.map((completion, index) => (
              <li key={completion.date + index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg shadow-sm text-base sm:text-lg">
                <span className="text-gray-700 font-medium">
                    {formatCompletionDate(completion)}
                </span>
                <svg className="w-5 h-5 text-green-500 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-center text-gray-500 text-base sm:text-lg">아직 완료된 기록이 없습니다.</p>
        )}
      </div>
    </div>
  );
}