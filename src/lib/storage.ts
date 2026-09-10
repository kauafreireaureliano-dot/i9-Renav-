import { mkdir, writeFile, readFile } from "fs/promises";
import { join, extname } from "path";
import { randomUUID } from "crypto";

// Driver de storage local (disco). Documentos ficam fora de /public para que
// só sejam acessíveis através da rota autenticada /api/documents/[id]/file —
// evita expor documentos pessoais (CPF, comprovantes) publicamente.
// Trocar por S3/R2/Blob no futuro só exige reimplementar este módulo.

// Caminho fixo (não vindo de env em runtime) para que o bundler do Next
// consiga rastrear estaticamente o escopo de arquivos e não inclua o
// projeto inteiro no output de produção.
export async function saveFile(
  buffer: Buffer,
  originalName: string,
  subfolder = "documents"
): Promise<string> {
  const dir = join(process.cwd(), "storage", subfolder);
  await mkdir(dir, { recursive: true });

  const fileName = `${randomUUID()}${extname(originalName)}`;
  const filePath = join(dir, fileName);
  await writeFile(filePath, buffer);

  return join(subfolder, fileName).replace(/\\/g, "/");
}

export async function readStoredFile(relativePath: string): Promise<Buffer> {
  const filePath = join(process.cwd(), "storage", relativePath);
  return readFile(filePath);
}
