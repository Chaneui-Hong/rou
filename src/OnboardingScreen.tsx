// src/OnboardingScreen.tsx

import { useState, useEffect } from "react";
import { User, Routine } from "./types";
import { useLocation } from "wouter";

interface OnboardingProps {
  user: User;
  onSaveRoutine: (routine: Routine) => void;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
  isEditMode?: boolean;
  initialRoutine?: Routine;
}

export default function OnboardingScreen({ user, onSaveRoutine, showToast, isEditMode = false, initialRoutine }: OnboardingProps) {
  const [routineName, setRoutineName] = useState("");
  const [frequency, setFrequency] = useState<"weekly" | "interval">("weekly");
  const [weeklyDays, setWeeklyDays] = useState<string[]>([]);
  const [intervalDays, setIntervalDays] = useState(2);
  const [selectedColor, setSelectedColor] = useState("#3B82F6"); // 기본 색상: blue-600
  const [routineId, setRoutineId] = useState<string | undefined>(undefined);
  const [, setLocation] = useLocation();

  const [routineNameError, setRoutineNameError] = useState("");
  const [weeklyDaysError, setWeeklyDaysError] = useState("");

  useEffect(() => {
    if (isEditMode && initialRoutine) {
      setRoutineId(initialRoutine.id);
      setRoutineName(initialRoutine.name);
      setFrequency(initialRoutine.frequency);
      if (initialRoutine.frequency === "weekly") {
        setWeeklyDays(initialRoutine.frequencyData as string[]);
      } else {
        setIntervalDays((initialRoutine.frequencyData as { days: number }).days);
      }
      setSelectedColor(initialRoutine.color || "#3B82F6");
    } else {
      setRoutineId(undefined);
      setRoutineName("");
      setFrequency("weekly");
      setWeeklyDays([]);
      setIntervalDays(2);
      setSelectedColor("#3B82F6");
    }
  }, [isEditMode, initialRoutine]);

  const handleSubmit = () => {
    let hasError = false;
    if (!routineName.trim()) {
      setRoutineNameError("루틴 이름을 입력하세요.");
      hasError = true;
    } else {
      setRoutineNameError("");
    }

    if (frequency === "weekly" && weeklyDays.length === 0) {
      setWeeklyDaysError("요일을 최소 하나 선택하세요.");
      hasError = true;
    } else {
      setWeeklyDaysError("");
    }
    
    if (hasError) {
      return;
    }

    const routineToSave: Routine = {
      id: routineId || `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`, // 새 루틴일 경우 ID 생성
      name: routineName.trim(),
      frequency,
      frequencyData: frequency === "weekly" ? weeklyDays : { days: intervalDays },
      completions: initialRoutine?.completions || [], // 기존 completions 유지
      color: selectedColor,
    };
    
    onSaveRoutine(routineToSave);
  };

  const toggleDay = (day: string) => {
    setWeeklyDays(prev => {
      const updatedDays = prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day];
      if (updatedDays.length > 0) {
        setWeeklyDaysError("");
      }
      return updatedDays;
    });
  };

  const weekDays = [
    { key: "monday", label: "월" }, { key: "tuesday", label: "화" },
    { key: "wednesday", label: "수" }, { key: "thursday", label: "목" },
    { key: "friday", label: "금" }, { key: "saturday", label: "토" },
    { key: "sunday", label: "일" },
  ];

  const colors = [
    '#3B82F6', // blue-600
    '#EF4444', // red-500
    '#22C55E', // green-500
    '#F59E0B', // amber-500
    '#8B5CF6', // violet-500
    '#EC4899', // pink-500
    '#14B8A6', // teal-500
    '#A8A29E', // stone-500
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-center sm:text-3xl">{isEditMode ? "루틴 수정" : "새 루틴 생성"}</h2>
      <div className="space-y-4 sm:space-y-6">
        <div>
          <input
            className={`w-full px-4 py-2 border ${routineNameError ? 'border-red-500' : 'border-gray-400'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-base sm:text-lg transition-all duration-200`}
            placeholder="루틴 이름 (예: 매일 아침 스트레칭)"
            value={routineName}
            onChange={e => {
              setRoutineName(e.target.value);
              setRoutineNameError("");
            }}
          />
          {routineNameError && <p className="text-red-500 text-sm mt-1">{routineNameError}</p>}
        </div>
        
        <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">테마 색상</label>
            <div className="flex flex-wrap gap-2">
                {colors.map(color => (
                    <button
                        key={color}
                        className={`w-8 h-8 rounded-full border-2 border-gray-300 transition-all duration-200 ${selectedColor === color ? 'ring-4 ring-offset-2 ring-blue-500 scale-110' : 'hover:scale-105'}`}
                        style={{ backgroundColor: color }}
                        onClick={() => setSelectedColor(color)}
                        title={color}
                    ></button>
                ))}
            </div>
        </div>

        <div className="flex border border-gray-200 rounded-lg overflow-hidden text-base sm:text-lg shadow-sm">
          <button onClick={() => setFrequency("weekly")} className={`flex-1 px-4 py-2 text-center transition-colors duration-200 ${frequency === "weekly" ? "bg-blue-500 text-white shadow-inner" : "hover:bg-gray-100"}`}>
            주간
          </button>
          <button onClick={() => setFrequency("interval")} className={`flex-1 px-4 py-2 text-center transition-colors duration-200 ${frequency === "interval" ? "bg-blue-500 text-white shadow-inner" : "hover:bg-gray-100"}`}>
            간격
          </button>
        </div>

        {frequency === "weekly" && (
          <div>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-1 sm:gap-2">
              {weekDays.map(day => (
                <button
                  key={day.key}
                  onClick={() => toggleDay(day.key)}
                  className={`py-2 rounded-lg transition-all duration-200 text-sm sm:text-base 
                    ${weeklyDays.includes(day.key) ? "bg-blue-600 text-white shadow-md" : "border border-gray-300 bg-white hover:bg-gray-100 shadow-sm"}
                    focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2`}
                >
                  {day.label}
                </button>
              ))}
            </div>
            {weeklyDaysError && <p className="text-red-500 text-sm mt-1">{weeklyDaysError}</p>}
          </div>
        )}

        {frequency === "interval" && (
          <div className="flex items-center justify-center gap-4 p-4 border border-gray-200 rounded-lg shadow-sm bg-white">
            <button onClick={() => setIntervalDays(Math.max(1, intervalDays - 1))} 
              className="px-4 py-2 rounded-lg border border-gray-300 font-bold hover:bg-gray-100 transition-colors duration-200 text-lg sm:text-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2">
                -
            </button>
            <span className="text-lg sm:text-xl text-gray-800 font-medium">{intervalDays} 일마다</span>
            <button onClick={() => setIntervalDays(intervalDays + 1)} 
              className="px-4 py-2 rounded-lg border border-gray-300 font-bold hover:bg-gray-100 transition-colors duration-200 text-lg sm:text-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2">
                +
            </button>
          </div>
        )}
      </div>
      <button onClick={handleSubmit} 
        className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold mt-6 hover:bg-blue-700 transition-all duration-200 text-lg sm:text-xl shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2">
        {isEditMode ? "루틴 저장" : "루틴 생성하기"}
      </button>
    </div>
  );
}