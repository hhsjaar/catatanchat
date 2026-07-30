"use client";

import { useEffect, useState } from "react";
import { Download, X, Share2, Plus, Sparkles } from "lucide-react";

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const handleForceShow = () => {
      setShowPrompt(true);
    };
    window.addEventListener('show-pwa-install-prompt', handleForceShow);
    return () => {
      window.removeEventListener('show-pwa-install-prompt', handleForceShow);
    };
  }, []);

  useEffect(() => {
    // 1. Check if the app is already running in standalone mode (already installed)
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true;
      setIsStandalone(isStandaloneMode);
      return isStandaloneMode;
    };

    const isStandaloneMode = checkStandalone();

    // 2. Check if the user is on iOS Safari
    const checkIOS = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      const isIpadOrIphone = /ipad|iphone|ipod/.test(userAgent) && !(window as any).MSStream;
      setIsIOS(isIpadOrIphone);
      return isIpadOrIphone;
    };

    const ios = checkIOS();

    // 3. Register the service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => console.log("Service Worker registered with scope:", reg.scope))
        .catch((err) => console.error("Service Worker registration failed:", err));
    }

    // 4. Handle chrome beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);

      // Only show if not dismissed in the last 3 days
      const dismissedUntil = localStorage.getItem("pwa_prompt_dismissed_until");
      const isDismissed = dismissedUntil && Number(dismissedUntil) > Date.now();

      if (!isDismissed && !isStandaloneMode) {
        // Show after a brief delay for smoother page loading
        const timer = setTimeout(() => {
          setShowPrompt(true);
        }, 1500);
        return () => clearTimeout(timer);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // 5. Fallback for iOS and other platforms where beforeinstallprompt won't fire
    const dismissedUntil = localStorage.getItem("pwa_prompt_dismissed_until");
    const isDismissed = dismissedUntil && Number(dismissedUntil) > Date.now();

    if (!isDismissed && !isStandaloneMode) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      return;
    }

    if (deferredPrompt) {
      // Show the browser's install prompt
      deferredPrompt.prompt();

      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to install prompt: ${outcome}`);

      // We no longer need the prompt, clear it
      setDeferredPrompt(null);
      setShowPrompt(false);
    } else {
      // Fallback instruction for browsers where deferredPrompt is not available (e.g. Firefox, desktop Safari)
      alert("Untuk menginstal aplikasi ini, buka menu browser Anda (titik tiga di kanan atas atau tombol bagikan) dan pilih 'Instal Aplikasi' atau 'Tambahkan ke Layar Utama'.");
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Dismiss for 3 days
    const nextShowTime = Date.now() + 3 * 24 * 60 * 60 * 1000;
    localStorage.setItem("pwa_prompt_dismissed_until", String(nextShowTime));
  };

  if (!showPrompt || isStandalone) return null;

  return (
    <div className="fixed inset-x-4 bottom-20 sm:bottom-24 md:bottom-6 md:right-6 md:left-auto md:w-96 z-[99] animate-fade-in">
      <div className="rounded-2xl p-5 border border-indigo-100 shadow-2xl relative bg-white/95 backdrop-blur-xl">
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-450 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer border-0 bg-transparent"
          aria-label="Tutup"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Content */}
        <div className="flex gap-4 items-start pr-4">
          <div className="relative w-12 h-12 rounded-2xl overflow-hidden shrink-0 border border-indigo-100 bg-gradient-to-tr from-indigo-500 to-violet-600 shadow-md flex items-center justify-center text-white">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-800 tracking-tight">
              Instal Chatatanchat
            </h3>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Dapatkan akses cepat untuk mencatat suara, merangkum rapat, dan menggunakan asisten Aira langsung dari layar utama Anda.
            </p>
          </div>
        </div>

        {/* Dynamic section: iOS Safari instructions vs general install button */}
        {isIOS ? (
          <div className="mt-4 pt-3 border-t border-slate-100 space-y-2.5 text-[11px] text-slate-600">
            <p className="font-semibold text-slate-700">Langkah instalasi iOS Safari:</p>
            <ol className="list-decimal pl-4 space-y-1.5 leading-relaxed">
              <li>
                Ketuk tombol Bagikan <Share2 className="inline-block w-3.5 h-3.5 mx-0.5 text-indigo-500 align-middle" /> (Share) di Safari.
              </li>
              <li>
                Scroll ke bawah dan pilih <span className="font-semibold text-slate-800">Tambahkan ke Layar Utama</span> <Plus className="inline-block w-3.5 h-3.5 mx-0.5 text-indigo-500 align-middle" /> (Add to Home Screen).
              </li>
            </ol>
            <button
              onClick={handleDismiss}
              className="w-full mt-2 py-2 rounded-xl text-xs font-semibold tracking-wide bg-indigo-50 hover:bg-indigo-100 text-indigo-600 transition-all cursor-pointer text-center border-0"
            >
              Saya Mengerti
            </button>
          </div>
        ) : (
          <div className="mt-5 flex gap-2.5">
            <button
              onClick={handleDismiss}
              className="flex-1 py-2 rounded-xl text-xs font-bold transition-all bg-slate-50 hover:bg-slate-100 text-slate-500 cursor-pointer text-center border border-slate-200"
            >
              Nanti Saja
            </button>
            <button
              onClick={handleInstallClick}
              className="flex-1 py-2 rounded-xl text-xs font-bold transition-all bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer text-center flex items-center justify-center gap-1.5 border-0"
            >
              <Download className="w-3.5 h-3.5" />
              Instal
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
