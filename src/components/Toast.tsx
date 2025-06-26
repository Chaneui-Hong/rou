// src/components/Toast.tsx

import { useEffect, useState } from 'react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
  duration?: number; // ms
}

export default function Toast({ message, type, onClose, duration = 3000 }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const bgColor = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
  }[type];

  const slideInClass = isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0';

  return (
    <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 p-3 rounded-lg text-white shadow-lg z-50 transition-all duration-300 ease-in-out ${bgColor} ${slideInClass}`}>
      {message}
    </div>
  );
}