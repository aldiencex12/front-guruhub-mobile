"use client";

import { useAuthStore } from "@/store/auth.store";
import { useRouter } from "next/navigation";
import { LogOut, User } from "lucide-react";
import { toast } from "sonner";

export default function MobileHeader() {
  const { currentUser, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    toast.success("Berhasil keluar.");
    router.push("/login");
  };

  return (
    <header className="sticky top-0 left-0 right-0 z-40 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-md mx-auto flex items-center justify-between h-14 px-4">
        {/* Left - School Logo & Info */}
        <div className="flex items-center gap-2">
          <img
            src="/logo-hangtuah.png"
            alt="School Logo"
            className="h-8 w-8 object-contain rounded-md"
          />
          <div className="flex flex-col">
            <span className="text-xs font-bold text-gray-900 dark:text-white leading-tight">
              SMP Hang Tuah 5
            </span>
            <span className="text-[10px] text-gray-500 dark:text-gray-400 leading-none">
              GuruHub Mobile
            </span>
          </div>
        </div>

        {/* Right - Profile & LogOut */}
        <div className="flex items-center gap-3">
          {currentUser && (
            <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
              <User className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
              <span className="text-[10px] font-semibold text-gray-700 dark:text-gray-300 max-w-[80px] truncate">
                {currentUser.name}
              </span>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Keluar"
          >
            <LogOut className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>
    </header>
  );
}
