"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Hash } from "lucide-react"

export function TextUtilities() {
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
            Text Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-[color:var(--productivity)]">{stats.characters}</div>
              <div className="text-sm text-muted-foreground">Characters</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[color:var(--productivity)]">{stats.charactersNoSpaces}</div>
              <div className="text-sm text-muted-foreground">No Spaces</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[color:var(--productivity)]">{stats.words}</div>
              <div className="text-sm text-mute\
