import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { actors, getMatch, matches, pageNumber, validateProfile, initialLanguage } from '../src/data.js';

test('all 16 match results agree with docs/match.md', async () => {
  const source = await readFile(new URL('../docs/match.md', import.meta.url), 'utf8');
  const rules = [...source.matchAll(/([EI][SN][TF][JP])\s*→\s*(\S+)/g)];
  assert.equal(rules.length, 16);
  assert.equal(Object.keys(matches).length, 16);
  for (const [, mbti, name] of rules) assert.equal(getMatch(mbti)?.name, name, mbti);
  assert.equal(new Set(Object.values(matches)).size, 9);
  assert.equal(getMatch('INVALID'), undefined);
});

test('every actor has a Korean and Chinese reference and optimized asset', async () => {
  assert.equal(actors.length, 9);
  for (const actor of actors) for (const lang of ['ko', 'zh']) {
    const number = pageNumber(actor, lang);
    await access(new URL(`../docs/THEMAN QR-${number}.png`, import.meta.url));
    await access(new URL(`../public/assets/result-${number}.webp`, import.meta.url));
    assert.equal(actor.ko - actor.zh, 10);
  }
});

test('profile validation rejects whitespace, invalid age, and missing MBTI', () => {
  const valid = { name: '지현', age: '27', mbti: 'INFP' };
  assert.equal(validateProfile(valid), null);
  for (const name of [' ', '김'.repeat(21)]) assert.equal(validateProfile({ ...valid, name }), 'name');
  for (const age of ['', '0', '-1', '121', '2.7', '2e1', 'abc']) assert.equal(validateProfile({ ...valid, age }), 'age');
  assert.equal(validateProfile({ ...valid, name: '小明', age: '120', mbti: 'ENTJ' }), null);
  assert.equal(validateProfile({ ...valid, mbti: 'ABCD' }), 'mbti');
});

test('QR links default to Korean and support explicit language', () => {
  assert.equal(initialLanguage(''), 'ko');
  assert.equal(initialLanguage('?page=10'), 'ko');
  assert.equal(initialLanguage('?page=11'), 'ko');
  assert.equal(initialLanguage('?page=01'), 'zh');
  assert.equal(initialLanguage('?lang=zh'), 'zh');
  assert.equal(initialLanguage('?lang=ko&page=01'), 'ko');
  assert.equal(initialLanguage('?lang=invalid'), 'ko');
});
