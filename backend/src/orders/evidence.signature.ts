/**
 * El tipo que declara el navegador se puede falsear: se compara con los primeros bytes del archivo
 * («firma» o magic number). Así un HTML o un ejecutable no entra como si fuera una foto.
 */

const ascii = (buf: Buffer, start: number, end: number) => buf.subarray(start, end).toString('latin1');

/** Marcas («brands») de contenedores ISO-BMFF que usan HEIC y HEIF. */
const MARCAS_HEIF = new Set(['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'mif1', 'msf1', 'heif']);

const FIRMAS: Record<string, (buf: Buffer) => boolean> = {
  'image/jpeg': (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/png': (b) => b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  'image/gif': (b) => ['GIF87a', 'GIF89a'].includes(ascii(b, 0, 6)),
  'image/webp': (b) => ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 12) === 'WEBP',
  'image/heic': (b) => ascii(b, 4, 8) === 'ftyp' && MARCAS_HEIF.has(ascii(b, 8, 12)),
  'image/heif': (b) => ascii(b, 4, 8) === 'ftyp' && MARCAS_HEIF.has(ascii(b, 8, 12)),
  // Algunos generadores anteponen bytes antes de %PDF-: se busca en el primer kilobyte
  'application/pdf': (b) => ascii(b, 0, 1024).includes('%PDF-'),
};

/** true si el contenido corresponde al tipo declarado (y el tipo está entre los admitidos). */
export function coincideFirma(mime: string, contenido: Buffer): boolean {
  const verificar = FIRMAS[mime];
  return verificar !== undefined && verificar(contenido);
}
