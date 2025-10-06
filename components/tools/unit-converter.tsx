"use client"

import React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calculator, ArrowRightLeft, Ruler, Weight, Thermometer, Droplets } from "lucide-react"

interface Unit {
  name: string
  symbol: string
  toBase: number // multiplier to convert to base unit
  fromBase: number // multiplier to convert from base unit
}

interface UnitCategory {
  name: string
  icon: React.ComponentType<{ className?: string }>
  baseUnit: string
  units: Unit[]
}

const unitCategories: UnitCategory[] = [
  {
    name: "Length",
    icon: Ruler,
    baseUnit: "meter",
    units: [
      { name: "Millimeter", symbol: "mm", toBase: 0.001, fromBase: 1000 },
      { name: "Centimeter", symbol: "cm", toBase: 0.01, fromBase: 100 },
      { name: "Meter", symbol: "m", toBase: 1, fromBase: 1 },
      { name: "Kilometer", symbol: "km", toBase: 1000, fromBase: 0.001 },
      { name: "Inch", symbol: "in", toBase: 0.0254, fromBase: 39.3701 },
      { name: "Foot", symbol: "ft", toBase: 0.3048, fromBase: 3.28084 },
      { name: "Yard", symbol: "yd", toBase: 0.9144, fromBase: 1.09361 },
      { name: "Mile", symbol: "mi", toBase: 1609.34, fromBase: 0.000621371 },
    ],
  },
  {
    name: "Weight",
    icon: Weight,
    baseUnit: "kilogram",
    units: [
      { name: "Milligram", symbol: "mg", toBase: 0.000001, fromBase: 1000000 },
      { name: "Gram", symbol: "g", toBase: 0.001, fromBase: 1000 },
      { name: "Kilogram", symbol: "kg", toBase: 1, fromBase: 1 },
      { name: "Pound", symbol: "lb", toBase: 0.453592, fromBase: 2.20462 },
      { name: "Ounce", symbol: "oz", toBase: 0.0283495, fromBase: 35.274 },
      { name: "Stone", symbol: "st", toBase: 6.35029, fromBase: 0.157473 },
      { name: "Ton (Metric)", symbol: "t", toBase: 1000, fromBase: 0.001 },
      { name: "Ton (US)", symbol: "ton", toBase: 907.185, fromBase: 0.00110231 },
    ],
  },
  {
    name: "Temperature",
    icon: Thermometer,
    baseUnit: "celsius",
    units: [
      { name: "Celsius", symbol: "°C", toBase: 1, fromBase: 1 },
      { name: "Fahrenheit", symbol: "°F", toBase: 1, fromBase: 1 },
      { name: "Kelvin", symbol: "K", toBase: 1, fromBase: 1 },
      { name: "Rankine", symbol: "°R", toBase: 1, fromBase: 1 },
    ],
  },
  {
    name: "Volume",
    icon: Droplets,
    baseUnit: "liter",
    units: [
      { name: "Milliliter", symbol: "ml", toBase: 0.001, fromBase: 1000 },
      { name: "Liter", symbol: "l", toBase: 1, fromBase: 1 },
      { name: "Gallon (US)", symbol: "gal", toBase: 3.78541, fromBase: 0.264172 },
      { name: "Gallon (UK)", symbol: "gal", toBase: 4.54609, fromBase: 0.219969 },
      { name: "Quart (US)", symbol: "qt", toBase: 0.946353, fromBase: 1.05669 },
      { name: "Pint (US)", symbol: "pt", toBase: 0.473176, fromBase: 2.11338 },
      { name: "Cup (US)", symbol: "cup", toBase: 0.236588, fromBase: 4.22675 },
      { name: "Fluid Ounce (US)", symbol: "fl oz", toBase: 0.0295735, fromBase: 33.814 },
    ],
  },
]

export function UnitConverter() {
  const [selectedCategory, setSelectedCategory] = useState("Length")
  const [fromUnit, setFromUnit] = useState("Meter")
  const [toUnit, setToUnit] = useState("Foot")
  const [inputValue, setInputValue] = useState("1")
  const [result, setResult] = useState<number | null>(null)

  const currentCategory = unitCategories.find((cat) => cat.name === selectedCategory)!
  const fromUnitData = currentCategory.units.find((unit) => unit.name === fromUnit)!
  const toUnitData = currentCategory.units.find((unit) => unit.name === toUnit)!

  const convertValue = (value: number, from: Unit, to: Unit, category: string): number => {
    if (category === "Temperature") {
      return convertTemperature(value, from.name, to.name)
    }

    // Convert to base unit, then to target unit
    const baseValue = value * from.toBase
    return baseValue * to.fromBase
  }

  const convertTemperature = (value: number, from: string, to: string): number => {
    // Convert to Celsius first
    let celsius = value
    if (from === "Fahrenheit") {
      celsius = ((value - 32) * 5) / 9
    } else if (from === "Kelvin") {
      celsius = value - 273.15
    } else if (from === "Rankine") {
      celsius = ((value - 491.67) * 5) / 9
    }

    // Convert from Celsius to target
    if (to === "Fahrenheit") {
      return (celsius * 9) / 5 + 32
    } else if (to === "Kelvin") {
      return celsius + 273.15
    } else if (to === "Rankine") {
      return (celsius * 9) / 5 + 491.67
    }

    return celsius
  }

  const handleConvert = () => {
    const value = Number.parseFloat(inputValue)
    if (isNaN(value)) {
      setResult(null)
      return
    }

    const converted = convertValue(value, fromUnitData, toUnitData, selectedCategory)
    setResult(converted)
  }

  const swapUnits = () => {
    setFromUnit(toUnit)
    setToUnit(fromUnit)
    if (result !== null) {
      setInputValue(result.toString())
      setResult(Number.parseFloat(inputValue))
    }
  }

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category)
    const newCategory = unitCategories.find((cat) => cat.name === category)!
    setFromUnit(newCategory.units[0].name)
    setToUnit(newCategory.units[1].name)
    setResult(null)
  }

  // Auto-convert when inputs change
  React.useEffect(() => {
    handleConvert()
  }, [inputValue, fromUnit, toUnit, selectedCategory])

  const formatResult = (value: number): string => {
    if (Math.abs(value) >= 1000000) {
      return value.toExponential(6)
    } else if (Math.abs(value) < 0.001 && value !== 0) {
      return value.toExponential(6)
    } else {
      return value.toFixed(8).replace(/\.?0+$/, "")
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-[color:var(--productivity)]" />
            Unit Converter
          </CardTitle>
          <CardDescription>Convert between different units of measurement</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedCategory} onValueChange={handleCategoryChange}>
            <TabsList className="grid w-full grid-cols-4">
              {unitCategories.map((category) => {
                const Icon = category.icon
                return (
                  <TabsTrigger key={category.name} value={category.name} className="gap-2">
                    <Icon className="w-4 h-4" />
                    {category.name}
                  </TabsTrigger>
                )
              })}
            </TabsList>

            {unitCategories.map((category) => (
              <TabsContent key={category.name} value={category.name} className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Input Section */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="input-value">Value</Label>
                      <Input
                        id="input-value"
                        type="number"
                        placeholder="Enter value"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        className="text-lg"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>From</Label>
                      <Select value={fromUnit} onValueChange={setFromUnit}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {category.units.map((unit) => (
                            <SelectItem key={unit.name} value={unit.name}>
                              {unit.name} ({unit.symbol})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex justify-center">
                      <Button variant="outline" size="sm" onClick={swapUnits} className="gap-2 bg-transparent">
                        <ArrowRightLeft className="w-4 h-4" />
                        Swap
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <Label>To</Label>
                      <Select value={toUnit} onValueChange={setToUnit}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {category.units.map((unit) => (
                            <SelectItem key={unit.name} value={unit.name}>
                              {unit.name} ({unit.symbol})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Result Section */}
                  <div className="space-y-4">
                    <div className="p-6 bg-muted/50 rounded-lg text-center">
                      <div className="text-sm text-muted-foreground mb-2">Result</div>
                      <div className="text-3xl font-bold text-[color:var(--productivity)]">
                        {result !== null ? formatResult(result) : "---"}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">{toUnitData.symbol}</div>
                    </div>

                    <div className="p-4 bg-muted/30 rounded-lg">
                      <div className="text-sm font-medium mb-2">Conversion Formula</div>
                      <div className="text-xs text-muted-foreground">
                        {inputValue || "1"} {fromUnitData.symbol} = {result !== null ? formatResult(result) : "---"}{" "}
                        {toUnitData.symbol}
                      </div>
                    </div>

                    {/* Quick conversions */}
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Quick Conversions</div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {[1, 10, 100, 1000].map((value) => {
                          const quickResult = convertValue(value, fromUnitData, toUnitData, selectedCategory)
                          return (
                            <div key={value} className="p-2 bg-muted/20 rounded text-center">
                              <div>
                                {value} {fromUnitData.symbol}
                              </div>
                              <div className="text-[color:var(--productivity)]">
                                {formatResult(quickResult)} {toUnitData.symbol}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
