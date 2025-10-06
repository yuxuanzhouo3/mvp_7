import { notFound } from "next/navigation"
import { ToolLayout } from "@/components/tool-layout"
import { JpegToPdfConverter } from "@/components/tools/jpeg-to-pdf-converter"
import { FileFormatConverter } from "@/components/tools/file-format-converter"
import { VideoToGifCreator } from "@/components/tools/video-to-gif-creator"
import { BulkImageResizer } from "@/components/tools/bulk-image-resizer"
import { QrCodeGenerator } from "@/components/tools/qr-code-generator"
import { CurrencyConverter } from "@/components/tools/currency-converter"
import { UnitConverter } from "@/components/tools/unit-converter"
import { TextUtilities } from "@/components/tools/text-utilities"
import { TimezoneConverter } from "@/components/tools/timezone-converter"
import { EmailMultiSender } from "@/components/tools/email-multi-sender"
import { TextMultiSender } from "@/components/tools/text-multi-sender"
import { SocialAutoPoster } from "@/components/tools/social-auto-poster"
import { DataScraperPro } from "@/components/tools/data-scraper-pro"

const toolComponents = {
  "jpeg-to-pdf": JpegToPdfConverter,
  "file-format-converter": FileFormatConverter,
  "video-to-gif": VideoToGifCreator,
  "bulk-image-resizer": BulkImageResizer,
  "qr-generator": QrCodeGenerator,
  "currency-converter": CurrencyConverter,
  "unit-converter": UnitConverter,
  "text-utilities": TextUtilities,
  "timezone-converter": TimezoneConverter,
  "email-multi-sender": EmailMultiSender,
  "text-multi-sender": TextMultiSender,
  "social-auto-poster": SocialAutoPoster,
  "data-scraper": DataScraperPro,
}

const toolMetadata = {
  "jpeg-to-pdf": {
    title: "JPEG to PDF Converter",
    description: "Convert and merge multiple images into high-quality PDF documents",
    category: "file-converters",
  },
  "file-format-converter": {
    title: "File Format Converter",
    description: "Convert DOC, PPT, XLS files to PDF with batch processing",
    category: "file-converters",
  },
  "video-to-gif": {
    title: "Video to GIF Creator",
    description: "Create optimized GIFs from video clips with custom settings",
    category: "file-converters",
  },
  "bulk-image-resizer": {
    title: "Bulk Image Resizer",
    description: "Resize multiple images with aspect ratio and compression options",
    category: "file-converters",
  },
  "qr-generator": {
    title: "QR Code Generator",
    description: "Generate QR codes for URLs, text, WiFi, and contacts with customization",
    category: "productivity",
  },
  "currency-converter": {
    title: "Currency Converter",
    description: "Real-time exchange rates with historical data and bulk conversion",
    category: "productivity",
  },
  "unit-converter": {
    title: "Unit Conversion Toolkit",
    description: "Convert length, weight, temperature, and volume with custom formulas",
    category: "productivity",
  },
  "text-utilities": {
    title: "Text Utilities Suite",
    description: "Case conversion, word counting, and text formatting tools",
    category: "productivity",
  },
  "timezone-converter": {
    title: "Time Zone Converter",
    description: "Convert between time zones and schedule meetings globally",
    category: "productivity",
  },
  "email-multi-sender": {
    title: "Email Multi Sender",
    description: "Send personalized emails to multiple recipients with CSV upload and templates",
    category: "job-application",
  },
  "text-multi-sender": {
    title: "Text Multi Sender",
    description: "Bulk SMS and WhatsApp messaging with scheduling and personalization",
    category: "job-application",
  },
  "social-auto-poster": {
    title: "Social Media Auto Poster",
    description: "Schedule posts across Twitter, LinkedIn, and Facebook with analytics",
    category: "social-media",
  },
  "data-scraper": {
    title: "Data Scraper Pro",
    description: "Extract emails, phone numbers, and custom data from websites",
    category: "data-extraction",
  },
}

interface ToolPageProps {
  params: {
    toolId: string
  }
}

export default function ToolPage({ params }: ToolPageProps) {
  const { toolId } = params
  const ToolComponent = toolComponents[toolId as keyof typeof toolComponents]
  const metadata = toolMetadata[toolId as keyof typeof toolMetadata]

  if (!ToolComponent || !metadata) {
    notFound()
  }

  return (
    <ToolLayout title={metadata.title} description={metadata.description} category={metadata.category}>
      <ToolComponent />
    </ToolLayout>
  )
}
