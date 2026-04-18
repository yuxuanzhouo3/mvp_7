import { NextResponse } from 'next/server'
import dns from 'dns'
import { promisify } from 'util'

const resolveMx = promisify(dns.resolveMx)
const resolve4 = promisify(dns.resolve4)

interface ValidationResult {
  email: string
  valid: boolean
  reason?: string
}

// Cache domain results to avoid repeated DNS lookups
const domainCache = new Map<string, { valid: boolean; reason?: string; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

async function validateDomain(domain: string): Promise<{ valid: boolean; reason?: string }> {
  // Check cache first
  const cached = domainCache.get(domain)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return { valid: cached.valid, reason: cached.reason }
  }

  try {
    // Try MX records first
    const mxRecords = await resolveMx(domain)
    if (mxRecords && mxRecords.length > 0) {
      domainCache.set(domain, { valid: true, timestamp: Date.now() })
      return { valid: true }
    }
  } catch (mxErr: any) {
    // If MX lookup fails, try A record as fallback
    try {
      const aRecords = await resolve4(domain)
      if (aRecords && aRecords.length > 0) {
        domainCache.set(domain, { valid: true, timestamp: Date.now() })
        return { valid: true }
      }
    } catch (aErr: any) {
      // Both MX and A record lookups failed
      const reason = mxErr.code === 'ENOTFOUND' || aErr?.code === 'ENOTFOUND'
        ? 'DOMAIN_NOT_FOUND'
        : mxErr.code === 'ENODATA'
          ? 'NO_MX_RECORD'
          : 'DNS_ERROR'

      domainCache.set(domain, { valid: false, reason, timestamp: Date.now() })
      return { valid: false, reason }
    }
  }

  domainCache.set(domain, { valid: false, reason: 'NO_MX_RECORD', timestamp: Date.now() })
  return { valid: false, reason: 'NO_MX_RECORD' }
}

function isValidEmailFormat(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { emails } = body

    if (!Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json({ success: false, error: 'No emails provided' }, { status: 400 })
    }

    // Limit batch size
    const batch = emails.slice(0, 500)
    const results: ValidationResult[] = []

    // Group by domain to reduce DNS lookups
    const domainMap = new Map<string, string[]>()
    const formatInvalid: ValidationResult[] = []

    for (const email of batch) {
      const normalized = (email || '').trim().toLowerCase()
      if (!isValidEmailFormat(normalized)) {
        formatInvalid.push({ email: normalized, valid: false, reason: 'INVALID_FORMAT' })
        continue
      }
      const domain = normalized.split('@')[1]
      if (!domainMap.has(domain)) {
        domainMap.set(domain, [])
      }
      domainMap.get(domain)!.push(normalized)
    }

    // Validate all unique domains concurrently (max 10 at a time)
    const domains = Array.from(domainMap.keys())
    const domainResults = new Map<string, { valid: boolean; reason?: string }>()

    const CONCURRENCY = 10
    for (let i = 0; i < domains.length; i += CONCURRENCY) {
      const chunk = domains.slice(i, i + CONCURRENCY)
      const chunkResults = await Promise.all(
        chunk.map(async (domain) => {
          const result = await validateDomain(domain)
          return { domain, ...result }
        })
      )
      for (const r of chunkResults) {
        domainResults.set(r.domain, { valid: r.valid, reason: r.reason })
      }
    }

    // Build results
    for (const [domain, emails] of domainMap) {
      const domainResult = domainResults.get(domain)!
      for (const email of emails) {
        results.push({
          email,
          valid: domainResult.valid,
          reason: domainResult.reason,
        })
      }
    }

    // Add format-invalid emails
    results.push(...formatInvalid)

    const validCount = results.filter(r => r.valid).length
    const invalidCount = results.filter(r => !r.valid).length
    const invalidDomains = Array.from(domainResults.entries())
      .filter(([_, r]) => !r.valid)
      .map(([domain, r]) => ({ domain, reason: r.reason }))

    return NextResponse.json({
      success: true,
      total: results.length,
      valid: validCount,
      invalid: invalidCount,
      invalidDomains,
      results,
    })
  } catch (error: any) {
    console.error('[email-validate] error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
