import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const DEFAULT_STORAGE_ROOT = '.stacklane/files';
const ALLOWED_MIME_TYPES = new Set([
  'image/png', 'image/jpeg', 'image/webp',
  'application/json', 'text/plain',
]);

export interface FileRecord {
  id: string;
  projectId: string;
  customerId?: string;
  name: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  storageProvider: 'local';
  visibility: 'private' | 'public';
  createdAt: string;
  updatedAt: string;
}

function getStorageRoot(): string {
  return process.env.STORAGE_ROOT || DEFAULT_STORAGE_ROOT;
}

function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 100);
}

function generateStorageKey(projectId: string, filename: string): string {
  const id = crypto.randomUUID();
  return `${projectId}/${id}-${filename}`;
}

export function validateMimeType(mimeType: string): boolean {
  return ALLOWED_MIME_TYPES.has(mimeType);
}

export function isPathTraversal(filePath: string): boolean {
  return filePath.includes('..') || filePath.includes('/') || filePath.includes('\\');
}

export function writeLocalFile(
  projectId: string,
  filename: string,
  buffer: Buffer,
  mimeType: string
): { storageKey: string; filePath: string } {
  const storageKey = generateStorageKey(projectId, filename);
  const storageRoot = getStorageRoot();
  const filePath = path.join(storageRoot, storageKey);

  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, buffer);

  return { storageKey, filePath };
}

export function readLocalFile(storageKey: string): Buffer | null {
  const storageRoot = getStorageRoot();
  const filePath = path.join(storageRoot, storageKey);

  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath);
}

export function deleteLocalFile(storageKey: string): boolean {
  const storageRoot = getStorageRoot();
  const filePath = path.join(storageRoot, storageKey);

  if (!fs.existsSync(filePath)) return false;
  fs.unlinkSync(filePath);
  return true;
}

export function sanitizeFilenameForStorage(name: string): string {
  return sanitizeFilename(name);
}

export { generateStorageKey };
