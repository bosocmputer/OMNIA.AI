import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import {
  addAgentKnowledge,
  listAgentKnowledge,
  deleteAgentKnowledge,
  estimateTokens,
  KnowledgeFile,
  checkDuplicateKnowledge,
  listAgents,
} from "@/lib/agents-store";

const MAX_BYTES = 10 * 1024 * 1024; // 10MB

async function canAccessAgent(req: NextRequest, agentId: string): Promise<boolean> {
  const userId = req.headers.get("x-user-id") ?? undefined;
  const agents = await listAgents(userId);
  return agents.some((a) => a.id === agentId);
}

type ParseResult = { text: string; meta: string };

async function parseExcel(buffer: Buffer, filename: string): Promise<ParseResult> {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(buffer, { type: "buffer" });
  const parts: string[] = [];
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(ws);
    const cleaned = csv.split("\n").filter((line) => line.replace(/,/g, "").trim().length > 0).join("\n");
    if (cleaned.trim()) parts.push(`--- Sheet: ${sheetName} ---\n${cleaned}`);
  }
  return { text: parts.join("\n\n"), meta: `Excel: ${filename} | ${wb.SheetNames.length} sheets` };
}

async function parsePDF(buffer: Buffer, filename: string): Promise<ParseResult> {
  // Import lib directly to skip index.js test-file logic that fails in Docker standalone
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse/lib/pdf-parse");
  const result = await pdfParse(buffer);
  return { text: result.text, meta: `PDF: ${filename} | ${result.numpages} pages` };
}

async function parseWord(buffer: Buffer, filename: string): Promise<ParseResult> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return { text: result.value, meta: `Word: ${filename}` };
}

async function parseText(buffer: Buffer, filename: string): Promise<ParseResult> {
  return { text: buffer.toString("utf-8"), meta: `Text: ${filename}` };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!await canAccessAgent(req, id)) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }
  const knowledge = await listAgentKnowledge(id);
  return NextResponse.json({ knowledge });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!await canAccessAgent(req, id)) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: `ไฟล์ใหญ่เกินไป (สูงสุด 10MB)` }, { status: 400 });
    }

    const filename = file.name;

    // Check for duplicate filename
    const duplicate = await checkDuplicateKnowledge(id, filename);
    if (duplicate) {
      return NextResponse.json(
        { error: `ไฟล์ "${filename}" มีอยู่แล้ว — ลบไฟล์เดิมก่อนแล้วอัพโหลดใหม่` },
        { status: 409 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const ext = filename.split(".").pop()?.toLowerCase() ?? "";

    let result: ParseResult;
    if (["xlsx", "xls"].includes(ext)) {
      result = await parseExcel(buffer, filename);
    } else if (ext === "pdf") {
      result = await parsePDF(buffer, filename);
    } else if (["docx", "doc"].includes(ext)) {
      result = await parseWord(buffer, filename);
    } else if (["txt", "md", "csv", "json"].includes(ext)) {
      result = await parseText(buffer, filename);
    } else {
      return NextResponse.json({ error: `ไม่รองรับไฟล์ประเภท .${ext}` }, { status: 400 });
    }

    if (!result.text.trim()) {
      return NextResponse.json({ error: "ไม่สามารถดึงข้อมูลจากไฟล์ได้" }, { status: 400 });
    }

    // Limit content to 50K chars (~12,500 tokens)
    const content = result.text.slice(0, 50000);
    const tokens = estimateTokens(content);

    const knowledgeFile: KnowledgeFile = {
      id: crypto.randomUUID(),
      filename,
      meta: result.meta,
      content,
      tokens,
      uploadedAt: new Date().toISOString(),
    };

    const added = await addAgentKnowledge(id, knowledgeFile);
    if (!added) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    return NextResponse.json({
      knowledge: {
        id: knowledgeFile.id,
        filename: knowledgeFile.filename,
        meta: knowledgeFile.meta,
        tokens: knowledgeFile.tokens,
        uploadedAt: knowledgeFile.uploadedAt,
        preview: content.slice(0, 200),
      },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!await canAccessAgent(req, id)) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }
    const { knowledgeId } = await req.json();
    if (!knowledgeId) {
      return NextResponse.json({ error: "Missing knowledgeId" }, { status: 400 });
    }
    const ok = await deleteAgentKnowledge(id, knowledgeId);
    if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
