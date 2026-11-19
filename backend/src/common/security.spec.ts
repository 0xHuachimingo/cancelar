import { coincideFirma } from '../orders/evidence.signature';
import { corteDeSesiones, nuevaSesion, sesionVigente } from '../auth/sessions';
import { problemaPassword, problemaTelefono } from '../domain/validation';
import { escapeLike } from './text';

describe('escapeLike', () => {
  it('escapa los comodines de LIKE y la barra invertida', () => {
    expect(escapeLike('100%')).toBe('100\\%');
    expect(escapeLike('a_b')).toBe('a\\_b');
    expect(escapeLike('c:\\temp')).toBe('c:\\\\temp');
    expect(escapeLike("' OR 1=1 --")).toBe("' OR 1=1 --");
  });
});

describe('firma de archivos', () => {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
  const jpg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]);
  it('acepta el contenido que corresponde al tipo', () => {
    expect(coincideFirma('image/png', png)).toBe(true);
    expect(coincideFirma('image/jpeg', jpg)).toBe(true);
    expect(coincideFirma('image/gif', Buffer.from('GIF89a....'))).toBe(true);
    expect(coincideFirma('image/webp', Buffer.from('RIFF\0\0\0\0WEBPVP8 '))).toBe(true);
    expect(coincideFirma('image/heic', Buffer.from('\0\0\0\x18ftypheic\0\0\0\0', 'latin1'))).toBe(true);
    expect(coincideFirma('application/pdf', Buffer.from('%PDF-1.7\n'))).toBe(true);
  });
  it('rechaza tipos cambiados, vacíos o no admitidos', () => {
    expect(coincideFirma('image/jpeg', png)).toBe(false);
    expect(coincideFirma('image/png', Buffer.from('<html>'))).toBe(false);
    expect(coincideFirma('image/png', Buffer.alloc(0))).toBe(false);
    expect(coincideFirma('image/svg+xml', Buffer.from('<svg/>'))).toBe(false);
    expect(coincideFirma('text/html', Buffer.from('<html>'))).toBe(false);
  });
});

describe('corte de sesiones', () => {
  it('sin corte, toda sesión vale', () => {
    expect(sesionVigente({ sub: 'u' }, null)).toBe(true);
  });
  it('vale la sesión emitida después del corte, aunque sea en el mismo segundo', () => {
    const corte = corteDeSesiones();
    expect(sesionVigente(nuevaSesion('u'), corte)).toBe(true);
    expect(sesionVigente({ sub: 'u', t: corte.getTime() - 1 }, corte)).toBe(false);
  });
  it('los tokens sin «t» se comparan por iat (segundos)', () => {
    const corte = new Date(10_000_500);
    expect(sesionVigente({ sub: 'u', iat: 10_000 }, corte)).toBe(false);
    expect(sesionVigente({ sub: 'u', iat: 10_001 }, corte)).toBe(true);
    expect(sesionVigente({ sub: 'u' }, corte)).toBe(false);
  });
});

describe('reglas de validación', () => {
  it('teléfono', () => {
    expect(problemaTelefono('11 4000-0000')).toBeNull();
    expect(problemaTelefono('12345')).toMatch(/al menos 6/);
    expect(problemaTelefono('1234567890123456')).toMatch(/más de 15/);
    expect(problemaTelefono('11-abc')).toMatch(/solo números/);
  });
  it('contraseña', () => {
    expect(problemaPassword('abcdefg1', 8)).toBeNull();
    expect(problemaPassword('abc1', 8)).toMatch(/al menos 8/);
    expect(problemaPassword('abcdefgh', 8)).toMatch(/letras y números/);
    expect(problemaPassword('12345678', 8)).toMatch(/letras y números/);
  });
});
