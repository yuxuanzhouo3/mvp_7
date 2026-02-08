"use client"

import { useState } from "react"
import { useLanguage } from "@/components/language-provider"
import { t } from "@/lib/i18n"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Hash, Copy, Download, Trash2 } from "lucide-react"

export function TextUtilities() {
  const { language } = useLanguage()
  const tr = (key: string) => t(language, `textUtilitiesTool.${key}`)
  
  const [inputText, setInputText] = useState('')
  const [processedText, setProcessedText] = useState('')

  // Text statistics
  const getTextStats = (text: string) => {
    const characters = text.length
    const charactersNoSpaces = text.replace(/\s/g, '').length
    const words = text.trim() ? text.trim().split(/\s+/).length : 0
    const sentences = text.trim() ? text.split(/[.!?]+/).filter(s => s.trim().length > 0).length : 0
    const paragraphs = text.trim() ? text.split(/\n\s*\n/).filter(p => p.trim().length > 0).length : 0
    const lines = text.split('\n').length

    return {
      characters,
      charactersNoSpaces,
      words,
      sentences,
      paragraphs,
      lines
    }
  }

  // Case conversion functions
  const convertToUpperCase = () => setProcessedText(inputText.toUpperCase())
  const convertToLowerCase = () => setProcessedText(inputText.toLowerCase())
  const convertToTitleCase = () => {
    const result = inputText.replace(/\w\S*/g, (txt) => 
      txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    )
    setProcessedText(result)
  }
  const convertToSentenceCase = () => {
    const result = inputText.toLowerCase().replace(/(^\s*\w|[.!?]\s*\w)/g, (c) => c.toUpperCase())
    setProcessedText(result)
  }
  const convertToCamelCase = () => {
    const result = inputText
      .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => 
        index === 0 ? word.toLowerCase() : word.toUpperCase()
      )
      .replace(/\s+/g, '')
    setProcessedText(result)
  }
  const convertToPascalCase = () => {
    const result = inputText
      .replace(/(?:^\w|[A-Z]|\b\w)/g, (word) => word.toUpperCase())
      .replace(/\s+/g, '')
    setProcessedText(result)
  }
  const convertToSnakeCase = () => {
    const result = inputText
      .replace(/\W+/g, ' ')
      .split(/ |\B(?=[A-Z])/)
      .map(word => word.toLowerCase())
      .join('_')
    setProcessedText(result)
  }
  const convertToKebabCase = () => {
    const result = inputText
      .replace(/\W+/g, ' ')
      .split(/ |\B(?=[A-Z])/)
      .map(word => word.toLowerCase())
      .join('-')
    setProcessedText(result)
  }

  // Text formatting functions
  const removeDuplicateLines = () => {
    const lines = inputText.split('\n')
    const uniqueLines = [...new Set(lines)]
    setProcessedText(uniqueLines.join('\n'))
  }

  const removeEmptyLines = () => {
    const lines = inputText.split('\n').filter(line => line.trim() !== '')
    setProcessedText(lines.join('\n'))
  }

  const sortLines = (ascending = true) => {
    const lines = inputText.split('\n')
    const sorted = lines.sort((a, b) => 
      ascending ? a.localeCompare(b) : b.localeCompare(a)
    )
    setProcessedText(sorted.join('\n'))
  }

  const reverseLines = () => {
    const lines = inputText.split('\n').reverse()
    setProcessedText(lines.join('\n'))
  }

  const addLineNumbers = () => {
    const lines = inputText.split('\n')
    const numbered = lines.map((line, index) => `${index + 1}. ${line}`)
    setProcessedText(numbered.join('\n'))
  }

  const trimWhitespace = () => {
    const lines = inputText.split('\n').map(line => line.trim())
    setProcessedText(lines.join('\n'))
  }

  // Utility functions
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }

  const downloadAsFile = (text: string, filename: string) => {
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  }

  const clearAll = () => {
    setInputText('')
    setProcessedText('')
  }

  const stats = getTextStats(inputText)

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Text Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hash className="w-5 h-5 text-[color:var(--productivity)]" />
            {tr("textStatistics")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-[color:var(--productivity)]">{stats.characters}</div>
              <div className="text-sm text-muted-foreground">{tr("characters")}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[color:var(--productivity)]">{stats.charactersNoSpaces}</div>
              <div className="text-sm text-muted-foreground">{tr("charactersNoSpaces")}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[color:var(--productivity)]">{stats.words}</div>
              <div className="text-sm text-muted-foreground">{tr("words")}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[color:var(--productivity)]">{stats.sentences}</div>
              <div className="text-sm text-muted-foreground">{tr("sentences")}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[color:var(--productivity)]">{stats.paragraphs}</div>
              <div className="text-sm text-muted-foreground">{tr("paragraphs")}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[color:var(--productivity)]">{stats.lines}</div>
              <div className="text-sm text-muted-foreground">{tr("lines")}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Input Text */}
      <Card>
        <CardHeader>
          <CardTitle>{tr("inputText")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder={tr("enterText")}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="min-h-[200px] font-mono"
          />
          <div className="flex gap-2">
            <Button onClick={clearAll} variant="outline" size="sm">
              <Trash2 className="w-4 h-4 mr-2" />
              {tr("clearAll")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Case Conversion */}
      <Card>
        <CardHeader>
          <CardTitle>{tr("caseConversion")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Button onClick={convertToUpperCase} variant="outline" size="sm">{tr("uppercase")}</Button>
            <Button onClick={convertToLowerCase} variant="outline" size="sm">{tr("lowercase")}</Button>
            <Button onClick={convertToTitleCase} variant="outline" size="sm">{tr("titleCase")}</Button>
            <Button onClick={convertToSentenceCase} variant="outline" size="sm">{tr("sentenceCase")}</Button>
            <Button onClick={convertToCamelCase} variant="outline" size="sm">{tr("camelCase")}</Button>
            <Button onClick={convertToPascalCase} variant="outline" size="sm">{tr("pascalCase")}</Button>
            <Button onClick={convertToSnakeCase} variant="outline" size="sm">{tr("snakeCase")}</Button>
            <Button onClick={convertToKebabCase} variant="outline" size="sm">{tr("kebabCase")}</Button>
          </div>
        </CardContent>
      </Card>

      {/* Text Formatting */}
      <Card>
        <CardHeader>
          <CardTitle>{tr("textFormatting")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            <Button onClick={removeDuplicateLines} variant="outline" size="sm">{tr("removeDuplicateLines")}</Button>
            <Button onClick={removeEmptyLines} variant="outline" size="sm">{tr("removeEmptyLines")}</Button>
            <Button onClick={() => sortLines(true)} variant="outline" size="sm">{tr("sortLinesAscending")}</Button>
            <Button onClick={() => sortLines(false)} variant="outline" size="sm">{tr("sortLinesDescending")}</Button>
            <Button onClick={reverseLines} variant="outline" size="sm">{tr("reverseLines")}</Button>
            <Button onClick={addLineNumbers} variant="outline" size="sm">{tr("addLineNumbers")}</Button>
            <Button onClick={trimWhitespace} variant="outline" size="sm">{tr("trimWhitespace")}</Button>
          </div>
        </CardContent>
      </Card>

      {/* Output Text */}
      {processedText && (
        <Card>
          <CardHeader>
            <CardTitle>{tr("processedText")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={processedText}
              readOnly
              className="min-h-[200px] font-mono"
            />
            <div className="flex gap-2">
              <Button onClick={() => copyToClipboard(processedText)} variant="outline" size="sm">
                <Copy className="w-4 h-4 mr-2" />
                {tr("copy")}
              </Button>
              <Button onClick={() => downloadAsFile(processedText, 'processed-text.txt')} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                {tr("download")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
