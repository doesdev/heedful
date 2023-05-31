const PROXIED = Symbol('isProxied')
const PARENT = Symbol('parent')
const PARENT_KEY = Symbol('parentKey')
const ON_CHANGE = Symbol('onChange')

const EMPTY = { [null]: true, [undefined]: true }

const DEFINE_AS = { writable: false, enumerable: false, configurable: false }

const PRIMITIVE = {
  boolean: true,
  null: true,
  undefined: true,
  number: true,
  string: true,
  symbol: true
}

const nextTick = (fn) => setTimeout(fn, 0)

const changeQueue = new Map()

const bubbler = (target, property, chain = [property]) => {
  const parent = target[PARENT] || {}

  if (!parent[ON_CHANGE]) return { target, chain }
  if (target[PARENT_KEY]) chain.unshift(target[PARENT_KEY])

  return bubbler(parent, null, chain)
}

export const takeHeed = (obj, opts = {}) => {
  const { onChange, parent, parentKey } = opts

  if (EMPTY[obj] || obj[PROXIED] || PRIMITIVE[typeof obj]) return obj
  if (opts.clone) obj = JSON.parse(JSON.stringify(obj))

  Object.defineProperties(obj, {
    [PROXIED]: { value: true, ...DEFINE_AS },
    [PARENT]: { value: parent, ...DEFINE_AS },
    [PARENT_KEY]: { value: parentKey, ...DEFINE_AS },
    [ON_CHANGE]: { value: onChange, ...DEFINE_AS }
  })

  const changed = ({ target: targetIn, property }) => {
    const { target, chain } = bubbler(targetIn, property)
    const targetCb = target[ON_CHANGE] || (() => { })
    const cbArgs = { property, target, source: targetIn, chain }

    changeQueue.set(target, () => targetCb(cbArgs))

    nextTick(() => {
      const cb = changeQueue.get(target)

      if (!cb) return
      if (typeof cb === 'function') cb()

      changeQueue.delete(target)
    })
  }

  const handlers = {
    defineProperty (target, property, descriptor) {
      const result = Reflect.defineProperty(target, property, descriptor)
      changed({ trap: 'defineProperty', target, property })
      return result
    },

    deleteProperty (target, property) {
      const result = Reflect.deleteProperty(target, property)
      changed({ trap: 'deleteProperty', target, property })
      return result
    },

    set (target, property, valueIn, receiver) {
      const heedOpts = { ...opts, parent: target, parentKey: property }
      const value = takeHeed(valueIn, heedOpts)
      const result = Reflect.set(target, property, value, receiver)
      changed({ trap: 'set', target, property })
      return result
    }
  }

  Object.keys(obj).forEach((prop) => {
    const descriptor = Object.getOwnPropertyDescriptor(obj, prop)
    const value = takeHeed(obj[prop], { ...opts, parent: obj, parentKey: prop })
    Object.defineProperty(obj, prop, { ...descriptor, value })
  })

  const proxy = new Proxy(obj, handlers)

  return proxy
}
