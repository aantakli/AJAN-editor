# `remove-types`

A small library for transforming TypeScript code into JavaScript code in the least destructive way possible. This library exports a single function whose purpose is to preserve everything else about the code except for the actual TypeScript syntax itself. As a result, things like decorators and class fields should pass straight through without being transformed in any way.

## Usage

```js
import { removeTypes } from 'remove-types';

const original = `
type AnimalType = 'cat' | 'dog';

// An interface for animals (this comment should be removed when transformed)
interface Animal {
  type: AnimalType;
  name: string;
  age: number;
}

class Cat implements Animal {
  type: AnimalType = 'cat';
  name: string;
  age: number;

  constructor(name: string, age: number) {
    // This is the name of the animal (this comment should stay)
    this.name = name;
    this.age = age;
  }
}
`;

console.log(await removeTypes(original));

/*
class Cat {
  type = 'cat';

  constructor(name, age) {
    // This is the name of the animal (this comment should stay)
    this.name = name;
    this.age = age;
  }
}
*/
```

## API

### `removeTypes(code, prettierConfig = true): Promise<string>`

- `code`: A string containing TypeScript code
- `prettierConfig`:

  - defaults to `true`
  - By default, `removeTypes` will run Prettier with a very basic config on the transformed code before returning it. This allows us to clean up some of the "low-hanging" fruit leftover from the Babel transform, e.g. newlines at the beginning or end of the file.
  - If you'd prefer to not run Prettier _at all_, passing `false` will bypass the Prettier pass entirely.
  - If you'd prefer to use your own Prettier configuration, you can pass an object containing [Prettier configuration options](https://prettier.io/docs/en/options.html) and `removeTypes` will use it instead.

- returns `Promise<string>`: a string containing the transformed JavaScript output.

## Acknowledgements

This library is heavily indebted to [cyco130/detype](https://github.com/cyco130/detype) and began as an extraction and refactor of one of its core functions.
