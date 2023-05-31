# heedful

> Observe nested changes on (almost) anything

## install

```sh
$ npm install --save heedful
```

## usage

```js
import { takeHeed } from 'heedful'

const onChange = (changeData) => console.log(JSON.stringify(changeData, null, 2))

const baseObject = { child: { array: [{ nested: 'deep' }] } }
const observed = takeHeed(baseObject, { onChange })

observed.child.array[0].mad = 'deep'
/* LOGGED TO CONSOLE
{
  "property": "mad",
  "target": {
    "child": {
      "array": [
        {
          "nested": "deep",
          "mad": "deep"
        }
      ]
    }
  },
  "source": {
    "nested": "deep",
    "mad": "deep"
  },
  "chain": [
    "child",
    "array",
    "0",
    "mad"
  ]
}
*/
```

## License

MIT © [Andrew Carpenter](https://github.com/doesdev)
