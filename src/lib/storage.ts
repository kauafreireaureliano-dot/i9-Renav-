import { mkdir, writeFile, readFile } from "fs/promises";
import { join, extname } from "path";
import { randomUUID } from "crypto";
import { put, del } from "@vercel/blob";

// Driver de storage para documentos (CRLV, ATPV, NFs, comprovantes).
//
// - "vercel-blob" (produção): salva no Vercel Blob. Necessário porque o
//   filesystem da Vercel é efêmero — qualquer arquivo salvo em disco local
//   some no próximo deploy/invocação. Requer BLOB_READ_WRITE_TOKEN
//   (criado automaticamente ao conectar um Blob Store ao projeto na Vercel).
// - "local" (desenvolvimento): salva em ./storage na raiz do projeto,
//   fora de /public, sem exigir nenhum serviço externo configurado.
//
// Em ambos os casos, o arquivo só é acessível através da rota autenticada
// /api/documents/[id]/file — mesmo o Blob sendo "público" (limitação do
// Vercel Blob em contas Hobby), o nome do arquivo é um UUID imprevisível e
// nunca é exposto diretamente ao cliente.

function resolveDriver(): "vercel-blob" | "local" {
  if (process.env.STORAGE_DRIVER === "local") return "local";
  return process.env.BLOB_READ_WRITE_TOKEN ? "vercel-blob" : "local";
}

export async function saveFile(
  buffer: Buffer,
  originalName: string,
  subfolder = "documents"
): Promise<string> {
  const fileName = `${randomUUID()}${extname(originalName)}`;
  const relativePath = `${subfolder}/${fileName}`;

  if (resolveDriver() === "vercel-blob") {
    const blob = await put(relativePath, buffer, {
      access: "public",
      addRandomSuffix: false,
    });
    return blob.url;
  }

  const dir = join(process.cwd(), "storage", subfolder);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, fileName), buffer);
  return relativePath;
}

export async function readStoredFile(pathOrUrl: string): Promise<Buffer> {
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    const res = await fetch(pathOrUrl);
    if (!res.ok) throw new Error(`Falha ao buscar arquivo no storage: ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }

  const filePath = join(process.cwd(), "storage", pathOrUrl);
  return readFile(filePath);
}

export async function deleteStoredFile(pathOrUrl: string): Promise<void> {
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    await del(pathOrUrl);
  }
  // arquivos locais de dev não precisam de limpeza automática
}
