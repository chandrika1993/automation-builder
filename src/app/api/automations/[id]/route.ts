// app/api/automations/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "../../../../../lib/db";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

/**
 * Zod schema for PUT request body.
 * All fields are optional individually, but at least one must be present.
 * Allows partial updates — rename only, reposition nodes only, etc.
 */
const UpdateWorkflowSchema = z.object({
  name:  z.string().min(1).max(100).optional(),
  nodes: z.array(z.any()).optional(),
  edges: z.array(z.any()).optional(),
}).refine(
  (data) => data.name !== undefined || data.nodes !== undefined || data.edges !== undefined,
  { message: "At least one field must be provided" }
);

type Context = { params: Promise<{ id: string }> };

/**
 * Safe body parser — `req.json()` throws on empty bodies so we read
 * text first and parse manually, returning a discriminated union.
 */
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
 * GET /api/automations/[id]
 * Returns a single workflow. Normalises nodes/edges to [] if Prisma
 * returns them as a non-array JsonValue (e.g. null or object).
 */
export async function GET(_req: NextRequest, { params }: Context) {
  try {
    const { id } = await params;

    const workflow = await prisma.workflow.findUnique({ where: { id } });
    
    if (!workflow) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...workflow,
      nodes: Array.isArray(workflow.nodes) ? workflow.nodes : [],
      edges: Array.isArray(workflow.edges) ? workflow.edges : [],
    });
  } catch (error) {
    console.error(`[WORKFLOW_GET] ${error}`);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * PUT /api/automations/[id]
 * Partial update — only the fields present in the body are written.
 * Prisma error P2025 (record not found) is surfaced as a 404.
 */
export async function PUT(req: NextRequest, { params }: Context) {
  try {
    const { id } = await params;

    const parsed = await parseBody(req);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const validation = UpdateWorkflowSchema.safeParse(parsed.data);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid data", details: validation.error.format() },
        { status: 400 }
      );
    }

    const { name, nodes, edges } = validation.data;

    const updated = await prisma.workflow.update({
      where: { id },
      data: {
        ...(name  !== undefined && { name }),
        ...(nodes !== undefined && { nodes: nodes }),
        ...(edges !== undefined && { edges: edges }),
      },
    });

    return NextResponse.json({
      ...updated,
      nodes: Array.isArray(updated.nodes) ? updated.nodes : [],
      edges: Array.isArray(updated.edges) ? updated.edges : [],
    });
  } catch (error) {
    console.error(`[WORKFLOW_PUT] ${error}`);
    if (error instanceof PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to update workflow" }, { status: 500 });
  }
}

/**
 * DELETE /api/automations/[id]
 * Returns 204 No Content on success.
 * Prisma error P2025 (record not found) is surfaced as a 404.
 */
export async function DELETE(_req: NextRequest, { params }: Context) {
  try {
    const { id } = await params;

    await prisma.workflow.delete({ where: { id } });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error(`[WORKFLOW_DELETE] ${error}`);
    if (error instanceof PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to delete workflow" }, { status: 500 });
  }
}