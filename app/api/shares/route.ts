import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, email: true },
    });
    if (!user?.email) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const [sharedWithMe, sharedByMe] = await Promise.all([
      prisma.share.findMany({
        where: { recipientEmail: user.email, revokedAt: null },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          recipientEmail: true,
          owner: {
            select: {
              id: true,
              email: true,
              profile: { select: { personName: true } },
            },
          },
          showSelfRating: true,
          showDosDonts: true,
          showWeeklyGoals: true,
          showOkrs: true,
          createdAt: true,
        },
      }),
      prisma.share.findMany({
        where: { ownerId: user.id, revokedAt: null },
        select: {
          id: true,
          recipientEmail: true,
          recipientUser: { select: { email: true } },
          showSelfRating: true,
          showDosDonts: true,
          showWeeklyGoals: true,
          showOkrs: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return NextResponse.json({ sharedWithMe, sharedByMe });
  } catch (error) {
    console.error("Error fetching shares:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, email: true },
    });
    if (!user?.email) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { recipientEmail, options } = await request.json();
    const trimmedEmail = String(recipientEmail || "").trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      return NextResponse.json({ error: "Invalid recipient email" }, { status: 400 });
    }
    if (trimmedEmail === user.email) {
      return NextResponse.json({ error: "Cannot share with yourself" }, { status: 400 });
    }
    const normalizedOptions = {
      showSelfRating: options?.showSelfRating !== false,
      showDosDonts: options?.showDosDonts !== false,
      showWeeklyGoals: options?.showWeeklyGoals !== false,
      showOkrs: options?.showOkrs !== false,
    };

    const recipientUser = await prisma.user.findUnique({
      where: { email: trimmedEmail },
      select: { id: true },
    });

    const share = await prisma.share.upsert({
      where: {
        ownerId_recipientEmail: { ownerId: user.id, recipientEmail: trimmedEmail },
      },
      update: {
        recipientUserId: recipientUser?.id ?? null,
        revokedAt: null,
        ...normalizedOptions,
      },
      create: {
        ownerId: user.id,
        recipientEmail: trimmedEmail,
        recipientUserId: recipientUser?.id ?? null,
        ...normalizedOptions,
      },
    });

    return NextResponse.json({ share });
  } catch (error) {
    console.error("Error creating share:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
