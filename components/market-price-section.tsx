import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { MapPin } from "lucide-react"
import { useTranslation } from "@/hooks/use-translation"
import Image from "next/image"

export function MarketPriceSection() {
  const { t, language } = useTranslation()

  const getMarketData = () => {
    const cropNames = {
      basmatiRice: {
        en: "Paddy(Dhan)(Basmati)",
        hi: "धान(बासमती)",
        bn: "ধান(বাসমতী)",
        mr: "भात(बासमती)",
        te: "వరి(బాస్మతి)",
        ta: "நெல்(பாஸ்மதி)",
        gu: "ચોખા(બાસમતી)",
        ur: "چاول(باسمتی)",
        kn: "ಅಕ್ಕಿ(ಬಾಸ್ಮತಿ)",
        or: "ଚାଉଳ(ବାସମତୀ)",
      },
      commonRice: {
        en: "Paddy(Dhan)(Common)",
        hi: "धान(सामान्य)",
        bn: "ধান(সাধারণ)",
        mr: "भात(सामान्य)",
        te: "వరి(సాధారణ)",
        ta: "நெல்(பொது)",
        gu: "ચોખા(સામાન્ય)",
        ur: "چاول(عام)",
        kn: "ಅಕ್ಕಿ(ಸಾಮಾನ್ಯ)",
        or: "ଚାଉଳ(ସାଧାରଣ)",
      },
    }

    return [
      {
        id: 1,
        name: cropNames.basmatiRice[language] || cropNames.basmatiRice.en,
        code: "1121",
        price: "₹3845/Q",
        location: "Hoshangabad",
        image: "/placeholder.svg?height=80&width=80",
      },
      {
        id: 2,
        name: cropNames.commonRice[language] || cropNames.commonRice.en,
        code: "1001",
        price: "₹2425/Q",
        location: "Hoshangabad(F&V)",
        image: "/placeholder.svg?height=80&width=80",
      },
    ]
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900">{t("marketPrice")}</h2>
        <Button variant="outline" className="text-emerald-600 border-emerald-600 bg-transparent">
          {t("viewAll")}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {getMarketData().map((item) => (
          <Card key={item.id} className="p-3 bg-green-50">
            <Image
              src={item.image || "/placeholder.svg"}
              alt={item.name}
              width={80}
              height={80}
              className="w-full h-20 object-cover rounded-lg mb-2"
            />
            <h3 className="font-medium text-sm text-gray-900 mb-1 line-clamp-2">{item.name}</h3>
            <div className="text-xs text-gray-600 mb-2">{item.code}</div>
            <div className="font-bold text-emerald-600 mb-2">{item.price}</div>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <MapPin className="h-3 w-3" />
              <span className="truncate">{item.location}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
