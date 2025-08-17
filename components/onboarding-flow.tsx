"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { CropSelector } from "@/components/crop-selector"
import { Leaf, MapPin, Globe, User, Sprout, Languages } from "lucide-react"
import { GoogleLocationPicker, SelectedLocationData } from "@/components/google-location-picker"
import { useTranslation, type Language } from "@/hooks/use-translation"

interface OnboardingData {
  name: string
  location: string
  language: string
  farmType: string
  experience: string
  mainCrops: string[]
  farmSize: string
}

interface OnboardingFlowProps {
  onComplete: (data: OnboardingData) => void
}

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState(0)
  const [data, setData] = useState<OnboardingData>({
    name: "",
    location: "",
    language: "English", // Default language
    farmType: "",
    experience: "",
    mainCrops: [],
    farmSize: "",
  })

  const { t, changeLanguage } = useTranslation()

  // Language mapping from display names to codes
  const languageMap: Record<string, string> = {
    English: "en",
    Hindi: "hi",
    Bengali: "bn",
    Marathi: "mr",
    Telugu: "te",
    Tamil: "ta",
    Gujarati: "gu",
    Urdu: "ur",
    Kannada: "kn",
    Odia: "or",
  }

  const updateData = <K extends keyof OnboardingData>(field: K, value: OnboardingData[K]) => {
    setData((prev) => ({ ...prev, [field]: value }))
    if (field === "language") {
      const languageCode = languageMap[value] || "en"
      changeLanguage(languageCode as Language)
      console.log("[v0] Language updated to:", value, "->", languageCode)
    }
  }

  // Crop selection handled by component

  const nextStep = () => {
  if (step < 4) {
      setStep(step + 1)
    } else {
      onComplete(data)
    }
  }

  const prevStep = () => {
    if (step > 0) {
      setStep(step - 1)
    }
  }

  const steps = [
    {
      title: t("onboarding.language.title"),
      description: t("onboarding.language.description"),
      icon: <Languages className="w-8 h-8 text-primary" />,
      content: (
        <div className="space-y-4">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <Languages className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">{t("onboarding.language.welcome")}</h2>
            <p className="text-muted-foreground">{t("onboarding.language.subtitle")}</p>
          </div>
          <div className="space-y-3">
            <Label htmlFor="language">{t("onboarding.language.selectLabel")}</Label>
            <Select value={data.language} onValueChange={(value) => updateData("language", value)}>
              <SelectTrigger className="w-full bg-emerald-50 border-emerald-200 hover:bg-emerald-100 focus:border-emerald-500 focus:ring-emerald-500 transition-colors">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="English">English</SelectItem>
                <SelectItem value="Hindi">हिन्दी (Hindi)</SelectItem>
                <SelectItem value="Bengali">বাংলা (Bengali)</SelectItem>
                <SelectItem value="Marathi">मराठी (Marathi)</SelectItem>
                <SelectItem value="Telugu">తెలుగు (Telugu)</SelectItem>
                <SelectItem value="Tamil">தமிழ் (Tamil)</SelectItem>
                <SelectItem value="Gujarati">ગુજરાતી (Gujarati)</SelectItem>
                <SelectItem value="Urdu">اردو (Urdu)</SelectItem>
                <SelectItem value="Kannada">ಕನ್ನಡ (Kannada)</SelectItem>
                <SelectItem value="Odia">ଓଡ଼ିଆ (Odia)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      ),
    },
    {
      title: t("onboarding.welcome.title"),
      description: t("onboarding.welcome.description"),
      icon: <Leaf className="w-8 h-8 text-primary" />,
      content: (
        <div className="space-y-4">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <Leaf className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">{t("onboarding.welcome.title")}</h2>
            <p className="text-muted-foreground">{t("onboarding.welcome.subtitle")}</p>
          </div>
          <div className="space-y-3">
            <Label htmlFor="name">{t("onboarding.welcome.nameLabel")}</Label>
            <Input
              id="name"
              placeholder={t("onboarding.welcome.namePlaceholder")}
              value={data.name}
              onChange={(e) => updateData("name", e.target.value)}
              className="bg-emerald-50 border-emerald-200 hover:bg-emerald-100 focus:border-emerald-500 focus:ring-emerald-500 transition-colors"
            />
          </div>
        </div>
      ),
    },
    {
      title: t("onboarding.location.title"),
      description: t("onboarding.location.description"),
      icon: <MapPin className="w-8 h-8 text-primary" />,
      content: (
        <div className="space-y-4">
          <div className="space-y-3">
            <Label htmlFor="location">{t("onboarding.location.locationLabel")}</Label>
            <GoogleLocationPicker
              value={data.location}
              placeholder={t("onboarding.location.locationPlaceholder")}
              onChange={(loc: SelectedLocationData) => {
                const address = loc.address
                updateData("location", address)
              }}
              className="[&_input]:bg-emerald-50 [&_input]:border-emerald-200 [&_input]:hover:bg-emerald-100 [&_input]:focus:border-emerald-500 [&_input]:focus:ring-emerald-500 [&_input]:transition-colors [&_button]:bg-emerald-50 [&_button]:border-emerald-200 [&_button]:hover:bg-emerald-100 [&_button]:transition-colors"
            />
            {data.location && (
              <p className="text-xs text-muted-foreground break-words">{data.location}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      title: t("onboarding.farm.title"),
      description: t("onboarding.farm.description"),
      icon: <Sprout className="w-8 h-8 text-primary" />,
      content: (
        <div className="space-y-4">
          <div className="space-y-3">
            <Label htmlFor="farmType">{t("onboarding.farm.typeLabel")}</Label>
            <Select value={data.farmType} onValueChange={(value) => updateData("farmType", value)}>
              <SelectTrigger className="w-full bg-emerald-50 border-emerald-200 hover:bg-emerald-100 focus:border-emerald-500 focus:ring-emerald-500 transition-colors">
                <SelectValue placeholder={t("onboarding.farm.typePlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="crop">{t("onboarding.farm.types.crop")}</SelectItem>
                <SelectItem value="livestock">{t("onboarding.farm.types.livestock")}</SelectItem>
                <SelectItem value="mixed">{t("onboarding.farm.types.mixed")}</SelectItem>
                <SelectItem value="organic">{t("onboarding.farm.types.organic")}</SelectItem>
                <SelectItem value="greenhouse">{t("onboarding.farm.types.greenhouse")}</SelectItem>
                <SelectItem value="hydroponic">{t("onboarding.farm.types.hydroponic")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-3">
            <Label htmlFor="farmSize">{t("onboarding.farm.sizeLabel")}</Label>
            <Select value={data.farmSize} onValueChange={(value) => updateData("farmSize", value)}>
              <SelectTrigger className="w-full bg-emerald-50 border-emerald-200 hover:bg-emerald-100 focus:border-emerald-500 focus:ring-emerald-500 transition-colors">
                <SelectValue placeholder={t("onboarding.farm.sizePlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">{t("onboarding.farm.sizes.small")}</SelectItem>
                <SelectItem value="medium">{t("onboarding.farm.sizes.medium")}</SelectItem>
                <SelectItem value="large">{t("onboarding.farm.sizes.large")}</SelectItem>
                <SelectItem value="commercial">{t("onboarding.farm.sizes.commercial")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      ),
    },
    {
      title: t("onboarding.experience.title"),
      description: t("onboarding.experience.description"),
      icon: <User className="w-8 h-8 text-primary" />,
      content: (
        <div className="space-y-4">
          <div className="space-y-3">
            <Label htmlFor="experience">{t("onboarding.experience.experienceLabel")}</Label>
            <Select value={data.experience} onValueChange={(value) => updateData("experience", value)}>
              <SelectTrigger className="w-full bg-emerald-50 border-emerald-200 hover:bg-emerald-100 focus:border-emerald-500 focus:ring-emerald-500 transition-colors">
                <SelectValue placeholder={t("onboarding.experience.experiencePlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">{t("onboarding.experience.levels.beginner")}</SelectItem>
                <SelectItem value="intermediate">{t("onboarding.experience.levels.intermediate")}</SelectItem>
                <SelectItem value="experienced">{t("onboarding.experience.levels.experienced")}</SelectItem>
                <SelectItem value="expert">{t("onboarding.experience.levels.expert")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-3">
            <Label>{t("onboarding.experience.cropsLabel")}</Label>
            <CropSelector
              value={data.mainCrops}
              onChange={(crops) => updateData('mainCrops', crops)}
              translate={(key: string) => t(key)}
            />
            {data.mainCrops.length === 0 && (
              <p className="text-xs text-muted-foreground">{t('onboarding.experience.cropsPlaceholder')}</p>
            )}
          </div>
        </div>
      ),
    },
  ]

  const currentStep = steps[step]
  const canProceed =
    step === 0
      ? data.language !== ""
      : step === 1
        ? data.name.trim() !== ""
        : step === 2
          ? data.location.trim() !== ""
          : step === 3
            ? data.farmType !== "" && data.farmSize !== ""
            : step === 4
              ? data.experience !== "" && data.mainCrops.length > 0
              : true

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">{currentStep.icon}</div>
          <CardTitle>{currentStep.title}</CardTitle>
          <CardDescription>{currentStep.description}</CardDescription>
          <div className="flex justify-center mt-4">
            <div className="flex space-x-2">
              {steps.map((_, index) => (
                <div key={index} className={`w-2 h-2 rounded-full ${index <= step ? "bg-primary" : "bg-muted"}`} />
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {currentStep.content}
          <div className="flex justify-between mt-6">
            <Button variant="outline" onClick={prevStep} disabled={step === 0}>
              {t("common.back")}
            </Button>
            <Button onClick={nextStep} disabled={!canProceed}>
              {step === steps.length - 1 ? t("common.getStarted") : t("common.next")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
