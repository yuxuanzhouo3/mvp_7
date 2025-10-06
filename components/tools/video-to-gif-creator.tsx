"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Upload, X, Download, Video, Settings, Scissors } from "lucide-react"
import { useDropzone } from "react-dropzone"

interface VideoFile {
  id: string
  file: File
  preview: string
  name: string
  size: number
  duration?: number
}

export function VideoToGifCreator() {
  const [video, setVideo] = useState<VideoFile | null>(null)
  const [startTime, setStartTime] = useState([0])
  const [endTime, setEndTime] = useState([10])
  const [quality, setQuality] = useState([80])
  const [fps, setFps] = useState("15")
  const [width, setWidth] = useState([480])
  const [isConverting, setIsConverting] = useState(false)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (file) {
      const videoFile: VideoFile = {
        id: Math.random().toString(36).substr(2, 9),
        file,
        preview: URL.createObjectURL(file),
        name: file.name,
        size: file.size,
      }
      setVideo(videoFile)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "video/mp4": [".mp4"],
      "video/webm": [".webm"],
      "video/ogg": [".ogg"],
      "video/avi": [".avi"],
      "video/mov": [".mov"],
    },
    multiple: false,
  })

  const removeVideo = () => {
    if (video) {
      URL.revokeObjectURL(video.preview)
      setVideo(null)
    }
  }

  const convertToGif = async () => {
    if (!video) return

    setIsConverting(true)
    try {
      // Mock conversion process
      await new Promise((resolve) => setTimeout(resolve, 3000))

      console.log("Converting video to GIF with settings:", {
        startTime: startTime[0],
        endTime: endTime[0],
        quality: quality[0],
        fps,
        width: width[0],
      })

      // Mock download
      const link = document.createElement("a")
      link.href = "#"
      link.download = `${video.name.split(".")[0]}.gif`
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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-[color:var(--file-converters)]" />
            Upload Video
          </CardTitle>
          <CardDescription>Upload a video file to convert to an animated GIF</CardDescription>
        </CardHeader>
        <CardContent>
          {!video ? (
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? "border-[color:var(--file-converters)] bg-[color:var(--file-converters)]/5"
                  : "border-border hover:border-[color:var(--file-converters)]/50"
              }`}
            >
              <input {...getInputProps()} />
              <Video className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              {isDragActive ? (
                <p className="text-[color:var(--file-converters)]">Drop the video here...</p>
              ) : (
                <div>
                  <p className="text-lg font-medium mb-2">Drop video here or click to upload</p>
                  <p className="text-sm text-muted-foreground">Supports MP4, WebM, OGG, AVI, MOV formats</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 border rounded-lg">
                <Video className="w-8 h-8 text-[color:var(--file-converters)]" />
                <div className="flex-1">
                  <p className="font-medium">{video.name}</p>
                  <p className="text-sm text-muted-foreground">{formatFileSize(video.size)}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={removeVideo} className="text-red-500 hover:text-red-600">
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Video Preview */}
              <div className="aspect-video bg-black rounded-lg overflow-hidden">
                <video
                  src={video.preview}
                  controls
                  className="w-full h-full"
                  onLoadedMetadata={(e) => {
                    const duration = (e.target as HTMLVideoElement).duration
                    setEndTime([Math.min(10, duration)])
                  }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Settings */}
      {video && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-[color:var(--file-converters)]" />
              GIF Settings
            </CardTitle>
            <CardDescription>Configure your GIF output settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Time Range */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Scissors className="w-4 h-4 text-[color:var(--file-converters)]" />
                <Label>Trim Video</Label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Time: {formatTime(startTime[0])}</Label>
                  <Slider
                    value={startTime}
                    onValueChange={setStartTime}
                    max={Math.max(0, endTime[0] - 1)}
                    min={0}
                    step={0.5}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label>End Time: {formatTime(endTime[0])}</Label>
                  <Slider
                    value={endTime}
                    onValueChange={setEndTime}
                    max={30}
                    min={Math.max(1, startTime[0] + 1)}
                    step={0.5}
                    className="w-full"
                  />
                </div>
              </div>

              <p className="text-sm text-muted-foreground">Duration: {formatTime(endTime[0] - startTime[0])}</p>
            </div>

            {/* Quality and Size */}
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
                <Label>Frame Rate (FPS)</Label>
                <Select value={fps} onValueChange={setFps}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 FPS (Smaller file)</SelectItem>
                    <SelectItem value="15">15 FPS (Balanced)</SelectItem>
                    <SelectItem value="24">24 FPS (Smooth)</SelectItem>
                    <SelectItem value="30">30 FPS (High quality)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Width: {width[0]}px</Label>
              <Slider value={width} onValueChange={setWidth} max={1920} min={240} step={40} className="w-full" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>240px (Small)</span>
                <span>1920px (Large)</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Convert Button */}
      <div className="flex justify-center">
        <Button
          onClick={convertToGif}
          disabled={!video || isConverting}
          size="lg"
          className="gap-2 bg-[color:var(--file-converters)] hover:bg-[color:var(--file-converters)]/90 text-white"
        >
          {isConverting ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Creating GIF...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Create GIF
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
