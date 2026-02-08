import {
  Mail,
  MessageSquare,
  Share2,
  Database,
  FileImage,
  FileText,
  Video,
  ImageIcon,
  QrCode,
  DollarSign,
  Calculator,
  Type,
  Globe,
  Briefcase,
  Users,
  Download,
  Zap,
  Settings,
} from "lucide-react"

// 定义工具类型
export interface Tool {
  id: string
  nameKey: string
  descriptionKey: string
  category: "job-application" | "social-media" | "data-extraction" | "file-converters" | "productivity"
  icon: React.ComponentType<{ className?: string }>
  isFavorite?: boolean
  isNew?: boolean
}

export const tools: Tool[] = [
  // Job Application Tools
  {
    id: "email-multi-sender",
    nameKey: "emailMultiSender",
    descriptionKey: "emailMultiSenderDesc",
    category: "job-application",
    icon: Mail,
    isNew: true,
  },
  {
    id: "text-multi-sender",
    nameKey: "textMultiSender",
    descriptionKey: "textMultiSenderDesc",
    category: "job-application",
    icon: MessageSquare,
  },

  // Social Media Tools
  {
    id: "social-auto-poster",
    nameKey: "socialAutoPoster",
    descriptionKey: "socialAutoPosterDesc",
    category: "social-media",
    icon: Share2,
    isNew: true,
  },

  // Data Extraction Tools
  {
    id: "data-scraper",
    nameKey: "dataScraper",
    descriptionKey: "dataScraperDesc",
    category: "data-extraction",
    icon: Database,
  },

  // File Converters
  {
    id: "jpeg-to-pdf",
    nameKey: "jpegToPdf",
    descriptionKey: "jpegToPdfDesc",
    category: "file-converters",
    icon: FileImage,
    isFavorite: true,
  },
  {
    id: "file-format-converter",
    nameKey: "fileFormatConverter",
    descriptionKey: "fileFormatConverterDesc",
    category: "file-converters",
    icon: FileText,
  },
  {
    id: "video-to-gif",
    nameKey: "videoToGif",
    descriptionKey: "videoToGifDesc",
    category: "file-converters",
    icon: Video,
  },
  {
    id: "bulk-image-resizer",
    nameKey: "bulkImageResizer",
    descriptionKey: "bulkImageResizerDesc",
    category: "file-converters",
    icon: ImageIcon,
  },

  // Productivity Utilities
  {
    id: "qr-generator",
    nameKey: "qrGenerator",
    descriptionKey: "qrGeneratorDesc",
    category: "productivity",
    icon: QrCode,
  },
  {
    id: "currency-converter",
    nameKey: "currencyConverter",
    descriptionKey: "currencyConverterDesc",
    category: "productivity",
    icon: DollarSign,
  },
  {
    id: "unit-converter",
    nameKey: "unitConverter",
    descriptionKey: "unitConverterDesc",
    category: "productivity",
    icon: Calculator,
  },
  {
    id: "text-utilities",
    nameKey: "textUtilities",
    descriptionKey: "textUtilitiesDesc",
    category: "productivity",
    icon: Type,
  },
  {
    id: "timezone-converter",
    nameKey: "timezoneConverter",
    descriptionKey: "timezoneConverterDesc",
    category: "productivity",
    icon: Globe,
  },
];

// 定义分类
export const categories = [
  {
    id: "all",
    nameKey: "all",
    icon: Zap,
    color: "text-foreground",
    count: tools.length,
  },
  {
    id: "job-application",
    nameKey: "jobApplication",
    icon: Briefcase,
    color: "text-[color:var(--job-application)]",
    count: tools.filter((t) => t.category === "job-application").length,
  },
  {
    id: "social-media",
    nameKey: "socialMedia",
    icon: Users,
    color: "text-[color:var(--social-media)]",
    count: tools.filter((t) => t.category === "social-media").length,
  },
  {
    id: "data-extraction",
    nameKey: "dataExtraction",
    icon: Database,
    color: "text-[color:var(--data-extraction)]",
    count: tools.filter((t) => t.category === "data-extraction").length,
  },
  {
    id: "file-converters",
    nameKey: "fileConverters",
    icon: Download,
    color: "text-[color:var(--file-converters)]",
    count: tools.filter((t) => t.category === "file-converters").length,
  },
  {
    id: "productivity",
    nameKey: "productivity",
    icon: Settings,
    color: "text-[color:var(--productivity)]",
    count: tools.filter((t) => t.category === "productivity").length,
  },
];

export { CREDIT_PACKAGES as creditPackages } from "@/lib/credits/pricing"