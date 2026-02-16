import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSql } from "./_db";
import crypto from "node:crypto";
import formidable from "formidable";
import { put } from "@vercel/blob";

// IMPORTANT: pour que formidable puisse lire le body (désactive le bodyParser Vercel)
export const config = {
  api: { bodyParser: false },
};

type ProductRow = {
  id: string;
  name: string;
  category: string;
  image_url: string | null;
  indicative_price: string | null;
  is_active: boolean;
  created_at: string;
};

function isMultipart(req: VercelRequest) {
  const ct = req.headers["content-type"] || "";
  return ct.includes("multipart/form-data");
}

function isJson(req: VercelRequest) {
  const ct = req.headers["content-type"] || "";
  return ct.includes("application/json");
}

async function readRawBody(req: VercelRequest): Promise<string> {
  return await new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => resolve(data));
    req.on("error", (err) => reject(err));
  });
}

async function parseJsonBody(req: VercelRequest): Promise<any> {
  const raw = await readRawBody(req);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("Invalid JSON body");
  }
}

async function parseMultipart(req: VercelRequest): Promise<{
  fields: Record<string, any>;
  files: Record<string, formidable.File | formidable.File[]>;
}> {
  const form = formidable({
    multiples: false,
    keepExtensions: true,
    maxFileSize: 10 * 1024 * 1024, // 10MB
  });

  return await new Promise((resolve, reject) => {
    form.parse(req as any, (err, fields, files) => {
      if (err) return reject(err);
      resolve({ fields: fields as any, files: files as any });
    });
  });
}

function toBool(v: any): boolean | null {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    if (v.toLowerCase() === "true") return true;
    if (v.toLowerCase() === "false") return false;
  }
  return null;
}

function one(v: any) {
  return Array.isArray(v) ? v[0] : v;
}

function normalizeNullableString(v: any): string | null {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const sql = getSql();

  // OPTIONS (CORS preflight)
  if (req.method === "OPTIONS") return res.status(204).end();

  const { id, active } = req.query as { id?: string; active?: string };

  // =========================
  // GET
  // =========================
  if (req.method === "GET") {
    if (id) {
      const rows = await sql<ProductRow[]>`
        select id, name, category, image_url, indicative_price, is_active, created_at
        from public.products
        where id = ${id}
        limit 1
      `;
      if (!rows[0]) return res.status(404).json({ error: "Product not found" });
      return res.status(200).json(rows[0]);
    }

    // ✅ active=true
    if (active === "true") {
      const rows = await sql<ProductRow[]>`
        select id, name, category, image_url, indicative_price, is_active, created_at
        from public.products
        where is_active = true
        order by created_at desc
      `;
      return res.status(200).json(rows);
    }

    const rows = await sql<ProductRow[]>`
      select id, name, category, image_url, indicative_price, is_active, created_at
      from public.products
      order by created_at desc
    `;
    return res.status(200).json(rows);
  }

  // =========================
  // POST / PATCH : read body (JSON or multipart)
  // =========================
  let body: any = {};
  let uploadedImageUrl: string | null = null;

  try {
    if (isMultipart(req)) {
      const { fields, files } = await parseMultipart(req);

      body = {
        name: one(fields.name),
        category: one(fields.category),
        indicativePrice: one(fields.indicativePrice),
        isActive: toBool(one(fields.isActive)),
        imageUrl: one(fields.imageUrl),
      };

      const img = files.image ? one(files.image) : null;
      if (img && (img as formidable.File).filepath) {
        const file = img as formidable.File;

        const filename =
          (file.originalFilename && file.originalFilename.replace(/\s+/g, "_")) ||
          `product_${Date.now()}.jpg`;

        const fs = await import("node:fs/promises");
        const data = await fs.readFile(file.filepath);

        const blob = await put(`products/${crypto.randomUUID()}_${filename}`, data, {
          access: "public",
          contentType: file.mimetype || "image/jpeg",
        });

        uploadedImageUrl = blob.url;
      }
    } else if (isJson(req)) {
      body = await parseJsonBody(req);
    } else {
      body = req.body ?? {};
    }
  } catch (e: any) {
    return res.status(400).json({ error: e?.message ?? "Invalid request body" });
  }

  // =========================
  // POST (create)
  // =========================
  if (req.method === "POST") {
    const name = (body?.name ?? "").toString().trim();
    const category = (body?.category ?? "").toString().trim();

    const indicativePrice = normalizeNullableString(body?.indicativePrice);
    const isActive = toBool(body?.isActive) ?? true;
    const imageUrl = uploadedImageUrl ?? normalizeNullableString(body?.imageUrl);

    if (!name || !category) {
      return res.status(400).json({ error: "name and category are required" });
    }

    const newId = crypto.randomUUID();

    const inserted = await sql<ProductRow[]>`
      insert into public.products (id, name, category, image_url, indicative_price, is_active, created_at)
      values (${newId}, ${name}, ${category}, ${imageUrl}, ${indicativePrice}, ${isActive}, now())
      returning id, name, category, image_url, indicative_price, is_active, created_at
    `;

    return res.status(200).json(inserted[0]);
  }

  // =========================
  // PATCH (update by id)
  // =========================
  if (req.method === "PATCH") {
    if (!id) return res.status(400).json({ error: "Missing id in query (?id=...)" });

    const name = body?.name != null ? String(body.name).trim() : null;
    const category = body?.category != null ? String(body.category).trim() : null;

    const indicativePrice =
      body?.indicativePrice != null ? normalizeNullableString(body.indicativePrice) : null;

    const isActive = toBool(body?.isActive);
    const imageUrl =
      uploadedImageUrl ?? (body?.imageUrl != null ? normalizeNullableString(body.imageUrl) : null);

    const updated = await sql<ProductRow[]>`
      update public.products
      set
        name = coalesce(${name}, name),
        category = coalesce(${category}, category),
        image_url = coalesce(${imageUrl}, image_url),
        indicative_price = coalesce(${indicativePrice}, indicative_price),
        is_active = coalesce(${isActive}, is_active)
      where id = ${id}
      returning id, name, category, image_url, indicative_price, is_active, created_at
    `;

    if (!updated[0]) return res.status(404).json({ error: "Product not found" });
    return res.status(200).json(updated[0]);
  }

  return res.status(405).json({ error: "Method not allowed" });
}
