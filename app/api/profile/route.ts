import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

const buildProfileData = (
  profile: Record<string, unknown>,
  existing?: {
    personName: string | null
    dateOfBirth: string | null
    weekStartDay?: number
    recentYears?: string
    goalsSectionTitle?: string
    productivityViewMode?: string
    productivityScaleMode?: string
    showLegend?: boolean
    scoreLabels?: string
    scoreDisplayMode?: string
    weeklyGoalsTemplate?: string
    dayOffAllowance?: number
    workDays?: string
    autoMarkWeekendsOff?: boolean
    theme?: string
  } | null
) => ({
  personName: profile.personName !== undefined ? String(profile.personName || '') || null : existing?.personName ?? null,
  dateOfBirth: profile.dateOfBirth !== undefined ? String(profile.dateOfBirth || '') || null : existing?.dateOfBirth ?? null,
  weekStartDay: Number(profile.weekStartDay ?? existing?.weekStartDay ?? 0),
  recentYears: String(profile.recentYears ?? existing?.recentYears ?? '10'),
  goalsSectionTitle: String(profile.goalsSectionTitle ?? existing?.goalsSectionTitle ?? '2026 GOALS'),
  productivityViewMode: String(profile.productivityViewMode ?? existing?.productivityViewMode ?? 'day'),
  productivityScaleMode: String(profile.productivityScaleMode ?? existing?.productivityScaleMode ?? '3'),
  showLegend: profile.showLegend !== undefined ? Boolean(profile.showLegend) : existing?.showLegend ?? true,
  scoreLabels: String(profile.scoreLabels ?? existing?.scoreLabels ?? '["Low","Partial","Good","Excellent"]'),
  scoreDisplayMode: String(profile.scoreDisplayMode ?? existing?.scoreDisplayMode ?? 'percentage'),
  weeklyGoalsTemplate: String(profile.weeklyGoalsTemplate ?? existing?.weeklyGoalsTemplate ?? ''),
  dayOffAllowance: Number(profile.dayOffAllowance ?? existing?.dayOffAllowance ?? 15),
  workDays: String(profile.workDays ?? existing?.workDays ?? '0,1,2,3,4,5,6'),
  autoMarkWeekendsOff:
    profile.autoMarkWeekendsOff !== undefined
      ? Boolean(profile.autoMarkWeekendsOff)
      : existing?.autoMarkWeekendsOff ?? false,
  theme: String(profile.theme ?? existing?.theme ?? 'light'),
})

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        profile: true
      }
    })

    return NextResponse.json({ profile: user?.profile || null })
  } catch (error) {
    console.error('Error fetching profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        profile: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body = await request.json()
    const profile =
      body?.profile && typeof body.profile === 'object'
        ? (body.profile as Record<string, unknown>)
        : {}

    let updatedProfile

    if (user.profile) {
      // Update existing profile
      updatedProfile = await prisma.userProfile.update({
        where: { userId: user.id },
        data: buildProfileData(profile, user.profile)
      })
    } else {
      // Create new profile
      updatedProfile = await prisma.userProfile.create({
        data: {
          userId: user.id,
          ...buildProfileData(profile),
        }
      })
    }

    return NextResponse.json({ profile: updatedProfile })
  } catch (error) {
    console.error('Error saving profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
