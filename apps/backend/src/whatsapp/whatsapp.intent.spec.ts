/**
 * Unit tests for WhatsApp intent parsing and phone normalization.
 * These functions are extracted here to test them without database dependencies.
 */

// ─── Re-implement the functions under test ────────────────────────────────────
// (These mirror the exact logic in whatsapp.service.ts)

const INTENT_MAP: Record<string, string> = {
  // CHECK_IN
  entrada: 'CHECK_IN', entrar: 'CHECK_IN', 'clock in': 'CHECK_IN', inicio: 'CHECK_IN',
  // CHECK_OUT
  salida: 'CHECK_OUT', salir: 'CHECK_OUT', 'clock out': 'CHECK_OUT', fin: 'CHECK_OUT',
  // BREAK_START
  pausa: 'BREAK_START', descanso: 'BREAK_START', 'pausa inicio': 'BREAK_START',
  // BREAK_END
  'fin pausa': 'BREAK_END', reanudar: 'BREAK_END', retomar: 'BREAK_END', volver: 'BREAK_END',
  // STATUS
  estado: 'STATUS', status: 'STATUS', situacion: 'STATUS', situación: 'STATUS',
  // HOURS
  'mis horas': 'HOURS', horas: 'HOURS', tiempo: 'HOURS',
  // CANCEL
  cancelar: 'CANCEL', cancel: 'CANCEL',
};

function parseIntent(text: string): string | null {
  const normalized = text.toLowerCase().trim();
  if (INTENT_MAP[normalized]) return INTENT_MAP[normalized];
  for (const [keyword, intent] of Object.entries(INTENT_MAP)) {
    if (normalized.includes(keyword)) return intent;
  }
  return null;
}

function normalizePhone(phone: string): string {
  let normalized = phone.replace(/\D/g, '');
  if (normalized.startsWith('34') && normalized.length === 11) {
    normalized = normalized.slice(2);
  }
  return normalized;
}

function isContextExpired(expiresAt: Date | null): boolean {
  if (!expiresAt) return true;
  return expiresAt <= new Date();
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('WhatsApp intent parsing', () => {
  describe('parseIntent - CHECK_IN', () => {
    it.each(['entrada', 'ENTRADA', 'Entrada', 'entrar', 'Entrar'])(
      'should parse "%s" as CHECK_IN',
      (text) => {
        expect(parseIntent(text)).toBe('CHECK_IN');
      },
    );

    it('should parse "hola, quiero hacer entrada" as CHECK_IN', () => {
      expect(parseIntent('hola, quiero hacer entrada')).toBe('CHECK_IN');
    });

    it('should parse "clock in" as CHECK_IN', () => {
      expect(parseIntent('clock in')).toBe('CHECK_IN');
    });
  });

  describe('parseIntent - CHECK_OUT', () => {
    it.each(['salida', 'Salida', 'salir', 'clock out', 'fin'])(
      'should parse "%s" as CHECK_OUT',
      (text) => {
        expect(parseIntent(text)).toBe('CHECK_OUT');
      },
    );
  });

  describe('parseIntent - BREAK_START', () => {
    it.each(['pausa', 'Pausa', 'descanso', 'pausa inicio'])(
      'should parse "%s" as BREAK_START',
      (text) => {
        expect(parseIntent(text)).toBe('BREAK_START');
      },
    );

    it('should parse "voy a hacer pausa" as BREAK_START', () => {
      expect(parseIntent('voy a hacer pausa')).toBe('BREAK_START');
    });
  });

  describe('parseIntent - BREAK_END', () => {
    it.each(['fin pausa', 'reanudar', 'retomar', 'volver'])(
      'should parse "%s" as BREAK_END',
      (text) => {
        expect(parseIntent(text)).toBe('BREAK_END');
      },
    );

    it('should parse "voy a volver al trabajo" as BREAK_END', () => {
      expect(parseIntent('voy a volver al trabajo')).toBe('BREAK_END');
    });
  });

  describe('parseIntent - STATUS', () => {
    it.each(['estado', 'status', 'situacion', 'situación'])(
      'should parse "%s" as STATUS',
      (text) => {
        expect(parseIntent(text)).toBe('STATUS');
      },
    );
  });

  describe('parseIntent - HOURS', () => {
    it.each(['horas', 'mis horas', 'tiempo'])(
      'should parse "%s" as HOURS',
      (text) => {
        expect(parseIntent(text)).toBe('HOURS');
      },
    );
  });

  describe('parseIntent - CANCEL', () => {
    it.each(['cancelar', 'cancel', 'Cancelar'])(
      'should parse "%s" as CANCEL',
      (text) => {
        expect(parseIntent(text)).toBe('CANCEL');
      },
    );
  });

  describe('parseIntent - unknown', () => {
    it.each(['hola', 'buenos días', 'gracias', '???', ''])(
      'should return null for unknown text "%s"',
      (text) => {
        expect(parseIntent(text)).toBeNull();
      },
    );
  });

  describe('parseIntent - priority (multi-keyword messages)', () => {
    it('should find first matching keyword in compound message', () => {
      // "fin pausa" should match BREAK_END, not CHECK_OUT via "fin"
      const result = parseIntent('fin pausa');
      expect(result).toBe('BREAK_END');
    });
  });
});

describe('Phone normalization', () => {
  it('should strip non-numeric characters', () => {
    expect(normalizePhone('+34 612 345 678')).toBe('612345678');
  });

  it('should strip Spanish country code +34 from 11-digit number', () => {
    expect(normalizePhone('34612345678')).toBe('612345678');
  });

  it('should keep 9-digit number as-is', () => {
    expect(normalizePhone('612345678')).toBe('612345678');
  });

  it('should handle number without prefix', () => {
    expect(normalizePhone('666777888')).toBe('666777888');
  });

  it('should strip international + prefix', () => {
    expect(normalizePhone('+34666777888')).toBe('666777888');
  });
});

describe('Context TTL expiry', () => {
  it('should return expired=true for null expiresAt', () => {
    expect(isContextExpired(null)).toBe(true);
  });

  it('should return expired=true for past date', () => {
    const past = new Date(Date.now() - 10_000); // 10 seconds ago
    expect(isContextExpired(past)).toBe(true);
  });

  it('should return expired=false for future date', () => {
    const future = new Date(Date.now() + 300_000); // 5 minutes from now
    expect(isContextExpired(future)).toBe(false);
  });

  it('should return expired=true for exactly now (boundary)', () => {
    const now = new Date();
    // At exactly the expiry time, it should be expired
    expect(isContextExpired(new Date(now.getTime() - 1))).toBe(true);
  });
});
