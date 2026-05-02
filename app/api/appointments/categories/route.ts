import { NextResponse } from "next/server";
import prisma from "@/prisma/prisma";

export const dynamic = "force-dynamic";

// GET /api/appointments/categories
// Returns distinct categories that have at least one published service,
// along with the count of services per category.
export async function GET() {
  try {
    const rows = await prisma.service.groupBy({
      by: ["category"],
      where: {
        isPublished: true,
        deletedAt: null,
        category: { not: null },
      },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    });

    const categories = rows
      .filter((r) => r.category)
      .map((r) => ({
        name: r.category as string,
        count: r._count.id,
      }));

    return NextResponse.json({ data: categories });
  } catch (error) {
    console.error("GET /api/appointments/categories error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch categories" } },
      { status: 500 }
    );
  }
}
