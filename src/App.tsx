// src/App.tsx

import { useState, useEffect } from "react";
import { Route, Router, useLocation, Switch } from "wouter";
import AuthScreen from "./AuthScreen";
import OnboardingScreen from "./OnboardingScreen";
import RoutineDetail from "./RoutineDetail";
import RoutineListScreen from "./RoutineListScreen";
import { User, Routine } from "./types";
import Toast from "./components/Toast"; // Toast 컴포넌트 임포트

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [userRoutines, setUserRoutines] = useState<Routine[]>([]);
  const [location, setLocation] = useLocation();
  
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("user");
      if (storedUser && storedUser !== "undefined") {
        const parsedUser: User = JSON.parse(storedUser);
        setUser(parsedUser);

        const storedRoutines = localStorage.getItem(`${parsedUser.id}-routines`);
        if (storedRoutines && storedRoutines !== "undefined") {
          // 루틴 데이터를 불러올 때 completions 필드가 새 형식(객체 배열)인지 확인하고 변환
          const parsedRoutines: Routine[] = JSON.parse(storedRoutines);
          const routinesWithUpdatedCompletions = parsedRoutines.map(r => ({
            ...r,
            completions: r.completions.map(c => {
              // 이전 string[] 형식의 completions 호환성 처리: string이면 { date: string, duration: undefined }로 변환
              if (typeof c === 'string') {
                return { date: c, duration: undefined }; 
              }
              // 이미 { date, duration } 형식인 경우: duration이 없을 수도 있으므로 기본값 undefined 처리
              return { date: c.date, duration: c.duration || undefined }; 
            })
          }));
          setUserRoutines(routinesWithUpdatedCompletions);
        } else {
            setUserRoutines([]); // 루틴이 없으면 빈 배열로 초기화
        }
      }
    } catch (error) {
      console.error("Failed to parse data from localStorage", error);
      localStorage.removeItem("user");
      showToast("사용자 정보를 불러오는데 실패했습니다. 다시 로그인해주세요.", "error");
    }
  }, []);

  const saveUserRoutines = (userId: string, routines: Routine[]) => {
    localStorage.setItem(`${userId}-routines`, JSON.stringify(routines));
    setUserRoutines(routines);
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ message, type });
  };

  const handleLogin = (newUser: User) => {
    localStorage.setItem("user", JSON.stringify(newUser));
    setUser(newUser);
    
    const storedRoutines = localStorage.getItem(`${newUser.id}-routines`);
    if (storedRoutines && storedRoutines !== "undefined") {
      // 로그인 시에도 completions 필드 형식 호환성 처리
      const parsedRoutines: Routine[] = JSON.parse(storedRoutines);
      const routinesWithUpdatedCompletions = parsedRoutines.map(r => ({
        ...r,
        completions: r.completions.map(c => {
          if (typeof c === 'string') {
            return { date: c, duration: undefined };
          }
          return { date: c.date, duration: c.duration || undefined };
        })
      }));
      setUserRoutines(routinesWithUpdatedCompletions);
    } else {
      setUserRoutines([]);
    }
    
    setLocation("/");
    showToast(`${newUser.name}님 환영합니다!`, "success");
  };
  
  const handleLogout = () => {
    if (!user) return;
    localStorage.removeItem("user");
    localStorage.removeItem(`${user.id}-routines`); // 해당 유저의 루틴 정보도 함께 삭제
    setUser(null);
    setUserRoutines([]);
    setLocation("/");
    showToast("로그아웃 되었습니다.", "info");
  };

  const handleSaveRoutine = (routineToSave: Routine) => {
    if (!user) return;
    let updatedRoutines;
    const existingIndex = userRoutines.findIndex(r => r.id === routineToSave.id);

    if (existingIndex > -1) {
      // 기존 루틴의 completions은 유지
      // initialRoutine?.completions || [] 가 OnboardingScreen에서 처리되었으므로 그대로 사용
      updatedRoutines = userRoutines.map(r => r.id === routineToSave.id ? routineToSave : r);
      showToast("루틴이 성공적으로 수정되었습니다!", "success");
    } else {
      // 새 루틴은 completions이 빈 배열로 이미 초기화되어 온다
      updatedRoutines = [...userRoutines, routineToSave];
      showToast("새 루틴이 생성되었습니다!", "success");
    }
    saveUserRoutines(user.id, updatedRoutines);
    setLocation(`/detail/${routineToSave.id}`);
  };

  const handleDeleteRoutine = (routineId: string) => {
    if (!user) return;
    const filteredRoutines = userRoutines.filter(r => r.id !== routineId);
    saveUserRoutines(user.id, filteredRoutines);
    showToast("루틴이 성공적으로 삭제되었습니다.", "success");
    setLocation("/");
  };

  // handleMarkComplete는 RoutineDetail에서 duration을 포함한 completion 객체를 받습니다.
  const handleMarkComplete = (routineId: string, updatedRoutine: Routine) => {
    if (!user) return;
    const updatedRoutines = userRoutines.map(r => r.id === routineId ? updatedRoutine : r);
    saveUserRoutines(user.id, updatedRoutines);
    // 토스트 메시지는 RoutineDetail에서 이미 띄우므로 여기서 제거합니다.
    // showToast("루틴을 완료했습니다! 🎉", "success"); 
  };


  if (!user) {
    return (
      <>
        <AuthScreen onLogin={handleLogin} showToast={showToast} />
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl bg-white rounded-xl shadow-lg p-6 relative">
         <button 
           onClick={handleLogout} 
           className="absolute top-4 right-4 text-sm text-gray-500 hover:text-red-600 transition-colors z-10"
           aria-label="로그아웃"
         >
           로그아웃
         </button>
        <Router>
          <Switch>
            <Route path="/">
              <RoutineListScreen 
                user={user} 
                routines={userRoutines} 
                onEditRoutine={(routineId) => setLocation(`/edit-routine/${routineId}`)}
                onAddRoutine={() => setLocation("/add-routine")}
              />
            </Route>
            <Route path="/add-routine">
              <OnboardingScreen 
                user={user} 
                onSaveRoutine={handleSaveRoutine} 
                showToast={showToast} 
              />
            </Route>
            <Route path="/edit-routine/:routineId">
              {(params) => {
                const routineToEdit = userRoutines.find(r => r.id === params.routineId);
                if (!routineToEdit) {
                  setLocation("/");
                  showToast("수정할 루틴을 찾을 수 없습니다.", "error");
                  return null;
                }
                return (
                  <OnboardingScreen 
                    user={user} 
                    onSaveRoutine={handleSaveRoutine} 
                    showToast={showToast} 
                    isEditMode={true} 
                    initialRoutine={routineToEdit}
                  />
                );
              }}
            </Route>
            <Route path="/detail/:routineId">
              {(params) => {
                const selectedRoutine = userRoutines.find(r => r.id === params.routineId);
                if (!selectedRoutine) {
                  setLocation("/");
                  showToast("루틴을 찾을 수 없습니다.", "error");
                  return null;
                }
                return (
                  <RoutineDetail 
                    user={user} 
                    routine={selectedRoutine} 
                    onDeleteRoutine={handleDeleteRoutine} 
                    onMarkComplete={handleMarkComplete}
                    showToast={showToast} 
                  />
                );
              }}
            </Route>
            <Route>
              {/* Fallback route for unmatched paths */}
              <RoutineListScreen 
                user={user} 
                routines={userRoutines} 
                onEditRoutine={(routineId) => setLocation(`/edit-routine/${routineId}`)}
                onAddRoutine={() => setLocation("/add-routine")}
              />
            </Route>
          </Switch>
        </Router>
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}