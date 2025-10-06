"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Checkbox } from "@/components/ui/checkbox"
import { Upload, X, Download, ImageIcon, Settings, Maximize2 } from "lucide-react"
import { useDropzone } from "react-dropzone"

interface ImageFile {
  id: string
  file: File
  preview: string
  name: string
  size: number
  dimensions?: { width: number; height: number }
  status: "pending" | "processing" | "completed"
}

const presetSizes = [
  { name: "Instagram Square", width: 1080, height: 1080 },
  { name: "Instagram Story", width: 1080, height: 1920 },
  { name: "Facebook Cover", width: 1200, height: 630 },
  { name: "Twitter Header", width: 1500, height: 500 },
  { name: "LinkedIn Banner", width: 1584, height: 396 },
  { name: "YouTube Thumbnail", width: 1280, height: 720 },
  { name: "Custom", width: 0, height: 0 },
]

export function BulkImageResizer() {
  const [images, setImages] = useState<ImageFile[]>([])
  const [selectedPreset, setSelectedPreset] = useState("Custom")
  const [customWidth, setCustomWidth] = useState(800)
  const [customHeight, setCustomHeight] = useState(600)
  const [maintainAspectRatio, setMaintainAspectRatio] = useState(true)
  const [quality, setQuality] = useState([85])
  const [format, setFormat] = useState("original")
  const [isProcessing, setIsProcessing] = useState(false)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newImages = acceptedFiles.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      preview: URL.createObjectURL(file),
      name: file.name,
      size: file.size,
      status: "pending" as const,
    }))
    setImages((prev) => [...prev, ...newImages])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
      "image/gif": [".gif"],
    },
    multiple: true,
  })

  const removeImage = (id: string) => {
    setImages((prev) => {
      const updated = prev.filter((img) => img.id !== id)
      const toRemove = prev.find((img) => img.id === id)
      if (toRemove) {
        URL.revokeObjectURL(toRemove.preview)
      }
      return updated
    })
  }

  const processImages = async () => {
    if (images.length === 0) return

    setIsProcessing(true)

    // Update all images to processing status
    setImages((prev) => prev.map((img) => ({ ...img, status: "processing" as const })))

    try {
      // Mock processing
      for (let i = 0; i < images.length; i++) {
        await new Promise((resolve) => setTimeout(resolve, 1000))

        setImages((prev) => prev.map((img, index) => (index === i ? { ...img, status: "completed" as const } : img)))
      }

      console.log("Processing images with settings:", {
        preset: selectedPreset,
        width: selectedPreset === "Custom" ? customWidth : presetSizes.find((p) => p.name === selectedPreset)?.width,
        height: selectedPreset === "Custom" ? customHeight : presetSizes.find((p) => p.name === selectedPreset)?.height,
        maintainAspectRatio,
        quality: quality[0],
        format,
      })
    } catch (error) {
      console.error("Processing failed:", error)
    } finally {
      setIsProcessing(false)
    }
  }

  const downloadAll = () => {
    // Mock download all as zip
    const link = document.createElement("a")
    link.href = "#"
    link.download = "resized-images.zip"
    link.click()
  }

  const downloadImage = (image: ImageFile) => {
    // Mock individual download
    const link = document.createElement("a")
    link.href = "#"
    link.download = `resized-${image.name}`
    link.click()
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "text-muted-foreground"
      case "processing":
        return "text-[color:var(--file-converters)]"
      case "completed":
        return "text-green-500"
      default:
        return "text-muted-foreground"
    }
  }

  const selectedPresetData = presetSizes.find((p) => p.name === selectedPreset)
  const targetWidth = selectedPreset === "Custom" ? customWidth : selectedPresetData?.width || 0
  const targetHeight = selectedPreset === "Custom" ? customHeight : selectedPresetData?.height || 0

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-[color:var(--file-converters)]" />
            Upload Images
          </CardTitle>
          <CardDescription>Upload multiple images to resize them in bulk</CardDescription>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive
                ? "border-[color:var(--file-converters)] bg-[color:var(--file-converters)]/5"
                : "border-border hover:border-[color:var(--file-converters)]/50"
            }`}
          >
            <input {...getInputProps()} />
            <ImageIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            {isDragActive ? (
              <p className="text-[color:var(--file-converters)]">Drop the images here...</p>
            ) : (
              <div>
                <p className="text-lg font-medium mb-2">Drop images here or click to upload</p>
                <p className="text-sm text-muted-foreground">Supports JPEG, PNG, WebP, and GIF formats</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Resize Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-[color:var(--file-converters)]" />
            Resize Settings
          </CardTitle>
          <CardDescription>Configure how you want to resize your images</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Preset Sizes */}
          <div className="space-y-2">
            <Label>Size Preset</Label>
            <Select value={selectedPreset} onValueChange={setSelectedPreset}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {presetSizes.map((preset) => (
                  <SelectItem key={preset.name} value={preset.name}>
                    {preset.name} {preset.width > 0 && `(${preset.width} × ${preset.height})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Custom Dimensions */}
          {selectedPreset === "Custom" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="width">Width (px)</Label>
                <Input
                  id="width"
                  type="number"
                  value={customWidth}
                  onChange={(e) => setCustomWidth(Number(e.target.value))}
                  min={1}
                  max={4000}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="height">Height (px)</Label>
                <Input
                  id="height"
                  type="number"
                  value={customHeight}
                  onChange={(e) => setCustomHeight(Number(e.target.value))}
                  min={1}
                  max={4000}
                />
              </div>
            </div>
          )}

          {/* Options */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox id="aspect-ratio" checked={maintainAspectRatio} onCheckedChange={setMaintainAspectRatio} />
              <Label htmlFor="aspect-ratio" className="text-sm">
                Maintain aspect ratio (may crop or add padding)
              </Label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label>Quality: {quality[0]}%</Label>
                <Slider value={quality} onValueChange={setQuality} max={100} min={10} step={5} className="w-full" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Smaller file</span>
                  <span>Better quality</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Output Format</Label>
                <Select value={format} onValueChange={setFormat}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="original">Keep Original</SelectItem>
                    <SelectItem value="jpeg">JPEG</SelectItem>
                    <SelectItem value="png">PNG</SelectItem>
                    <SelectItem value="webp">WebP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Preview */}
          {targetWidth > 0 && targetHeight > 0 && (
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Maximize2 className="w-4 h-4 text-[color:var(--file-converters)]" />
                <span className="font-medium">Target Size</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {targetWidth} × {targetHeight} pixels
                {maintainAspectRatio && " (with aspect ratio maintained)"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Image List */}
      {images.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Images to Process ({images.length})</CardTitle>
                <CardDescription>Review your images before processing</CardDescription>
              </div>
              {images.some((img) => img.status === "completed") && (
                <Button onClick={downloadAll} variant="outline" className="gap-2 bg-transparent">
                  <Download className="w-4 h-4" />
                  Download All
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {images.map((image) => (
                <div key={image.id} className="flex items-center gap-4 p-4 border rounded-lg">
                  <div className="w-16 h-16 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                    <img
                      src={image.preview || "/placeholder.svg"}
                      alt={image.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{image.name}</p>
                    <p className="text-sm text-muted-foreground">{formatFileSize(image.size)}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${getStatusColor(image.status)}`}>
                      {image.status === "pending" && "Ready"}
                      {image.status === "processing" && "Processing..."}
                      {image.status === "completed" && "Completed"}
                    </span>

                    {image.status === "completed" && (
                      <Button variant="outline" size="sm" onClick={() => downloadImage(image)} className="gap-1">
                        <Download className="w-3 h-3" />
                        Download
                      </Button>
                    )}

                    {image.status === "pending" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeImage(image.id)}
                        className="text-red-500 hover:text-red-600"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Process Button */}
      <div className="flex justify-center">
        <Button
          onClick={processImages}
          disabled={images.length === 0 || isProcessing}
          size="lg"
          className="gap-2 bg-[color:var(--file-converters)] hover:bg-[color:var(--file-converters)]/90 text-white"
        >
          {isProcessing ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Processing Images...
            </>
          ) : (
            <>
              <ImageIcon className="w-4 h-4" />
              Resize All Images
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
