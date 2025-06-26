// src/RoutineListScreen.tsx

import { User, Routine } from "./types";
import { Link } from "wouter";
import { useMemo, useCallback } from "react";

interface Props {
  user: User;
  routines: Routine[];
  onEditRoutine: (routineId: string) => void;
  onAddRoutine: () => void;
}

export default function RoutineListScreen({ user, routines, onEditRoutine, onAddRoutine }: Props) {

  const formatFrequency = (routine: Routine) => {
    if (routine.frequency === "weekly") {
      const daysMap: { [key: string]: string } = {
        monday: "월", tuesday: "화", wednesday: "수", thursday: "목",
        friday: "금", saturday: "토", sunday: "일"
      };
      const sortedDays = (routine.frequencyData as string[]).map(day => daysMap[day]).sort((a,b) => {
        const order = ['월', '화', '수', '목', '금', '토', '일'];
        return order.indexOf(a) - order.indexOf(b);
      });
      return sortedDays.length > 0 ? sortedDays.join(", ") : "요일 미선택";
    } else {
      return `${(routine.frequencyData as { days: number }).days}일마다`;
    }
  };

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0,0,0,0);
    return d;
  }, []);

  const getStatusMessage = useCallback((routine: Routine) => {
    const isCompletedToday = routine.completions.some(c => c.date === today.toISOString().slice(0, 10));

    if (isCompletedToday) {
      return { text: "오늘 완료! 🎉", color: "text-green-600" };
    }

    // 다음 예정일 계산 로직 (RoutineDetail과 동일하게)
    const getNextDueFunc = () => {
      const completedDatesSet = new Set(routine.completions.map(c => c.date));
      if (routine.frequency === "weekly") {
        const dayMap: { [key: string]: number } = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
        const daysNum = (routine.frequencyData as string[]).map(d => dayMap[d]);
        if (daysNum.length === 0) return null;

        for (let i = 0; i < 7; i++) { // 오늘부터 7일 이내만 확인
          const checkDay = new Date(today);
          checkDay.setDate(today.getDate() + i);
          if (daysNum.includes(checkDay.getDay()) && !completedDatesSet.has(checkDay.toISOString().slice(0, 10))) {
            return checkDay;
          }
        }
      } else { // interval
        const interval = (routine.frequencyData as { days: number }).days;
        const lastCompletedDateStr = routine.completions.length > 0 
            ? routine.completions.sort((a, b) => b.date.localeCompare(a.date))[0].date 
            : "1970-01-01"; 
        const lastCompletedDate = new Date(lastCompletedDateStr);
        lastCompletedDate.setHours(0,0,0,0);

        let nextDate = new Date(lastCompletedDate);
        nextDate.setDate(lastCompletedDate.getDate() + interval);
        return nextDate < today ? today : nextDate;
      }
      return null;
    };

    const nextDueDate = getNextDueFunc();
    if (!nextDueDate) {
      return { text: "일정 없음", color: "text-gray-500" };
    }

    const diffMs = nextDueDate.getTime() - today.getTime();
    if (diffMs <= 0) { // 오늘이 예정일
      return { text: "오늘 예정", color: "text-blue-600" };
    }

    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      return { text: "내일 예정", color: "text-orange-500" };
    }
    return { text: `${diffDays}일 후 예정`, color: "text-gray-500" };

  }, [routines, today]);


  return (
    <div className="space-y-6 sm:space-y-8">
      <h1 className="text-3xl font-bold text-center text-gray-800 sm:text-4xl">
        {user.name}님의 루틴
      </h1>

      <button
        onClick={onAddRoutine}
        className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors duration-200 text-lg sm:text-xl shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
      >
        새 루틴 추가
      </button>

      {routines.length === 0 ? (
        <p className="text-center text-gray-500 mt-8 text-base sm:text-lg">
          아직 등록된 루틴이 없습니다. 첫 루틴을 추가해보세요!
        </p>
      ) : (
        <ul className="space-y-4">
          {routines.map((routine) => {
            const status = getStatusMessage(routine);
            return (
              <li
                key={routine.id}
                className="bg-white rounded-xl shadow-md p-4 sm:p-5 flex justify-between items-center transition-transform transform hover:scale-[1.01] hover:shadow-lg border-l-4"
                style={{ borderColor: routine.color || '#3B82F6' }}
              >
                <Link href={`/detail/${routine.id}`} className="flex-grow min-w-0 mr-4">
                  <a className="block"> {/* Link의 자식은 <a> 태그여야 하므로 추가 */}
                    <h2 className="text-xl font-semibold text-gray-800 truncate sm:text-2xl" style={{ color: routine.color || '#3B82F6' }}>{routine.name}</h2>
                    <p className="text-gray-600 text-sm sm:text-base">{formatFrequency(routine)}</p>
                    <p className={`text-sm font-medium mt-1 ${status.color} sm:text-base`}>{status.text}</p>
                  </a>
                </Link>
                <button
                  onClick={() => onEditRoutine(routine.id)}
                  className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md text-sm hover:bg-gray-300 transition-colors duration-200 sm:px-4 sm:py-2 sm:text-base"
                >
                  수정
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}