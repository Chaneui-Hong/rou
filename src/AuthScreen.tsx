// src/AuthScreen.tsx

import { useState } from "react";
import { User } from "./types";

interface AuthProps {
  onLogin: (user: User) => void;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export default function AuthScreen({ onLogin, showToast }: AuthProps) {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = () => {
    if (!name.trim() || !password.trim()) {
      showToast("이름과 비밀번호를 입력하세요.", "error");
      return;
    }
    // 사용자 ID는 소문자로 변환하고 공백을 제거하여 일관성 유지
    const user: User = { id: name.toLowerCase().replace(/\s/g, ''), name };
    onLogin(user);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-100">
      <div className="w-full max-w-sm bg-white p-8 rounded-xl shadow-lg">
        <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">Dot Routine</h1>
        <div className="space-y-4">
          <input 
            value={name} 
            onChange={e => setName(e.target.value)} 
            placeholder="이름" 
            className="w-full px-4 py-2 rounded-md border focus:outline-none focus:ring-2 focus:ring-blue-500" 
          />
          <input 
            type="password" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            placeholder="비밀번호" 
            className="w-full px-4 py-2 rounded-md border focus:outline-none focus:ring-2 focus:ring-blue-500" 
            onKeyUp={(e) => {
              if (e.key === 'Enter') {
                handleLogin();
              }
            }}
          />
          <button 
            onClick={handleLogin} 
            className="w-full bg-blue-600 text-white py-2 rounded-md font-semibold hover:bg-blue-700 transition-colors"
          >
            로그인
          </button>
        </div>
      </div>
    </div>
  );
}