"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Upload, X, Download, FileText, ArrowRight } from "lucide-react"
import { useDropzone } from "react-dropzone"

interface ConversionFile {
  id: string
  file: File
  name: string
  size: number
  type: string
  status: "pending" | "converting" | "completed" | "error"
}

const supportedFormats = {
  input: [
    { value: "doc", label: "Word Document (.doc)", accept: ".doc" },
    { value: "docx", label: "Word Document (.docx)", accept: ".docx" },
    { value: "ppt", label: "PowerPoint (.ppt)", accept: ".ppt" },
    { value: "pptx", label: "PowerPoint (.pptx)", accept: ".pptx" },
    { value: "xls", label: "Excel (.xls)", accept: ".xls" },
    { value: "xlsx", label: "Excel (.xlsx)", accept: ".xlsx" },
  ],
  output: [
    { value: "pdf", label: "PDF Document (.pdf)" },
    { value: "docx", label: "Word Document (.docx)" },
    { value: "txt", label: "Plain Text (.txt)" },
  ],
}

export function FileFormatConverter() {
  const [files, setFiles] = useState<ConversionFile[]>([])
  const [outputFormat, setOutputFormat] = useState("pdf")
  const [isConverting, setIsConverting] = useState(false)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      name: file.name,
      size: file.size,
      type: file.name.split(".").pop()?.toLowerCase() || "",
      status: "pending" as const,
    }))
    setFiles((prev) => [...prev, ...newFiles])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "application/vnd.ms-powerpoint": [".ppt"],
      "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
      "application/vnd.ms-excel": [".xls"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
    },
    multiple: true,
  })

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((file) => file.id !== id))
  }

  const convertFiles = async () => {
    if (files.length === 0) return

    setIsConverting(true)

    // Update all files to converting status
    setFiles((prev) => prev.map((file) => ({ ...file, status: "converting" as const })))

    try {
      // Mock conversion process
      for (let i = 0; i < files.length; i++) {
        await new Promise((resolve) => setTimeout(resolve, 1500))

        setFiles((prev) => prev.map((file, index) => (index === i ? { ...file, status: "completed" as const } : file)))
      }

      // Mock download of converted files
      console.log("Converting files to", outputFormat)
    } catch (error) {
      console.error("Conversion failed:", error)
      setFiles((prev) => prev.map((file) => ({ ...file, status: "error" as const })))
    } finally {
      setIsConverting(false)
    }
  }

  const downloadFile = (file: ConversionFile) => {
    // Mock download
    const link = document.createElement("a")
    link.href = "#"
    link.download = `${file.name.split(".")[0]}.${outputFormat}`
    link.click()
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const getFileIcon = (type: string) => {
    return <FileText className="w-8 h-8 text-[color:var(--file-converters)]" />
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "text-muted-foreground"
      case "converting":
        return "text-[color:var(--file-converters)]"
      case "completed":
        return "text-green-500"
      case "error":
        return "text-red-500"
      default:
        return "text-muted-foreground"
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-[color:var(--file-converters)]" />
            Upload Documents
          </CardTitle>
          <CardDescription>Upload Word, PowerPoint, or Excel files for conversion</CardDescription>
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
            <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            {isDragActive ? (
              <p className="text-[color:var(--file-converters)]">Drop the files here...</p>
            ) : (
              <div>
                <p className="text-lg font-medium mb-2">Drop documents here or click to upload</p>
                <p className="text-sm text-muted-foreground">Supports DOC, DOCX, PPT, PPTX, XLS, XLSX formats</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Output Format Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Output Format</CardTitle>
          <CardDescription>Choose the format you want to convert your files to</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={outputFormat} onValueChange={setOutputFormat}>
            <SelectTrigger className="w-full md:w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {supportedFormats.output.map((format) => (
                <SelectItem key={format.value} value={format.value}>
                  {format.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* File List */}
      {files.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Files to Convert ({files.length})</CardTitle>
            <CardDescription>Review your files before conversion</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {files.map((file) => (
                <div key={file.id} className="flex items-center gap-4 p-4 border rounded-lg">
                  <div className="flex-shrink-0">{getFileIcon(file.type)}</div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatFileSize(file.size)} • {file.type.toUpperCase()}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{outputFormat.toUpperCase()}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${getStatusColor(file.status)}`}>
                      {file.status === "pending" && "Ready"}
                      {file.status === "converting" && "Converting..."}
                      {file.status === "completed" && "Completed"}
                      {file.status === "error" && "Error"}
                    </span>

                    {file.status === "completed" && (
                      <Button variant="outline" size="sm" onClick={() => downloadFile(file)} className="gap-1">
                        <Download className="w-3 h-3" />
                        Download
                      </Button>
                    )}

                    {file.status === "pending" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(file.id)}
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

      {/* Convert Button */}
      <div className="flex justify-center">
        <Button
          onClick={convertFiles}
          disabled={files.length === 0 || isConverting}
          size="lg"
          className="gap-2 bg-[color:var(--file-converters)] hover:bg-[color:var(--file-converters)]/90 text-white"
        >
          {isConverting ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Converting Files...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Convert All Files
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
