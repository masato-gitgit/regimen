import { describe, it, expect } from 'vitest';
import { guessProtocolType, PROTOCOL_TYPES } from '../regimenProtocols';

describe('regimenProtocols', () => {
  describe('guessProtocolType', () => {
    it('should correctly guess TECVAYLI', () => {
      expect(guessProtocolType('テクベイリ療法')).toBe(PROTOCOL_TYPES.TECVAYLI);
      expect(guessProtocolType('テクラスタマブ投与')).toBe(PROTOCOL_TYPES.TECVAYLI);
    });

    it('should correctly guess TALQUETAMAB', () => {
      expect(guessProtocolType('タービー')).toBe(PROTOCOL_TYPES.TALQUETAMAB);
      expect(guessProtocolType('トアルクエタマブ')).toBe(PROTOCOL_TYPES.TALQUETAMAB);
    });

    it('should correctly guess LUNSUMIO_SC and IV', () => {
      expect(guessProtocolType('ルンスミオ皮下注')).toBe(PROTOCOL_TYPES.LUNSUMIO_SC);
      expect(guessProtocolType('モスネツズマブSC')).toBe(PROTOCOL_TYPES.LUNSUMIO_SC);
      expect(guessProtocolType('ルンスミオ点滴静注')).toBe(PROTOCOL_TYPES.LUNSUMIO_IV);
      expect(guessProtocolType('モスネツズマブIV')).toBe(PROTOCOL_TYPES.LUNSUMIO_IV);
    });

    it('should fallback to LUNSUMIO_IV if route is not specified', () => {
      expect(guessProtocolType('ルンスミオ療法')).toBe(PROTOCOL_TYPES.LUNSUMIO_IV);
    });

    it('should return null for unknown protocols', () => {
      expect(guessProtocolType('R-CHOP療法')).toBeNull();
      expect(guessProtocolType('不明なレジメン')).toBeNull();
      expect(guessProtocolType('')).toBeNull();
      expect(guessProtocolType(null)).toBeNull();
    });
  });
});
