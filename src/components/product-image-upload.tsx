'use client'

import { useState, useRef, useCallback } from 'react'
import { ImageIcon, X, Upload, Loader2 } from 'lucide-react'

interface ProductImageUploadProps {
  value?: string | null
  onChange: (base64: string | null) => void
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeMap = {
  sm: { container: 'w-16 h-16', icon: 'w-5 h-5', remove: 'w-4 h-4', text: 'text-[10px]' },
  md: { container: 'w-28 h-28', icon: 'w-8 h-8', remove: 'w-5 h-5', text: 'text-xs' },
  lg: { container: 'w-40 h-40', icon: 'w-10 h-10', remove: 'w-6 h-6', text: 'text-sm' },
}

export function ProductImageUpload({
  value,
  onChange,
  className = '',
  size = 'md',
}: ProductImageUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const sizes = sizeMap[size]

  const processFile = useCallback(
    (file: File) => {
      setError(null)

      // Validate type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
      if (!allowedTypes.includes(file.type)) {
        setError('صيغة غير مدعومة (JPEG, PNG, WebP, GIF)')
        return
      }

      // Validate size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        setError('حجم الصورة كبير جداً (الحد 2 ميجابايت)')
        return
      }

      setIsProcessing(true)
      const reader = new FileReader()
      reader.onload = (e) => {
        const base64 = e.target?.result as string
        onChange(base64)
        setIsProcessing(false)
      }
      reader.onerror = () => {
        setError('فشل في قراءة الصورة')
        setIsProcessing(false)
      }
      reader.readAsDataURL(file)
    },
    [onChange]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file) processFile(file)
    },
    [processFile]
  )

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handleClick = () => {
    inputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    // Reset input so same file can be selected again
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(null)
    setError(null)
  }

  if (value) {
    return (
      <div className={`relative group ${sizes.container} rounded-xl overflow-hidden shadow-md ${className}`}>
        <img
          src={value}
          alt="Product"
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <button
          type="button"
          onClick={handleRemove}
          className="absolute top-1 right-1 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-lg"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    )
  }

  return (
    <div className={`${className}`}>
      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          ${sizes.container} rounded-xl border-2 border-dashed cursor-pointer
          flex flex-col items-center justify-center gap-1.5
          transition-all duration-200
          ${
            isDragOver
              ? 'border-primary bg-primary/10 scale-105'
              : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
          }
          ${isProcessing ? 'pointer-events-none opacity-60' : ''}
        `}
      >
        {isProcessing ? (
          <Loader2 className={`${sizes.icon} text-primary animate-spin`} />
        ) : (
          <>
            <div
              className={`rounded-lg bg-muted/80 p-1.5 ${isDragOver ? 'bg-primary/20' : ''}`}
            >
              {isDragOver ? (
                <Upload className={`${sizes.icon} text-primary`} />
              ) : (
                <ImageIcon className={`${sizes.icon} text-muted-foreground/50`} />
              )}
            </div>
            {!isDragOver && (
              <>
                <span className={`${sizes.text} text-muted-foreground/60`}>صورة المنتج</span>
                {size !== 'sm' && (
                  <span className="text-[9px] text-muted-foreground/40">أو اسحب وأفلت</span>
                )}
              </>
            )}
          </>
        )}
      </div>
      {error && <p className="text-[10px] text-red-500 mt-1 text-center">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  )
}
