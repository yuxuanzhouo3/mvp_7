import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const templates = [
    {
      id: "job-application",
      name: "Job Application",
      subject: "Application for {position} at {company}",
      content: `Dear Hiring Manager,

I am writing to express my interest in the {position} position at {company}. With my background in software development and passion for innovation, I believe I would be a valuable addition to your team.

I have attached my resume for your review and would welcome the opportunity to discuss how my skills and experience align with your needs.

Thank you for your consideration.

Best regards,
{name}`
    },
    {
      id: "follow-up",
      name: "Follow-up",
      subject: "Following up on my application for {position}",
      content: `Dear {name},

I hope this email finds you well. I wanted to follow up on my application for the {position} position at {company} that I submitted last week.

I remain very interested in this opportunity and would be happy to provide any additional information you might need.

Thank you for your time and consideration.

Best regards,
{name}`
    },
    {
      id: "networking",
      name: "Networking",
      subject: "Connecting with a fellow professional",
      content: `Hi {name},

I hope you're doing well. I came across your profile and was impressed by your work at {company}. I'm currently exploring opportunities in the industry and would love to connect.

Would you be open to a brief chat about your experience and any insights you might have about the field?

Thank you for your time.

Best regards,
{name}`
    }
  ]

  return NextResponse.json(templates)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  
  return NextResponse.json({ success: true, template: body })
}
