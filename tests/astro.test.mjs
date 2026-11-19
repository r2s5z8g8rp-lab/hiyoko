import test from 'node:test';
import assert from 'node:assert/strict';
import { moonAge, sunTimes, fmtTime, tideName, estimateTides, findExtrema, tideStage, addDays } from '../js/astro.js';

test('新月・満月の月齢', () => {
  const nm = moonAge(new Date(Date.UTC(2024, 0, 11, 11, 57)));
  assert.ok(nm < 0.3 || nm > 29.3, `new moon age ${nm}`);
  const fm = moonAge(new Date(Date.UTC(2024, 0, 25, 17, 54)));
  assert.ok(Math.abs(fm - 14.77) < 0.4, `full moon age ${fm}`);
});

test('東京の夏至の日の出・日の入り', () => {
  const s = sunTimes('2026-06-21', 35.68, 139.77);
  assert.match(fmtTime(s.sunrise), /^04:2[0-9]$/);
  assert.match(fmtTime(s.sunset), /^(18:5[7-9]|19:0[0-3])$/);
});

test('潮回り: 新月付近は大潮、上弦付近は小潮', () => {
  assert.equal(tideName('2024-01-12').name, '大潮');
  assert.equal(tideName('2024-01-18').name, '小潮');
});

test('潮汐概算: 1日に満潮・干潮が交互に3〜4回', () => {
  const t = estimateTides('2026-11-21', 139.7);
  assert.ok(t.events.length >= 3 && t.events.length <= 5, JSON.stringify(t.events));
  for (let i = 1; i < t.events.length; i++) assert.notEqual(t.events[i].type, t.events[i - 1].type);
  assert.ok(t.curve.length > 100);
});

test('極値抽出と潮の段階', () => {
  const base = Date.UTC(2026, 0, 1);
  const series = Array.from({ length: 25 }, (_, h) => ({ time: new Date(base + h * 3600000), height: Math.cos((2 * Math.PI * h) / 12.42) }));
  const ex = findExtrema(series);
  assert.equal(ex[0].type, 'low');
  assert.ok(Math.abs((ex[0].time - base) / 3600000 - 6.21) < 0.1);
  const st = tideStage(ex, new Date(base + 9.3 * 3600000));
  assert.equal(st.dir, '上げ');
  assert.equal(st.bu, 5);
});

test('日付加算', () => {
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
});
