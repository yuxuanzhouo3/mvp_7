import { promises as fs } from "fs"
import path from "path"
import crypto from "crypto"

const BASE_DIR = process.env.TOOL_STORAGE_DIR || "/tmp/mvp7-tool-storage"
const CHUNK_DIR = path.join(BASE_DIR, "chunks")
const FILE_DIR = path.join(BASE_DIR, "files")
const INDEX_FILE = path.join(BASE_DIR, "index.json")

export interface StoredFileRecord {
  id: string
  fileName: string
  mimeType: string
  size: number
  filePath: string
  createdAt: string
}

function sanitizeFileName(input: string) {
  return String(input || "")
    .trim()
    .replace(/[^\w.\-() ]+/g, "_")
    .replace(/\s+/g, " ")
    .slice(0, 200) || "file.bin"
}

async function ensureStorageReady() {
  await fs.mkdir(CHUNK_DIR, { recursive: true })
  await fs.mkdir(FILE_DIR, { recursive: true })

  try {
    await fs.access(INDEX_FILE)
  } catch {
    await fs.writeFile(INDEX_FILE, "[]", "utf8")
  }
}

async function readIndex(): Promise<StoredFileRecord[]> {
  await ensureStorageReady()
  const raw = await fs.readFile(INDEX_FILE, "utf8")

  try {
    const data = JSON.parse(raw)
    if (!Array.isArray(data)) return []
    return data.filter((item) => item && typeof item.id === "string")
  } catch {
    return []
  }
}

async function writeIndex(records: StoredFileRecord[]) {
  await ensureStorageReady()
  await fs.writeFile(INDEX_FILE, JSON.stringify(records, null, 2), "utf8")
}

function getChunkUploadDir(uploadId: string) {
  return path.join(CHUNK_DIR, uploadId.replace(/[^\w\-]/g, "_"))
}

export async function saveChunk(params: {
  uploadId: string
  chunkIndex: number
  chunkData: Buffer
}) {
  await ensureStorageReady()
  const dir = getChunkUploadDir(params.uploadId)
  await fs.mkdir(dir, { recursive: true })
  const filePath = path.join(dir, `${params.chunkIndex}.part`)
  await fs.writeFile(filePath, params.chunkData)
}

export async function completeChunkUpload(params: {
  uploadId: string
  fileName: string
  mimeType?: string
}) {
  await ensureStorageReady()
  const uploadDir = getChunkUploadDir(params.uploadId)
  const chunkNames = await fs.readdir(uploadDir)

  const orderedParts = chunkNames
    .filter((name) => name.endsWith(".part"))
    .sort((a, b) => Number(a.replace(".part", "")) - Number(b.replace(".part", "")))

  if (orderedParts.length === 0) {
    throw new Error("No chunks found for upload")
  }

  const safeName = sanitizeFileName(params.fileName)
  const fileId = crypto.randomUUID()
  const outputPath = path.join(FILE_DIR, `${fileId}__${safeName}`)

  const target = await fs.open(outputPath, "w")
  try {
    for (const partName of orderedParts) {
      const partPath = path.join(uploadDir, partName)
      const bytes = await fs.readFile(partPath)
      await target.write(bytes)
    }
  } finally {
    await target.close()
  }

  const stat = await fs.stat(outputPath)
  await fs.rm(uploadDir, { recursive: true, force: true })

  const record: StoredFileRecord = {
    id: fileId,
    fileName: safeName,
    mimeType: String(params.mimeType || "application/octet-stream"),
    size: stat.size,
    filePath: outputPath,
    createdAt: new Date().toISOString(),
  }

  const records = await readIndex()
  records.unshift(record)
  await writeIndex(records)
  return record
}

export async function saveDirectFile(params: {
  fileName: string
  mimeType?: string
  data: Buffer
}) {
  await ensureStorageReady()
  const safeName = sanitizeFileName(params.fileName)
  const fileId = crypto.randomUUID()
  const outputPath = path.join(FILE_DIR, `${fileId}__${safeName}`)

  await fs.writeFile(outputPath, params.data)
  const stat = await fs.stat(outputPath)

  const record: StoredFileRecord = {
    id: fileId,
    fileName: safeName,
    mimeType: String(params.mimeType || "application/octet-stream"),
    size: stat.size,
    filePath: outputPath,
    createdAt: new Date().toISOString(),
  }

  const records = await readIndex()
  records.unshift(record)
  await writeIndex(records)
  return record
}

export async function listStoredFiles() {
  const records = await readIndex()
  return records
    .filter((item) => Boolean(item?.id && item?.filePath))
    .sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1))
}

export async function getStoredFileById(id: string) {
  const records = await readIndex()
  return records.find((item) => item.id === id) || null
}

export async function deleteStoredFileById(id: string) {
  const records = await readIndex()
  const target = records.find((item) => item.id === id)
  if (!target) return false

  await fs.rm(target.filePath, { force: true })
  const next = records.filter((item) => item.id !== id)
  await writeIndex(next)
  return true
}

