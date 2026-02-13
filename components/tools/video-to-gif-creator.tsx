"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Upload, X, Download, Video, Settings, Scissors } from "lucide-react"
import { useDropzone } from "react-dropzone"
import { FFmpeg } from "@ffmpeg/ffmpeg"
import { fetchFile, toBlobURL } from "@ffmpeg/util"
import { useLanguage } from "@/components/language-provider"

interface VideoFile {
  id: string
  file: File
  preview: string
  name: string
  size: number
  duration?: number
}

export function VideoToGifCreator() {
  const { language } = useLanguage()
  const zh = language === "zh"
  const tx = (zhText: string, enText: string) => (zh ? zhText : enText)

  const [video, setVideo] = useState<VideoFile | null>(null)
  const [startTime, setStartTime] = useState([0])
  const [endTime, setEndTime] = useState([10])
  const [quality, setQuality] = useState([80])
  const [fps, setFps] = useState("15")
  const [width, setWidth] = useState([480])
  const [isConverting, setIsConverting] = useState(false)
  const [isEngineLoading, setIsEngineLoading] = useState(false)
  const [isEngineReady, setIsEngineReady] = useState(false)
  const [engineError, setEngineError] = useState<string | null>(null)
  const [outputUrl, setOutputUrl] = useState<string | null>(null)
  const ffmpegRef = useRef<FFmpeg | null>(null)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (file) {
      if (video) {
        URL.revokeObjectURL(video.preview)
      }
      if (outputUrl) {
        URL.revokeObjectURL(outputUrl)
      }
      const videoFile: VideoFile = {
        id: Math.random().toString(36).substr(2, 9),
        file,
        preview: URL.createObjectURL(file),
        name: file.name,
        size: file.size,
      }
      setVideo(videoFile)
      setOutputUrl(null)
    }
  }, [video, outputUrl])

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
    if (outputUrl) {
      URL.revokeObjectURL(outputUrl)
      setOutputUrl(null)
    }
  }

  const loadEngine = useCallback(async () => {
    if (isEngineReady || isEngineLoading) return

    setIsEngineLoading(true)
    setEngineError(null)
    try {
      const ffmpeg = new FFmpeg()
      const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm"
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
      })
      ffmpegRef.current = ffmpeg
      setIsEngineReady(true)
    } catch (error) {
      console.error("Failed to load video engine:", error)
      setEngineError(tx("视频引擎加载失败，请刷新后重试", "Failed to load video engine. Please refresh and try again."))
    } finally {
      setIsEngineLoading(false)
    }
  }, [isEngineReady, isEngineLoading])

  useEffect(() => {
    if (video && !isEngineReady && !isEngineLoading) {
      void loadEngine()
    }
  }, [video, isEngineReady, isEngineLoading, loadEngine])

  const convertToGif = async () => {
    if (!video) return

    setIsConverting(true)
    try {
      await loadEngine()
      if (!ffmpegRef.current) {
        throw new Error(tx("视频引擎未就绪", "Video engine not ready"))
      }

      if (outputUrl) {
        URL.revokeObjectURL(outputUrl)
        setOutputUrl(null)
      }

      const ffmpeg = ffmpegRef.current
      const extension = video.name.split(".").pop()?.toLowerCase() || "mp4"
      const inputName = `input.${extension}`
      const paletteName = "palette.png"
      const outputName = "output.gif"
      const clipDuration = Math.max(0.1, endTime[0] - startTime[0])
      const bayerScale = Math.max(1, Math.min(5, Math.round((100 - quality[0]) / 20) + 1))

      await ffmpeg.writeFile(inputName, await fetchFile(video.file))
      await ffmpeg.exec([
        "-ss",
        `${startTime[0]}`,
        "-t",
        `${clipDuration}`,
        "-i",
        inputName,
        "-vf",
        `fps=${fps},scale=${width[0]}:-1:flags=lanczos,palettegen`,
        paletteName,
      ])
      await ffmpeg.exec([
        "-ss",
        `${startTime[0]}`,
        "-t",
        `${clipDuration}`,
        "-i",
        inputName,
        "-i",
        paletteName,
        "-lavfi",
        `fps=${fps},scale=${width[0]}:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=${bayerScale}`,
        outputName,
      ])

      const data = await ffmpeg.readFile(outputName)
      const bytes = new Uint8Array(data as Uint8Array)
      const body = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
      const blob = new Blob([body], { type: "image/gif" })
      const url = URL.createObjectURL(blob)
      setOutputUrl(url)

      const link = document.createElement("a")
      link.href = url
      link.download = `${video.name.split(".")[0] || "video"}.gif`
      link.click()

      try {
        await ffmpeg.deleteFile(inputName)
        await ffmpeg.deleteFile(paletteName)
        await ffmpeg.deleteFile(outputName)
      } catch (error) {
        console.warn("Failed to clean up ffmpeg files:", error)
      }
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
            {tx("上传视频", "Upload Video")}
          </CardTitle>
          <CardDescription>{tx("上传视频文件并转换为 GIF 动图", "Upload a video file to convert to an animated GIF")}</CardDescription>
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
                <p className="text-[color:var(--file-converters)]">{tx("松手即可上传视频", "Drop the video here...")}</p>
              ) : (
                <div>
                  <p className="text-lg font-medium mb-2">{tx("拖拽视频到这里，或点击上传", "Drop video here or click to upload")}</p>
                  <p className="text-sm text-muted-foreground">{tx("支持 MP4、WebM、OGG、AVI、MOV", "Supports MP4, WebM, OGG, AVI, MOV formats")}</p>
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
              {tx("GIF 设置", "GIF Settings")}
            </CardTitle>
            <CardDescription>{tx("配置 GIF 输出参数", "Configure your GIF output settings")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Time Range */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Scissors className="w-4 h-4 text-[color:var(--file-converters)]" />
                <Label>{tx("裁剪时长", "Trim Video")}</Label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{tx("开始时间", "Start Time")}: {formatTime(startTime[0])}</Label>
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
                  <Label>{tx("结束时间", "End Time")}: {formatTime(endTime[0])}</Label>
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

              <p className="text-sm text-muted-foreground">{tx("时长", "Duration")}: {formatTime(endTime[0] - startTime[0])}</p>
            </div>

            {/* Quality and Size */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label>{tx("质量", "Quality")}: {quality[0]}%</Label>
                <Slider value={quality} onValueChange={setQuality} max={100} min={10} step={5} className="w-full" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{tx("更小体积", "Smaller file")}</span>
                  <span>{tx("更高质量", "Better quality")}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>{tx("帧率 (FPS)", "Frame Rate (FPS)")}</Label>
                <Select value={fps} onValueChange={setFps}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">{tx("10 FPS（更小体积）", "10 FPS (Smaller file)")}</SelectItem>
                    <SelectItem value="15">{tx("15 FPS（均衡）", "15 FPS (Balanced)")}</SelectItem>
                    <SelectItem value="24">{tx("24 FPS（更流畅）", "24 FPS (Smooth)")}</SelectItem>
                    <SelectItem value="30">{tx("30 FPS（高质量）", "30 FPS (High quality)")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <Label>{tx("宽度", "Width")}: {width[0]}px</Label>
              <Slider value={width} onValueChange={setWidth} max={1920} min={240} step={40} className="w-full" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{tx("240px（小）", "240px (Small)")}</span>
                <span>{tx("1920px（大）", "1920px (Large)")}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Convert Button */}
      <div className="flex flex-col items-center gap-3">
        {engineError && <p className="text-sm text-red-500">{engineError}</p>}
        <Button
          onClick={convertToGif}
          disabled={!video || isConverting || isEngineLoading || !!engineError}
          size="lg"
          className="gap-2 bg-[color:var(--file-converters)] hover:bg-[color:var(--file-converters)]/90 text-white"
        >
          {isConverting || isEngineLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              {isEngineLoading ? tx("加载引擎中...", "Loading Engine...") : tx("生成 GIF 中...", "Creating GIF...")}
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              {tx("生成 GIF", "Create GIF")}
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
