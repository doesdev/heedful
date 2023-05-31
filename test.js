import test from 'mvt'
import { takeHeed } from './index.js'

export const breathe = () => new Promise((resolve) => setTimeout(resolve, 0))

const getChangeCb = (status = { changes: 0, lastArgs: {} }) => {
  const onChange = (args) => {
    status.changes++
    status.lastArgs = args
  }

  return { onChange, status }
}

const common = (assert, base, heed, status) => {
  return (expectChanges, expectProp, expectChain) => {
    assert.deepEqual(base, heed)
    assert.is(status.changes, expectChanges)
    assert.is(status.lastArgs.property, expectProp)
    assert.deepEqual(status.lastArgs.chain, expectChain)
  }
}

test('takeHeed passed a primitive does nothing', async (assert) => {
  assert.is(takeHeed(1), 1)
  assert.is(takeHeed(true), true)
  assert.is(takeHeed(undefined), undefined)
})

test('takeHeed on plain object calls onChange on added property', async (assert) => {
  const { onChange, status } = getChangeCb()
  const base = {}
  const heed = takeHeed(base, { onChange })
  const checks = common(assert, base, heed, status)

  assert.is(heed.a, undefined)
  checks(0, undefined, undefined)

  heed.a = 'a'
  await breathe()

  assert.is(heed.a, 'a')
  checks(1, 'a', ['a'])

  heed.b = 'b'
  await breathe()

  assert.is(heed.b, 'b')
  checks(2, 'b', ['b'])
})

test('takeHeed on plain array calls onChange on added item', async (assert) => {
  const { onChange, status } = getChangeCb()
  const base = []
  const heed = takeHeed(base, { onChange })
  const checks = common(assert, base, heed, status)

  assert.is(heed[0], undefined)
  assert.is(heed.length, 0)
  checks(0, undefined, undefined)

  heed.push('a')
  await breathe()

  assert.is(heed[0], 'a')
  assert.is(heed.length, 1)
  checks(1, 'length', ['length'])

  heed.push('b')
  await breathe()

  assert.is(heed[1], 'b')
  assert.is(heed.length, 2)
  checks(2, 'length', ['length'])
})

test('takeHeed on nested objects calls onChange on child property change', async (assert) => {
  const { onChange, status } = getChangeCb()
  const base = { child: { grandChild: { prop: 'old' } } }
  const heed = takeHeed(base, { onChange })
  const checks = common(assert, base, heed, status)

  assert.is(heed.child.grandChild.prop, 'old')
  checks(0, undefined, undefined)

  heed.child.grandChild.prop = 'new'
  await breathe()

  assert.is(heed.child.grandChild.prop, 'new')
  checks(1, 'prop', ['child', 'grandChild', 'prop'])
})

test('takeHeed on nested arrays calls onChange on nested item change', async (assert) => {
  const { onChange, status } = getChangeCb()
  const base = [[['old']]]
  const heed = takeHeed(base, { onChange })
  const checks = common(assert, base, heed, status)

  assert.is(heed[0][0][0], 'old')
  checks(0, undefined, undefined)

  heed[0][0][0] = 'new'
  await breathe()

  assert.is(heed[0][0][0], 'new')
  checks(1, '0', ['0', '0', '0'])
})

test('takeHeed on nested objects and arrays together calls onChange on any change', async (assert) => {
  const { onChange, status } = getChangeCb()
  const base = { arr: [{ prop: 'old' }] }
  const heed = takeHeed(base, { onChange })
  const checks = common(assert, base, heed, status)

  assert.is(heed.arr[0].prop, 'old')
  checks(0, undefined, undefined)

  heed.arr[0].prop = 'new'
  await breathe()

  assert.is(heed.arr[0].prop, 'new')
  checks(1, 'prop', ['arr', '0', 'prop'])
})

test('takeHeed on deleting property calls onChange', async (assert) => {
  const { onChange, status } = getChangeCb()
  const base = { prop: 'old' }
  const heed = takeHeed(base, { onChange })
  const checks = common(assert, base, heed, status)

  assert.is(heed.prop, 'old')
  checks(0, undefined, undefined)

  delete heed.prop
  await breathe()

  assert.is(heed.prop, undefined)
  checks(1, 'prop', ['prop'])
})

test('takeHeed on deleting array element calls onChange', async (assert) => {
  const { onChange, status } = getChangeCb()
  const base = ['old']
  const heed = takeHeed(base, { onChange })
  const checks = common(assert, base, heed, status)

  assert.is(heed[0], 'old')
  checks(0, undefined, undefined)

  delete heed[0]
  await breathe()

  assert.is(heed[0], undefined)
  checks(1, '0', ['0'])
})

test('takeHeed on array.splice calls onChange', async (assert) => {
  const { onChange, status } = getChangeCb()
  const base = [1, 2, 3, 4, 5]
  const heed = takeHeed(base, { onChange })
  const checks = common(assert, base, heed, status)

  heed.splice(2, 0, 'a', 'b')
  await breathe()

  assert.deepEqual(heed, [1, 2, 'a', 'b', 3, 4, 5])
  checks(1, 'length', ['length'])
})

test('takeHeed on array.sort calls onChange', async (assert) => {
  const { onChange, status } = getChangeCb()
  const base = [5, 3, 4, 1, 2]
  const heed = takeHeed(base, { onChange })

  assert.deepEqual(heed, [5, 3, 4, 1, 2])
  assert.is(status.changes, 0)

  heed.sort()
  await breathe()

  assert.deepEqual(heed, [1, 2, 3, 4, 5])
  assert.is(status.changes, 1)
})

test('takeHeed on array.reverse calls onChange', async (assert) => {
  const { onChange, status } = getChangeCb()
  const base = [1, 2, 3, 4, 5]
  const heed = takeHeed(base, { onChange })

  assert.deepEqual(heed, [1, 2, 3, 4, 5])
  assert.is(status.changes, 0)

  heed.reverse()
  await breathe()

  assert.deepEqual(heed, [5, 4, 3, 2, 1])
  assert.is(status.changes, 1)
})

test('takeHeed on Object.assign calls onChange', async (assert) => {
  const { onChange, status } = getChangeCb()
  const base = { a: 1, b: 2 }
  const heed = takeHeed(base, { onChange })

  assert.deepEqual(heed, { a: 1, b: 2 })
  assert.is(status.changes, 0)

  Object.assign(heed, { b: 3, c: 4 })
  await breathe()

  assert.deepEqual(heed, { a: 1, b: 3, c: 4 })
  assert.is(status.changes, 1)
})

test('takeHeed on Object.defineProperties calls onChange', async (assert) => {
  const { onChange, status } = getChangeCb()
  const base = { a: 1, b: 2 }
  const heed = takeHeed(base, { onChange })

  assert.deepEqual(heed, { a: 1, b: 2 })
  assert.is(status.changes, 0)

  Object.defineProperties(heed, {
    b: { value: 3, enumerable: true, configurable: true, writable: true },
    c: { value: 4, enumerable: true, configurable: true, writable: true }
  })
  await breathe()

  assert.deepEqual(heed, { a: 1, b: 3, c: 4 })
  assert.is(status.changes, 1)
})

test('takeHeed on nested object property change maintains the proxy', async (assert) => {
  const { onChange, status } = getChangeCb()
  const base = { child: { grandChild: { prop: 'old' } } }
  const heed = takeHeed(base, { onChange })
  const checks = common(assert, base, heed, status)

  assert.is(heed.child.grandChild.prop, 'old')
  checks(0, undefined, undefined)

  heed.child.grandChild = { prop: 'new' }
  await breathe()

  assert.is(heed.child.grandChild.prop, 'new')
  checks(1, 'grandChild', ['child', 'grandChild'])

  heed.child.grandChild.prop = 'newer'
  await breathe()

  assert.is(heed.child.grandChild.prop, 'newer')
  checks(2, 'prop', ['child', 'grandChild', 'prop'])
})

test('takeHeed on nested array item change maintains the proxy', async (assert) => {
  const { onChange, status } = getChangeCb()
  const base = [[['old']]]
  const heed = takeHeed(base, { onChange })
  const checks = common(assert, base, heed, status)

  assert.is(heed[0][0][0], 'old')
  checks(0, undefined, undefined)

  heed[0][0] = ['new']
  await breathe()

  assert.is(heed[0][0][0], 'new')
  checks(1, '0', ['0', '0'])

  heed[0][0][0] = 'newer'
  await breathe()

  assert.is(heed[0][0][0], 'newer')
  checks(2, '0', ['0', '0', '0'])
})
