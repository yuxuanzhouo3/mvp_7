"use client"

import type React from "react"
import { ImageIcon } from "lucide-react"
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Progress } from "@/components/ui/progress"
import {
  Calendar,
  Clock,
  Share2,
  BarChart3,
  CheckCircle,
  Eye,
  Twitter,
  Linkedin,
  Facebook,
  Instagram,
  Trash2,
} from "lucide-react"

interface SocialPost {
  id: string
  content: string
  platforms: string[]
  scheduledTime?: string
  status: "draft" | "scheduled" | "posted"
  media?: string[]
}

interface Platform {
  id: string
  name: string
  icon: React.ComponentType<{ className?: string }>
  connected: boolean
  color: string
}

export function SocialAutoPoster() {
  const [posts, setPosts] = useState<SocialPost[]>([])
  const [currentPost, setCurrentPost] = useState<SocialPost>({
    id: "",
    content: "",
    platforms: [],
    status: "draft",
  })
  const [isScheduled, setIsScheduled] = useState(false)
  const [scheduleDate, setScheduleDate] = useState("")
  const [scheduleTime, setScheduleTime] = useState("")
  const [isPosting, setIsPosting] = useState(false)
  const [postProgress, setPostProgress] = useState(0)

  const platforms: Platform[] = [
    { id: "twitter", name: "Twitter", icon: Twitter, connected: true, color: "text-blue-500" },
    { id: "linkedin", name: "LinkedIn", icon: Linkedin, connected: true, color: "text-blue-600" },
    { id: "facebook", name: "Facebook", icon: Facebook, connected: false, color: "text-blue-700" },
    { id: "instagram", name: "Instagram", icon: Instagram, connected: false, color: "text-pink-500" },
  ]

  const connectedPlatforms = platforms.filter((p) => p.connected)

  const handlePlatformToggle = (platformId: string) => {
    setCurrentPost((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(platformId)
        ? prev.platforms.filter((p) => p !== platformId)
        : [...prev.platforms, platformId],
    }))
  }

  const handleSavePost = () => {
    const newPost: SocialPost = {
      ...currentPost,
      id: Date.now().toString(),
      scheduledTime: isScheduled ? `${scheduleDate} ${scheduleTime}` : undefined,
      status: isScheduled ? "scheduled" : "draft",
    }
    setPosts((prev) => [...prev, newPost])
    setCurrentPost({ id: "", content: "", platforms: [], status: "draft" })
    setIsScheduled(false)
    setScheduleDate("")
    setScheduleTime("")
  }

  const handlePostNow = async () => {
    setIsPosting(true)
    setPostProgress(0)

    // Mock posting process
    for (let i = 0; i <= 100; i += 20) {
      await new Promise((resolve) => setTimeout(resolve, 500))
      setPostProgress(i)
    }

    setIsPosting(false)
    setPostProgress(0)
    handleSavePost()
  }

  const deletePost = (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId))
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-[color:var(--social-media)]">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Share2 className="w-5 h-5 text-[color:var(--social-media)]" />
              <CardTitle className="text-lg">Platforms</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{connectedPlatforms.length}</div>
            <p className="text-sm text-muted-foreground">Connected</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-500" />
              <CardTitle className="text-lg">Scheduled</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{posts.filter((p) => p.status === "scheduled").length}</div>
            <p className="text-sm text-muted-foreground">Posts queued</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <CardTitle className="text-lg">Posted</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{posts.filter((p) => p.status === "posted").length}</div>
            <p className="text-sm text-muted-foreground">Successfully sent</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-500" />
              <CardTitle className="text-lg">Engagement</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2.4K</div>
            <p className="text-sm text-muted-foreground">Total interactions</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="compose" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="compose">Compose</TabsTrigger>
          <TabsTrigger value="platforms">Platforms</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="compose" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Share2 className="w-5 h-5" />
                Create Post
              </CardTitle>
              <CardDescription>Compose your social media post</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="post-content">Post Content</Label>
                <Textarea
                  id="post-content"
                  value={currentPost.content}
                  onChange={(e) => setCurrentPost((prev) => ({ ...prev, content: e.target.value }))}
                  placeholder="What's on your mind?"
                  rows={6}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Character count: {currentPost.content.length}</span>
                  <span>Twitter limit: 280 characters</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Select Platforms</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {connectedPlatforms.map((platform) => {
                    const Icon = platform.icon
                    const isSelected = currentPost.platforms.includes(platform.id)

                    return (
                      <Button
                        key={platform.id}
                        variant={isSelected ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePlatformToggle(platform.id)}
                        className="justify-start gap-2"
                      >
                        <Icon className={`w-4 h-4 ${platform.color}`} />
                        {platform.name}
                      </Button>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Media (Optional)</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                  <ImageIcon className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Drag & drop images or click to browse</p>
                  <Input type="file" accept="image/*" multiple className="mt-2 max-w-xs mx-auto" />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch checked={isScheduled} onCheckedChange={setIsScheduled} />
                  <Label>Schedule for later</Label>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleSavePost} disabled={!currentPost.content}>
                    Save Draft
                  </Button>
                  <Button onClick={handlePostNow} disabled={!currentPost.content || currentPost.platforms.length === 0}>
                    {isPosting ? "Posting..." : "Post Now"}
                  </Button>
                </div>
              </div>

              {isScheduled && (
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                  <div className="space-y-2">
                    <Label htmlFor="schedule-date">Date</Label>
                    <Input
                      id="schedule-date"
                      type="date"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="schedule-time">Time</Label>
                    <Input
                      id="schedule-time"
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {isPosting && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Posting Progress</Label>
                    <span className="text-sm text-muted-foreground">{postProgress}%</span>
                  </div>
                  <Progress value={postProgress} className="w-full" />
                </div>
              )}
            </CardContent>
          </Card>

          {posts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recent Posts</CardTitle>
                <CardDescription>Your latest social media posts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-64 overflow-y-auto">
                  {posts.slice(-5).map((post) => (
                    <div key={post.id} className="flex items-start justify-between p-3 bg-muted rounded-lg">
                      <div className="flex-1">
                        <p className="text-sm line-clamp-2">{post.content}</p>
                        <div className="flex items-center gap-2 mt-2">
                          {post.platforms.map((platformId) => {
                            const platform = platforms.find((p) => p.id === platformId)
                            if (!platform) return null
                            const Icon = platform.icon
                            return <Icon key={platformId} className={`w-4 h-4 ${platform.color}`} />
                          })}
                          <Badge variant={post.status === "posted" ? "default" : "secondary"} className="text-xs">
                            {post.status}
                          </Badge>
                          {post.scheduledTime && (
                            <span className="text-xs text-muted-foreground">{post.scheduledTime}</span>
                          )}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => deletePost(post.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="platforms" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Platform Connections</CardTitle>
              <CardDescription>Manage your social media platform connections</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {platforms.map((platform) => {
                  const Icon = platform.icon

                  return (
                    <Card key={platform.id} className={platform.connected ? "ring-2 ring-green-500" : ""}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Icon className={`w-8 h-8 ${platform.color}`} />
                            <div>
                              <CardTitle className="text-base">{platform.name}</CardTitle>
                              <CardDescription>{platform.connected ? "Connected" : "Not connected"}</CardDescription>
                            </div>
                          </div>
                          <Badge variant={platform.connected ? "default" : "secondary"}>
                            {platform.connected ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <Button variant={platform.connected ? "outline" : "default"} size="sm" className="w-full">
                          {platform.connected ? "Disconnect" : "Connect"}
                        </Button>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Scheduled Posts
              </CardTitle>
              <CardDescription>Manage your scheduled social media posts</CardDescription>
            </CardHeader>
            <CardContent>
              {posts.filter((p) => p.status === "scheduled").length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No scheduled posts</h3>
                  <p className="text-muted-foreground">Create a post and schedule it for later</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {posts
                    .filter((p) => p.status === "scheduled")
                    .map((post) => (
                      <div key={post.id} className="flex items-start justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <p className="text-sm line-clamp-2 mb-2">{post.content}</p>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">{post.scheduledTime}</span>
                            {post.platforms.map((platformId) => {
                              const platform = platforms.find((p) => p.id === platformId)
                              if (!platform) return null
                              const Icon = platform.icon
                              return <Icon key={platformId} className={`w-4 h-4 ${platform.color}`} />
                            })}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => deletePost(post.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Analytics Overview
              </CardTitle>
              <CardDescription>Track your social media performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-blue-500">1.2K</div>
                  <p className="text-sm text-muted-foreground">Total Likes</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-green-500">856</div>
                  <p className="text-sm text-muted-foreground">Shares</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-purple-500">342</div>
                  <p className="text-sm text-muted-foreground">Comments</p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Platform Performance</h3>
                {connectedPlatforms.map((platform) => {
                  const Icon = platform.icon
                  const engagement = Math.floor(Math.random() * 1000) + 100

                  return (
                    <div key={platform.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Icon className={`w-6 h-6 ${platform.color}`} />
                        <div>
                          <p className="font-medium">{platform.name}</p>
                          <p className="text-sm text-muted-foreground">{engagement} total engagements</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">+{Math.floor(Math.random() * 20) + 5}%</p>
                        <p className="text-xs text-muted-foreground">vs last week</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
