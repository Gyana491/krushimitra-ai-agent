"use client"

import { useState } from 'react'
import { POPULAR_CROPS } from '@/lib/crops'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

interface CropSelectorProps<TKey extends string = string> {
  value: string[]
  onChange: (crops: string[]) => void
  translate?: (key: TKey, params?: Record<string,string>) => string
  className?: string
}

export function CropSelector({ value, onChange, translate, className }: CropSelectorProps) {
  const [customCrop, setCustomCrop] = useState('')

  const t = (crop: string) => {
    if (!translate) return crop
  // Normalize crop name to translation key format: lowercase, spaces->_, keep parentheses
  const key = `crop_${crop.toLowerCase().replace(/\s+/g,'_')}`
    return (translate(key as unknown as string) || crop)
  }

  const toggle = (crop: string) => {
    onChange(value.includes(crop) ? value.filter(c => c !== crop) : [...value, crop])
  }

  const addCustom = () => {
    const trimmed = customCrop.trim()
    if (!trimmed) return
    // Capitalize first letter of each word
    const formatted = trimmed.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
    if (!value.includes(formatted)) {
      onChange([...value, formatted])
    }
    setCustomCrop('')
  }

  return (
    <div className={className}>
      {/* Input at top */}
      <div className="flex gap-2 mb-4">
        <Input
          value={customCrop}
          onChange={(e) => setCustomCrop(e.target.value)}
          placeholder={translate ? translate('cropAddCustomPlaceholder' as string) : 'Add crop'}
          className="bg-emerald-50 border-emerald-200 hover:bg-emerald-100 focus:border-emerald-500 focus:ring-emerald-500 transition-colors"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addCustom();
            }
          }}
        />
        <Button type="button" onClick={addCustom} variant="default" className="shrink-0 bg-emerald-600 hover:bg-emerald-700">
          {translate ? translate('cropAddCustomButton' as string) : 'Add'}
        </Button>
      </div>

      {/* Selected crops (moved just below input) */}
      <div className="mb-6">
        <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
          {translate ? translate('cropSelectedLabel' as string) : 'Selected'} {value.length > 0 && `(${value.length})`}
        </p>
        {value.length === 0 ? (
          <p className="text-xs text-muted-foreground">{translate ? translate('cropNoneSelected' as string) : 'No crops selected yet.'}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {value.map(crop => (
              <span
                key={crop}
                className="group inline-flex items-center gap-1 pl-3 pr-2 py-1 rounded-full text-xs bg-emerald-600 text-white shadow-sm border border-emerald-700"
              >
                {t(crop)}
                <button
                  type="button"
                  onClick={() => toggle(crop)}
                  className="w-4 h-4 inline-flex items-center justify-center rounded-full bg-emerald-700/70 hover:bg-emerald-800 transition"
                  aria-label={`Remove ${crop}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Suggested crops */}
      <div className="mb-3">
        <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
          {translate ? translate('cropSuggestedLabel' as string) : 'Suggested'}
        </p>
        <div className="flex flex-wrap gap-2">
          {POPULAR_CROPS.filter(c => !value.includes(c)).map(crop => {
            const active = value.includes(crop)
            return (
              <button
                type="button"
                key={crop}
                onClick={() => toggle(crop)}
                className={`px-3 py-1 rounded-full text-xs border transition focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-emerald-500 ${active ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-white hover:bg-emerald-50 border-gray-300 text-gray-700'} `}
                aria-pressed={active}
              >
                {t(crop)}
              </button>
            )
          })}
        </div>
      </div>

  {/* (Selected crops moved above) */}
    </div>
  )
}
