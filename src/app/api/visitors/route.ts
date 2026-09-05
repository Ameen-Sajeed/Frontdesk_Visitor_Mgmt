import { NextResponse } from "next/server";
import { normalizePhoneForLookup } from "@/lib/phone";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const phone = new URL(request.url).searchParams.get("phone")?.trim() ?? "";
  const lookupKey = normalizePhoneForLookup(phone);
  const digitsOnly = lookupKey.replace(/\D/g, "");

  if (lookupKey.length < 3) return NextResponse.json([]);

  const visitors = await prisma.visitor.findMany({
    where: {
      OR: [
        { phoneLookupKey: { startsWith: lookupKey } },
        { phoneLookupKey: { startsWith: digitsOnly } },
        { phone: { contains: phone, mode: "insensitive" } },
      ],
    },
    select: { id: true, fullName: true, phone: true, email: true, company: true, designation: true },
    take: 5,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(visitors);
}
