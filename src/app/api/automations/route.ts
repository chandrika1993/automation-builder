// app/api/automations/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "../../../../lib/db";
import { Prisma } from "@prisma/client";

const CreateWorkflowSchema = z.object({
  name:  z.string().optional().default("Untitled Workflow"),
  nodes: z.array(z.record(z.string(), z.any())).optional().default([]),
  edges: z.array(z.record(z.string(), z.any())).optional().default([]),
});

// ── Safe body parser ───────────────────────────────────────────────────────
async function parseBody(req: NextRequest): Promise<{ ok: true; data: unknown } | { ok: false; error: string }> {
  const text = await req.text();
  if (!text?.trim()) return { ok: false, error: "Empty request body" };
  try {
    return { ok: true, data: JSON.parse(text) };
  } catch {
    return { ok: false, error: "Invalid JSON" };
  }
}

/**
 * GET /api/automations
 * Returns a paginated list of workflows ordered by most recently updated.
 * Query params: page (default 1), limit (default 10, max 50)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get("limit")) || 10, 50);
    const page  = Math.max(1, Number(searchParams.get("page")) || 1);

    const [workflows, total] = await Promise.all([
      prisma.workflow.findMany({
        orderBy: { updatedAt: "desc" },
        select: { id: true, name: true, createdAt: true, updatedAt: true },
        take: limit,
        skip: (page - 1) * limit,
      }),
      prisma.workflow.count(),
    ]);

    return NextResponse.json({
      data: workflows.map(({ ...rest }) => ({
        ...rest
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[WORKFLOW_GET_ALL]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * POST /api/automations
 */
export async function POST(req: NextRequest) {
  try {
    const parsed = await parseBody(req);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const validation = CreateWorkflowSchema.safeParse(parsed.data);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validation.error.format() },
        { status: 400 }
      );
    }

    const { name, nodes, edges } = validation.data;

    const workflow = await prisma.workflow.create({
      data: {
        name,
        nodes: nodes as Prisma.InputJsonValue,
        edges: edges as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json(workflow, { status: 201 });
  } catch (error) {
    console.error("[WORKFLOW_POST]", error);
    return NextResponse.json({ error: "Failed to create workflow" }, { status: 500 });
  }
}