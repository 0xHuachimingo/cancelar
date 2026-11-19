import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { access, mkdir, rm, writeFile } from 'node:fs/promises';
import { extname, join, posix, resolve, sep } from 'node:path';
import type { Env } from '../config/env';

/**
 * Almacenamiento de evidencias en disco (UPLOAD_DIR/<ordenId>/<uuid>.<ext>).
 * Para la nube (S3, Azure Blob…) basta con reimplementar esta clase.
 */
@Injectable()
export class EvidenceStorage {
  private readonly root: string;

  constructor(config: ConfigService<Env, true>) {
    this.root = resolve(config.get('UPLOAD_DIR', { infer: true }));
  }

  async save(ordenId: string, buffer: Buffer, originalName: string): Promise<string> {
    const ext = extname(originalName).toLowerCase().replace(/[^.a-z0-9]/g, '').slice(0, 10);
    // Siempre con «/»: la ruta se guarda en la base y tiene que servir igual en Windows y Linux
    const rel = posix.join(ordenId, `${randomUUID()}${ext}`);
    await mkdir(join(this.root, ordenId), { recursive: true });
    await writeFile(join(this.root, rel), buffer);
    return rel;
  }

  absolute(rel: string): string {
    const abs = resolve(this.root, rel);
    // Defensa en profundidad: nunca salir de la carpeta de uploads
    // (con el separador: «uploads-otra» empieza igual que «uploads» pero es otra carpeta)
    if (!abs.startsWith(this.root + sep)) throw new Error('Ruta de evidencia inválida');
    return abs;
  }

  async exists(rel: string): Promise<boolean> {
    try {
      await access(this.absolute(rel));
      return true;
    } catch {
      return false;
    }
  }

  async remove(rel: string): Promise<void> {
    await rm(this.absolute(rel), { force: true });
  }
}
