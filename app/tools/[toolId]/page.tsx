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
import { getTranslations } from "@/lib/i18n";
import { cookies } from "next/headers";
import { getToolCreditCost } from "@/lib/credits/pricing"

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

interface ToolPageProps {
  params: {
    toolId: string
  }
}

// 获取工具元数据
const getToolMetadata = (language: 'zh' | 'en') => {
  const t = getTranslations(language);

  return {
    "jpeg-to-pdf": {
      title: t.tools?.jpegToPdf?.name || "JPEG to PDF Converter",
      description: t.tools?.jpegToPdf?.description || "Convert and merge multiple images into high-quality PDF documents",
      category: "file-converters",
    },
    "file-format-converter": {
      title: t.tools?.fileFormatConverter?.name || "File Format Converter",
      description: t.tools?.fileFormatConverter?.description || "Convert DOC, PPT, XLS files to PDF with batch processing",
      category: "file-converters",
    },
    "video-to-gif": {
      title: t.tools?.videoToGif?.name || "Video to GIF Creator",
      description: t.tools?.videoToGif?.description || "Create optimized GIFs from video clips with custom settings",
      category: "file-converters",
    },
    "bulk-image-resizer": {
      title: t.tools?.bulkImageResizer?.name || "Bulk Image Resizer",
      description: t.tools?.bulkImageResizer?.description || "Resize multiple images with aspect ratio and compression options",
      category: "file-converters",
    },
    "qr-generator": {
      title: t.tools?.qrGenerator?.name || "QR Code Generator",
      description: t.tools?.qrGenerator?.description || "Generate QR codes for URLs, text, WiFi, and contacts with customization",
      category: "productivity",
    },
    "currency-converter": {
      title: t.tools?.currencyConverter?.name || "Currency Converter",
      description: t.tools?.currencyConverter?.description || "Real-time exchange rates with historical data and bulk conversion",
      category: "productivity",
    },
    "unit-converter": {
      title: t.tools?.unitConverter?.name || "Unit Conversion Toolkit",
      description: t.tools?.unitConverter?.description || "Convert length, weight, temperature, and volume with custom formulas",
      category: "productivity",
    },
    "text-utilities": {
      title: t.tools?.textUtilities?.name || "Text Utilities Suite",
      description: t.tools?.textUtilities?.description || "Case conversion, word counting, and text formatting tools",
      category: "productivity",
    },
    "timezone-converter": {
      title: t.tools?.timezoneConverter?.name || "Time Zone Converter",
      description: t.tools?.timezoneConverter?.description || "Convert between time zones and schedule meetings globally",
      category: "productivity",
    },
    "email-multi-sender": {
      title: t.tools?.emailMultiSender?.name || "Email Multi Sender",
      description: t.tools?.emailMultiSender?.description || "Send personalized emails to multiple recipients with CSV upload and templates",
      category: "job-application",
    },
    "text-multi-sender": {
      title: t.tools?.textMultiSender?.name || "Text Multi Sender",
      description: t.tools?.textMultiSender?.description || "Bulk SMS and WhatsApp messaging with scheduling and personalization",
      category: "job-application",
    },
    "social-auto-poster": {
      title: t.tools?.socialAutoPoster?.name || "Social Media Auto Poster",
      description: t.tools?.socialAutoPoster?.description || "Schedule posts across Twitter, LinkedIn, and Facebook with analytics",
      category: "social-media",
    },
    "data-scraper": {
      title: t.tools?.dataScraper?.name || "Data Scraper Pro",
      description: t.tools?.dataScraper?.description || "Extract emails, phone numbers, and custom data from websites",
      category: "data-extraction",
    },
  };
}

export default function ToolPage({ params }: ToolPageProps) {
  const { toolId } = params
  const ToolComponent = toolComponents[toolId as keyof typeof toolComponents]

  // 从 cookie 获取语言偏好，如果没有则默认为中文
  const langCookie = cookies().get('language')?.value;
  const language = (langCookie === 'en' ? 'en' : 'zh') as 'zh' | 'en';

  const toolMetadata = getToolMetadata(language);
  const metadata = toolMetadata[toolId as keyof typeof toolMetadata]
  const creditCost = getToolCreditCost(toolId)

  if (!ToolComponent || !metadata) {
    notFound()
  }

  return (
      <ToolLayout title={metadata.title} description={metadata.description} category={metadata.category} creditCost={creditCost}>
        <ToolComponent />
      </ToolLayout>
  )
}
