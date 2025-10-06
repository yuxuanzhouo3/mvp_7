"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Upload, X, Download, FileImage, Settings, Eye } from "lucide-react"
import { useDropzone } from "react-dropzone"

interface ImageFile {
  id: string
  file: File
  preview: string
  name: string
  size: number
}

export function JpegToPdfConverter() {
  const [images, setImages] = useState<ImageFile[]>([])
  const [quality, setQuality] = useState([80])
  const [pageSize, setPageSize] = useState("A4")
  const [orientation, setOrientation] = useState("portrait")
  const [isConverting, setIsConverting] = useState(false)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newImages = acceptedFiles.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      preview: URL.createObjectURL(file),
      name: file.name,
      size: file.size,
    }))
    setImages((prev) => [...prev, ...newImages])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
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

  const moveImage = (fromIndex: number, toIndex: number) => {
    setImages((prev) => {
      const updated = [...prev]
      const [moved] = updated.splice(fromIndex, 1)
      updated.splice(toIndex, 0, moved)
      return updated
    })
  }

  const convertToPdf = async () => {
    if (images.length === 0) return

    setIsConverting(true)
    try {
      // Mock conversion process
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // In a real implementation, you would use a library like jsPDF or send to a backend
      console.log("Converting images to PDF with settings:", {
        quality: quality[0],
        pageSize,
        orientation,
        imageCount: images.length,
      })

      // Mock download
      const link = document.createElement("a")
      link.href = "#"
      link.download = "converted-images.pdf"
      link.click()
    } catch (error) {
      console.error("Conversion failed:", error)
    } finally {
      setIsConverting(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-[color:var(--file-converters)]" />
            Upload Images
          </CardTitle>
          <CardDescription>Drag and drop your JPEG, PNG, or WebP images here, or click to browse</CardDescription>
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
            <FileImage className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            {isDragActive ? (
              <p className="text-[color:var(--file-converters)]">Drop the images here...</p>
            ) : (
              <div>
                <p className="text-lg font-medium mb-2">Drop images here or click to upload</p>
                <p className="text-sm text-muted-foreground">Supports JPEG, PNG, and WebP formats</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Image Preview */}
      {images.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-[color:var(--file-converters)]" />
              Image Preview ({images.length} images)
            </CardTitle>
            <CardDescription>Drag images to reorder them in the final PDF</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {images.map((image, index) => (
                <div key={image.id} className="relative group">
                  <div className="aspect-square bg-muted rounded-lg overflow-hidden">
                    <img
                      src={image.preview || "/placeholder.svg"}
                      alt={image.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2 w-6 h-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeImage(image.id)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                  <div className="mt-2">
                    <p className="text-xs font-medium truncate">{image.name}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(image.size)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-[color:var(--file-converters)]" />
            PDF Settings
          </CardTitle>
          <CardDescription>Configure your PDF output settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="page-size">Page Size</Label>
              <Select value={pageSize} onValueChange={setPageSize}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A4">A4 (210 × 297 mm)</SelectItem>
                  <SelectItem value="A3">A3 (297 × 420 mm)</SelectItem>
                  <SelectItem value="Letter">Letter (8.5 × 11 in)</SelectItem>
                  <SelectItem value="Legal">Legal (8.5 × 14 in)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="orientation">Orientation</Label>
              <Select value={orientation} onValueChange={setOrientation}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="portrait">Portrait</SelectItem>
                  <SelectItem value="landscape">Landscape</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Image Quality: {quality[0]}%</Label>
            <Slider value={quality} onValueChange={setQuality} max={100} min={10} step={5} className="w-full" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Lower quality (smaller file)</span>
              <span>Higher quality (larger file)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Convert Button */}
      <div className="flex justify-center">
        <Button
          onClick={convertToPdf}
          disabled={images.length === 0 || isConverting}
          size="lg"
          className="gap-2 bg-[color:var(--file-converters)] hover:bg-[color:var(--file-converters)]/90 text-white"
        >
          {isConverting ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Converting...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Convert to PDF
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
