import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatDate, formatMonth, formatPhone, parseMoneyInput, formatNumber, formatDays, phoneHref } from '../../src/utils/format.js';
import { initialValuesFromSearch } from '../../src/features/clients/client.schema.js';
import { addDays, addMonthsToMonth, endOfMonth, startOfMonth, today } from '../../src/utils/dates.js';

// Intl may use a narrow no-break space; compare without caring about which space.
const normalize = (text) => text.replace(/\s/g, ' ');

describe('format', () => {
  it('parses what the user types in a money input', () => {
    assert.equal(parseMoneyInput('1.250.000'), 1_250_000);
    assert.equal(parseMoneyInput('$ 50.000'), 50_000);
    assert.equal(parseMoneyInput(''), null);
    assert.equal(parseMoneyInput('abc'), null);
  });

  it('shows thousands separators the Colombian way', () => {
    assert.equal(normalize(formatNumber(1_250_000)), '1.250.000');
    assert.equal(formatNumber(null), '');
  });

  it('formats calendar dates without shifting the day (no UTC conversion)', () => {
    assert.equal(formatDate('2026-10-31'), '31 oct 2026');
    assert.equal(formatDate('2026-01-01'), '1 ene 2026');
    assert.equal(formatDate(null), '—');
    assert.equal(formatMonth('2026-10'), 'Octubre 2026');
  });

  it('groups Colombian mobile numbers and builds dialer links', () => {
    assert.equal(formatPhone('+57', '3001234567'), '+57 300 123 4567');
    assert.equal(formatPhone(null, '6012345'), '6012345');
    assert.equal(phoneHref('+57', '3001234567'), 'tel:+573001234567');
  });

  it('says día or días', () => {
    assert.equal(formatDays(1), '1 día');
    assert.equal(formatDays(31), '31 días');
  });
});

describe('dates', () => {
  it('uses the Colombian calendar day for "today"', () => {
    // 2026-11-01 03:00 UTC is still Oct 31 at 22:00 in Bogotá (UTC-5).
    assert.equal(today(new Date('2026-11-01T03:00:00Z')), '2026-10-31');
    assert.equal(today(new Date('2026-11-01T05:00:00Z')), '2026-11-01');
  });

  it('handles month boundaries and leap years', () => {
    assert.equal(startOfMonth('2026-10-31'), '2026-10-01');
    assert.equal(endOfMonth('2026-02-10'), '2026-02-28');
    assert.equal(endOfMonth('2028-02-10'), '2028-02-29');
    assert.equal(addDays('2026-12-31', 1), '2027-01-01');
    assert.equal(addMonthsToMonth('2026-01', -1), '2025-12');
    assert.equal(addMonthsToMonth('2026-12', 1), '2027-01');
  });
});

describe('initialValuesFromSearch (new client from the loan form)', () => {
  it('a number goes to the ID, text to the name, nothing stays empty', () => {
    assert.deepEqual(initialValuesFromSearch('1.023.456'), { nationalId: '1023456' });
    assert.deepEqual(initialValuesFromSearch('  María López '), { fullName: 'María López' });
    assert.deepEqual(initialValuesFromSearch(''), {});
  });
});
