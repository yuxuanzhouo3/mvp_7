"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { QrCode, Download, Copy, Wifi, User, Link, MessageSquare, Palette } from "lucide-react"

interface QRCodeData {
  type: "url" | "text" | "wifi" | "contact" | "sms"
  content: string
  size: number
  errorCorrection: "L" | "M" | "Q" | "H"
  foregroundColor: string
  backgroundColor: string
}

export function QrCodeGenerator() {
  const [qrData, setQrData] = useState<QRCodeData>({
    type: "url",
    content: "",
    size: 256,
    errorCorrection: "M",
    foregroundColor: "#000000",
    backgroundColor: "#ffffff",
  })

  const [wifiData, setWifiData] = useState({
    ssid: "",
    password: "",
    security: "WPA",
    hidden: false,
  })

  const [contactData, setContactData] = useState({
    name: "",
    phone: "",
    email: "",
    organization: "",
    url: "",
  })

  const [smsData, setSmsData] = useState({
    phone: "",
    message: "",
  })

  const [generatedQR, setGeneratedQR] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const generateQRCode = async () => {
    setIsGenerating(true)

    let content = ""

    switch (qrData.type) {
      case "url":
      case "text":
        content = qrData.content
        break
      case "wifi":
        content = `WIFI:T:${wifiData.security};S:${wifiData.ssid};P:${wifiData.password};H:${wifiData.hidden ? "true" : "false"};;`
        break
      case "contact":
        content = `BEGIN:VCARD\nVERSION:3.0\nFN:${contactData.name}\nTEL:${contactData.phone}\nEMAIL:${contactData.email}\nORG:${contactData.organization}\nURL:${contactData.url}\nEND:VCARD`
        break
      case "sms":
        content = `sms:${smsData.phone}?body=${encodeURIComponent(smsData.message)}`
        break
    }

    try {
      // Mock QR code generation - in real implementation, use a library like qrcode
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Generate a mock QR code data URL
      const canvas = document.createElement("canvas")
      canvas.width = qrData.size
      canvas.height = qrData.size
      const ctx = canvas.getContext("2d")

      if (ctx) {
        // Fill background
        ctx.fillStyle = qrData.backgroundColor
        ctx.fillRect(0, 0, qrData.size, qrData.size)

        // Draw mock QR pattern
        ctx.fillStyle = qrData.foregroundColor
        const moduleSize = qrData.size / 25

        // Draw finder patterns (corners)
        const drawFinderPattern = (x: number, y: number) => {
          ctx.fillRect(x * moduleSize, y * moduleSize, 7 * moduleSize, 7 * moduleSize)
          ctx.fillStyle = qrData.backgroundColor
          ctx.fillRect((x + 1) * moduleSize, (y + 1) * moduleSize, 5 * moduleSize, 5 * moduleSize)
          ctx.fillStyle = qrData.foregroundColor
          ctx.fillRect((x + 2) * moduleSize, (y + 2) * moduleSize, 3 * moduleSize, 3 * moduleSize)
        }

        drawFinderPattern(0, 0)
        drawFinderPattern(18, 0)
        drawFinderPattern(0, 18)

        // Draw some random data modules
        for (let i = 0; i < 200; i++) {
          const x = Math.floor(Math.random() * 25)
          const y = Math.floor(Math.random() * 25)
          if (Math.random() > 0.5) {
            ctx.fillRect(x * moduleSize, y * moduleSize, moduleSize, moduleSize)
          }
        }
      }

      setGeneratedQR(canvas.toDataURL())

      console.log("Generated QR code for:", content)
    } catch (error) {
      console.error("QR generation failed:", error)
    } finally {
      setIsGenerating(false)
    }
  }

  const downloadQR = () => {
    if (!generatedQR) return

    const link = document.createElement("a")
    link.href = generatedQR
    link.download = `qr-code-${qrData.type}.png`
    link.click()
  }

  const copyToClipboard = async () => {
    if (!generatedQR) return

    try {
      const response = await fetch(generatedQR)
      const blob = await response.blob()
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })])
    } catch (error) {
      console.error("Failed to copy to clipboard:", error)
    }
  }

  const isContentValid = () => {
    switch (qrData.type) {
      case "url":
      case "text":
        return qrData.content.trim().length > 0
      case "wifi":
        return wifiData.ssid.trim().length > 0
      case "contact":
        return contactData.name.trim().length > 0 || contactData.phone.trim().length > 0
      case "sms":
        return smsData.phone.trim().length > 0
      default:
        return false
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-[color:var(--productivity)]" />
                QR Code Content
              </CardTitle>
              <CardDescription>Choose what type of QR code you want to create</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs
                value={qrData.type}
                onValueChange={(value) => setQrData((prev) => ({ ...prev, type: value as any }))}
              >
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="url" className="gap-1">
                    <Link className="w-3 h-3" />
                    URL
                  </TabsTrigger>
                  <TabsTrigger value="text" className="gap-1">
                    <MessageSquare className="w-3 h-3" />
                    Text
                  </TabsTrigger>
                  <TabsTrigger value="wifi" className="gap-1">
                    <Wifi className="w-3 h-3" />
                    WiFi
                  </TabsTrigger>
                  <TabsTrigger value="contact" className="gap-1">
                    <User className="w-3 h-3" />
                    Contact
                  </TabsTrigger>
                  <TabsTrigger value="sms" className="gap-1">
                    <MessageSquare className="w-3 h-3" />
                    SMS
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="url" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="url">Website URL</Label>
                    <Input
                      id="url"
                      placeholder="https://example.com"
                      value={qrData.content}
                      onChange={(e) => setQrData((prev) => ({ ...prev, content: e.target.value }))}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="text" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="text">Text Content</Label>
                    <Textarea
                      id="text"
                      placeholder="Enter any text you want to encode..."
                      value={qrData.content}
                      onChange={(e) => setQrData((prev) => ({ ...prev, content: e.target.value }))}
                      rows={4}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="wifi" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="ssid">Network Name (SSID)</Label>
                      <Input
                        id="ssid"
                        placeholder="My WiFi Network"
                        value={wifiData.ssid}
                        onChange={(e) => setWifiData((prev) => ({ ...prev, ssid: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="wifi-password">Password</Label>
                      <Input
                        id="wifi-password"
                        type="password"
                        placeholder="WiFi password"
                        value={wifiData.password}
                        onChange={(e) => setWifiData((prev) => ({ ...prev, password: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Security Type</Label>
                    <Select
                      value={wifiData.security}
                      onValueChange={(value) => setWifiData((prev) => ({ ...prev, security: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="WPA">WPA/WPA2</SelectItem>
                        <SelectItem value="WEP">WEP</SelectItem>
                        <SelectItem value="nopass">No Password</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>

                <TabsContent value="contact" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="contact-name">Full Name</Label>
                      <Input
                        id="contact-name"
                        placeholder="John Doe"
                        value={contactData.name}
                        onChange={(e) => setContactData((prev) => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact-phone">Phone Number</Label>
                      <Input
                        id="contact-phone"
                        placeholder="+1234567890"
                        value={contactData.phone}
                        onChange={(e) => setContactData((prev) => ({ ...prev, phone: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="contact-email">Email</Label>
                      <Input
                        id="contact-email"
                        type="email"
                        placeholder="john@example.com"
                        value={contactData.email}
                        onChange={(e) => setContactData((prev) => ({ ...prev, email: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact-org">Organization</Label>
                      <Input
                        id="contact-org"
                        placeholder="Company Name"
                        value={contactData.organization}
                        onChange={(e) => setContactData((prev) => ({ ...prev, organization: e.target.value }))}
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="sms" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="sms-phone">Phone Number</Label>
                    <Input
                      id="sms-phone"
                      placeholder="+1234567890"
                      value={smsData.phone}
                      onChange={(e) => setSmsData((prev) => ({ ...prev, phone: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sms-message">Message (Optional)</Label>
                    <Textarea
                      id="sms-message"
                      placeholder="Pre-filled message..."
                      value={smsData.message}
                      onChange={(e) => setSmsData((prev) => ({ ...prev, message: e.target.value }))}
                      rows={3}
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Customization */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5 text-[color:var(--productivity)]" />
                Customization
              </CardTitle>
              <CardDescription>Customize the appearance of your QR code</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="size">Size (pixels)</Label>
                  <Select
                    value={qrData.size.toString()}
                    onValueChange={(value) => setQrData((prev) => ({ ...prev, size: Number.parseInt(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="128">128x128</SelectItem>
                      <SelectItem value="256">256x256</SelectItem>
                      <SelectItem value="512">512x512</SelectItem>
                      <SelectItem value="1024">1024x1024</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="error-correction">Error Correction</Label>
                  <Select
                    value={qrData.errorCorrection}
                    onValueChange={(value) => setQrData((prev) => ({ ...prev, errorCorrection: value as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="L">Low (7%)</SelectItem>
                      <SelectItem value="M">Medium (15%)</SelectItem>
                      <SelectItem value="Q">Quartile (25%)</SelectItem>
                      <SelectItem value="H">High (30%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fg-color">Foreground Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="fg-color"
                      type="color"
                      value={qrData.foregroundColor}
                      onChange={(e) => setQrData((prev) => ({ ...prev, foregroundColor: e.target.value }))}
                      className="w-16 h-10 p-1"
                    />
                    <Input
                      value={qrData.foregroundColor}
                      onChange={(e) => setQrData((prev) => ({ ...prev, foregroundColor: e.target.value }))}
                      placeholder="#000000"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bg-color">Background Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="bg-color"
                      type="color"
                      value={qrData.backgroundColor}
                      onChange={(e) => setQrData((prev) => ({ ...prev, backgroundColor: e.target.value }))}
                      className="w-16 h-10 p-1"
                    />
                    <Input
                      value={qrData.backgroundColor}
                      onChange={(e) => setQrData((prev) => ({ ...prev, backgroundColor: e.target.value }))}
                      placeholder="#ffffff"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview Section */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>QR Code Preview</CardTitle>
              <CardDescription>Preview your QR code before downloading</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center space-y-4">
                {generatedQR ? (
                  <div className="p-4 bg-white rounded-lg shadow-sm">
                    <img
                      src={generatedQR || "/placeholder.svg"}
                      alt="Generated QR Code"
                      className="max-w-full h-auto"
                      style={{ maxWidth: "300px" }}
                    />
                  </div>
                ) : (
                  <div className="w-64 h-64 border-2 border-dashed border-muted-foreground/25 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <QrCode className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">QR code will appear here</p>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={generateQRCode}
                    disabled={!isContentValid() || isGenerating}
                    className="bg-[color:var(--productivity)] hover:bg-[color:var(--productivity)]/90 text-white"
                  >
                    {isGenerating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <QrCode className="w-4 h-4 mr-2" />
                        Generate QR Code
                      </>
                    )}
                  </Button>
                </div>

                {generatedQR && (
                  <div className="flex gap-2">
                    <Button onClick={downloadQR} variant="outline" className="gap-2 bg-transparent">
                      <Download className="w-4 h-4" />
                      Download
                    </Button>
                    <Button onClick={copyToClipboard} variant="outline" className="gap-2 bg-transparent">
                      <Copy className="w-4 h-4" />
                      Copy
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
