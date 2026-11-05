import { test } from 'node:test'
import assert from 'node:assert/strict'
import { countCurrentStreak, getScopedStorageKey, mergeMonthBounds } from '../src/lib/data-safety.ts'

test('account and guest cache keys never overlap', () => {
  const key = 'beat-by-bit-tracker-state-v1'
  assert.equal(getScopedStorageKey(key), `${key}:guest`)
  assert.equal(getScopedStorageKey(key, 'user-a'), `${key}:user:user-a`)
  assert.equal(getScopedStorageKey(key, 'user-b'), `${key}:user:user-b`)
  assert.notEqual(getScopedStorageKey(key), getScopedStorageKey(key, 'user-a'))
})

test('preserves cloud history when only the latest month is loaded', () => {
  assert.deepEqual(mergeMonthBounds(['2026-11'], { firstMonth: '2024-02', lastMonth: '2026-10' }), {
    firstMonth: '2024-02', lastMonth: '2026-11',
  })
})

test('month history can extend backwards and remains empty when unknown', () => {
  assert.deepEqual(mergeMonthBounds(['2023-12'], { firstMonth: '2024-01', lastMonth: '2026-05' }), {
    firstMonth: '2023-12', lastMonth: '2026-05',
  })
  assert.deepEqual(mergeMonthBounds([]), { firstMonth: null, lastMonth: null })
})

test('streak includes yesterday when today has no entries yet', () => {
  assert.equal(countCurrentStreak(['2026-11-03', '2026-11-04', '2026-11-05'], '2026-11-06'), 3)
  assert.equal(countCurrentStreak(['2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06'], '2026-11-06'), 4)
  assert.equal(countCurrentStreak(['2026-11-03', '2026-11-04'], '2026-11-06'), 0)
})

test('streak handles month and leap-year boundaries', () => {
  assert.equal(countCurrentStreak(['2024-02-28','2024-02-29'], '2024-03-01'), 2)
  assert.equal(countCurrentStreak(['2025-12-31'], '2026-01-01'), 1)
})
