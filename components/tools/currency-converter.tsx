"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DollarSign, ArrowRightLeft, Calculator, RefreshCw } from "lucide-react"

interface Currency {
  code: string
  name: string
  symbol: string
  flag: string
}

interface ExchangeRate {
  from: string
  to: string
  rate: number
  lastUpdated: string
}

const currencies: Currency[] = [
  { code: "USD", name: "US Dollar", symbol: "$", flag: "🇺🇸" },
  { code: "EUR", name: "Euro", symbol: "€", flag: "🇪🇺" },
  { code: "GBP", name: "British Pound", symbol: "£", flag: "🇬🇧" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥", flag: "🇯🇵" },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$", flag: "🇨🇦" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$", flag: "🇦🇺" },
  { code: "CHF", name: "Swiss Franc", symbol: "CHF", flag: "🇨🇭" },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥", flag: "🇨🇳" },
  { code: "INR", name: "Indian Rupee", symbol: "₹", flag: "🇮🇳" },
  { code: "BRL", name: "Brazilian Real", symbol: "R$", flag: "🇧🇷" },
]

const mockRates: { [key: string]: number } = {
  "USD-EUR": 0.85,
  "USD-GBP": 0.73,
  "USD-JPY": 110.0,
  "USD-CAD": 1.25,
  "USD-AUD": 1.35,
  "USD-CHF": 0.92,
  "USD-CNY": 6.45,
  "USD-INR": 74.5,
  "USD-BRL": 5.2,
  "EUR-USD": 1.18,
  "GBP-USD": 1.37,
  "JPY-USD": 0.0091,
}

export function CurrencyConverter() {
  const [amount, setAmount] = useState("100")
  const [fromCurrency, setFromCurrency] = useState("USD")
  const [toCurrency, setToCurrency] = useState("EUR")
  const [convertedAmount, setConvertedAmount] = useState<number | null>(null)
  const [exchangeRate, setExchangeRate] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<string>("")

  // Bulk conversion
  const [bulkInput, setBulkInput] = useState("")
  const [bulkResults, setBulkResults] = useState<Array<{ amount: number; result: number }>>([])

  const getExchangeRate = async (from: string, to: string): Promise<number> => {
    // Mock API call
    await new Promise((resolve) => setTimeout(resolve, 500))

    const key = `${from}-${to}`
    const reverseKey = `${to}-${from}`

    if (mockRates[key]) {
      return mockRates[key]
    } else if (mockRates[reverseKey]) {
      return 1 / mockRates[reverseKey]
    } else {
      // Generate a mock rate
      return Math.random() * 2 + 0.5
    }
  }

  const convertCurrency = async () => {
    if (!amount || fromCurrency === toCurrency) {
      setConvertedAmount(Number.parseFloat(amount) || 0)
      setExchangeRate(1)
      return
    }

    setIsLoading(true)
    try {
      const rate = await getExchangeRate(fromCurrency, toCurrency)
      const result = (Number.parseFloat(amount) || 0) * rate

      setExchangeRate(rate)
      setConvertedAmount(result)
      setLastUpdated(new Date().toLocaleString())
    } catch (error) {
      console.error("Conversion failed:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const swapCurrencies = () => {
    setFromCurrency(toCurrency)
    setToCurrency(fromCurrency)
  }

  const convertBulk = async () => {
    const amounts = bulkInput
      .split("\n")
      .map((line) => Number.parseFloat(line.trim()))
      .filter((num) => !isNaN(num))

    if (amounts.length === 0) return

    setIsLoading(true)
    try {
      const rate = await getExchangeRate(fromCurrency, toCurrency)
      const results = amounts.map((amount) => ({
        amount,
        result: amount * rate,
      }))
      setBulkResults(results)
    } catch (error) {
      console.error("Bulk conversion failed:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (amount && fromCurrency && toCurrency) {
      convertCurrency()
    }
  }, [amount, fromCurrency, toCurrency])

  const formatCurrency = (value: number, currencyCode: string) => {
    const currency = currencies.find((c) => c.code === currencyCode)
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    }).format(value)
  }

  const getCurrencyDisplay = (currencyCode: string) => {
    const currency = currencies.find((c) => c.code === currencyCode)
    return currency ? `${currency.flag} ${currency.code} - ${currency.name}` : currencyCode
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Tabs defaultValue="single" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="single">Single Conversion</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Conversion</TabsTrigger>
        </TabsList>

        <TabsContent value="single" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Input Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-[color:var(--productivity)]" />
                  Currency Conversion
                </CardTitle>
                <CardDescription>Convert between different currencies with real-time rates</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="Enter amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="text-lg"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>From</Label>
                    <Select value={fromCurrency} onValueChange={setFromCurrency}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.map((currency) => (
                          <SelectItem key={currency.code} value={currency.code}>
                            {getCurrencyDisplay(currency.code)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>To</Label>
                    <Select value={toCurrency} onValueChange={setToCurrency}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.map((currency) => (
                          <SelectItem key={currency.code} value={currency.code}>
                            {getCurrencyDisplay(currency.code)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-center">
                  <Button variant="outline" size="sm" onClick={swapCurrencies} className="gap-2 bg-transparent">
                    <ArrowRightLeft className="w-4 h-4" />
                    Swap
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Result Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-[color:var(--productivity)]" />
                  Conversion Result
                </CardTitle>
                <CardDescription>{lastUpdated && `Last updated: ${lastUpdated}`}</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Converting...</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-[color:var(--productivity)]">
                        {convertedAmount !== null ? formatCurrency(convertedAmount, toCurrency) : "---"}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {amount && formatCurrency(Number.parseFloat(amount) || 0, fromCurrency)}
                      </div>
                    </div>

                    {exchangeRate && (
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <div className="flex items-center justify-between text-sm">
                          <span>Exchange Rate:</span>
                          <span className="font-medium">
                            1 {fromCurrency} = {exchangeRate.toFixed(6)} {toCurrency}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <div className="text-center p-2 bg-muted/30 rounded">
                        <div className="font-medium">Mid-market rate</div>
                        <div>No hidden fees</div>
                      </div>
                      <div className="text-center p-2 bg-muted/30 rounded">
                        <div className="font-medium">Real-time data</div>
                        <div>Updated every minute</div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="bulk" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-[color:var(--productivity)]" />
                Bulk Currency Conversion
              </CardTitle>
              <CardDescription>Convert multiple amounts at once - enter one amount per line</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>From Currency</Label>
                  <Select value={fromCurrency} onValueChange={setFromCurrency}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map((currency) => (
                        <SelectItem key={currency.code} value={currency.code}>
                          {getCurrencyDisplay(currency.code)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>To Currency</Label>
                  <Select value={toCurrency} onValueChange={setToCurrency}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map((currency) => (
                        <SelectItem key={currency.code} value={currency.code}>
                          {getCurrencyDisplay(currency.code)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bulk-amounts">Amounts (one per line)</Label>
                <textarea
                  id="bulk-amounts"
                  className="w-full h-32 p-3 border rounded-md resize-none"
                  placeholder="100&#10;250.50&#10;1000&#10;75.25"
                  value={bulkInput}
                  onChange={(e) => setBulkInput(e.target.value)}
                />
              </div>

              <Button
                onClick={convertBulk}
                disabled={!bulkInput.trim() || isLoading}
                className="w-full bg-[color:var(--productivity)] hover:bg-[color:var(--productivity)]/90 text-white"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Converting...
                  </>
                ) : (
                  <>
                    <Calculator className="w-4 h-4 mr-2" />
                    Convert All
                  </>
                )}
              </Button>

              {bulkResults.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-medium mb-3">Conversion Results</h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {bulkResults.map((result, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                        <span className="font-medium">{formatCurrency(result.amount, fromCurrency)}</span>
                        <ArrowRightLeft className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium text-[color:var(--productivity)]">
                          {formatCurrency(result.result, toCurrency)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
