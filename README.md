# serio

[![NPM Version][npm-version-image]][npm-url]
[![Build Status][build-status-image]][github-url]

Fluent binary serialization / deserialization in TypeScript.

If you need to work with binary protocols and file formats, or manipulate C/C++
`struct`s and arrays from TypeScript, this library is for you. It provides an
ergonomic API for defining TypeScript classes that can serialize and deserialize
to binary formats.

## Quickstart

### Installation

```
npm install --save serio
```

Requirements:

1. TypeScript 5.0 or higher;
2. The `experimentalDecorators` setting should NOT be enabled in `tsconfig.json`.

### Basic usage

```ts
import {SObject, SUInt32LE, field} from serio;

/** An object that maps to the following C struct:
 *
 *     struct Position {
 *         uint32_t x;
 *         uint32_t y;
 *     };
 */
class Position extends SObject {
  @field(SUInt32LE)
  x = 0;
  @field(SUInt32LE)
  y = 0;

  // Properties without the @field() decorator are ignored during serialization
  // and deserialization.
  foo = 100;
}


// Create instance with default values:
const pos1 = new Position();
// ...or with a set of initial values (can be partial):
const pos2 = Position.with({x: 5, y: 0});
// ...or by deserializing from an existing Buffer:
const pos3 = Position.from(buffer.subarray(...));


// Fields can be manipulated normally:
pos1.x = 5;
pos1.y = pos1.x + 10;


// Serialize to Buffer:
const buf = pos1.serialize(); // => Buffer
// Get the byte size of the instance's serialized form:
const size = pos1.getSerializedLength();  // => 8
// Deserialize into an existing instance, returning number of bytes red
const bytesRead = pos1.deserialize(buffer.subarray(...));  // => 8
```

## Serializable

[`Serializable`](https://jichu4n.github.io/serio/classes/Serializable.html) is
the base class that all serializable values (such as `SUInt8` and `SObject`)
derive from. It provides a common interface for basic operations such as
creating, serializing and deserializing values.

Example usage of a `Serializable` class `X`:

```ts
// Create an instance using default values:
const obj1 = new X();
// Create an instance by decoding from Buffer:
const obj2 = X.from(buffer.subarray(...));

// Serialize to Buffer:
const buffer = obj1.serialize(); // => Buffer

// Deserialize from a Buffer into the current instance:
obj2.deserialize(buffer);

// Get the byte size of the instance's serialized form:
const size = obj2.getSerializedLength();
```

## Integers

serio provides a set of `Serializable` wrappers for common integer types.

Example usage:

```ts
// Create an unsigned 32-bit integer in little endian format:
const v1 = new SUInt32LE();
// ...with an initial value:
const v2 = SUInt32LE.of(100);
// ...by decoding from a Buffer:
const v3 = SUInt32LE.from(buffer.subarray(...));

// Manipulate the wrapped value:
v1.value = 100;
v2.value = v1.value * 10;

// Serialize / deserialize:
const buffer = v1.serialize(); // => Buffer
v2.deserialize(buffer);

const size = v2.getSerializedLength(); // => 4
```

The full list of provided integer types:

|                                 Type                                  | Size (bytes) |  Signed  |  Endianness   |
| :-------------------------------------------------------------------: | :----------: | :------: | :-----------: |
|    [`SUInt8`](https://jichu4n.github.io/serio/classes/SUInt8.html)    |      1       | Unsigned |      N/A      |
|     [`SInt8`](https://jichu4n.github.io/serio/classes/SInt8.html)     |      1       |  Signed  |      N/A      |
| [`SUInt16LE`](https://jichu4n.github.io/serio/classes/SUInt16LE.html) |      2       | Unsigned | Little endian |
|  [`SInt16LE`](https://jichu4n.github.io/serio/classes/SInt16LE.html)  |      2       |  Signed  | Little endian |
| [`SUInt16BE`](https://jichu4n.github.io/serio/classes/SUInt16BE.html) |      2       | Unsigned |  Big endian   |
|  [`SInt16BE`](https://jichu4n.github.io/serio/classes/SInt16BE.html)  |      2       |  Signed  |  Big endian   |
| [`SUInt32LE`](https://jichu4n.github.io/serio/classes/SUInt32LE.html) |      4       | Unsigned | Little endian |
|  [`SInt32LE`](https://jichu4n.github.io/serio/classes/SInt32LE.html)  |      4       |  Signed  | Little endian |
| [`SUInt32BE`](https://jichu4n.github.io/serio/classes/SUInt32BE.html) |      4       | Unsigned |  Big endian   |
|  [`SInt32BE`](https://jichu4n.github.io/serio/classes/SInt32BE.html)  |      4       |  Signed  |  Big endian   |

## Enums

All of the integer wrappers above also support looking up an enum label for
conversion to JSON. For example:

```ts
enum MyType {
  FOO = 0,
  BAR = 1,
}
JSON.stringify(SUInt8.of(0)); // => 0
JSON.stringify(SUInt8.enum(MyType).of(0)); // => "FOO"

class MyObject extends SObject {
  @field(SUInt8.enum(MyType))
  type = MyType.FOO;
}

// Convert to / from JSON:
JSON.stringify(new MyObject()); // => {"type": "FOO"}
JSON.stringify(MyObject.withJSON({type: MyType.FOO})); // => {"type": "FOO"}
JSON.stringify(MyObject.withJSON({type: 'FOO'})); // => {"type": "FOO"}
```

## Strings

serio provides the
[`SStringNT`](https://jichu4n.github.io/serio/classes/SStringNT.html) and
[`SString`](https://jichu4n.github.io/serio/classes/SString.html) classes for
working with string values. Both classes wrap a string value and can have
variable or fixed length. The difference is that `SStringNT` reads and writes
C-style null-terminated strings, whereas `SString` reads and writes string
values without a trailing null type.

These classes uses the [iconv-lite](https://github.com/ashtuchkin/iconv-lite) library under
the hood for encoding / decoding. See
[here](https://github.com/ashtuchkin/iconv-lite/wiki/Supported-Encodings) for
the list of supported encodings.

### Variable-length strings

Example usage:

```ts
// Create a variable-length null-terminated string:
const str1 = new SStringNT();
// ...with an initial value:
const str2 = SStringNT.of('hello world!');
// ...by decoding from a buffer using the default encoding (UTF-8):
const str3 = SStringNT.from(buffer.subarray(...));
// ...by decoding from a buffer using a different encoding:
const str4 = SStringNT.from(buffer.subarray(...), {encoding: 'gb2312'});

// Manipulate the wrapped value:
str1.value = 'foo bar';

// Serialize to a Buffer using the default encoding (UTF-8):
const buf1 = str1.serialize();
// ...or using a different encoding:
const buf2 = str1.serialize({encoding: 'win1251'});
// Deserialize from a Buffer using the default encoding:
str1.deserialize(buffer.subarray(...));
// ...or using a different encoding:
str1.deserialize(buffer.subarray(...), {encoding: 'win1251'});

const size = SStringNT.of('hi').getSerializedLength(); // => 3
const size = SString.of('hi').getSerializedLength(); // => 2
```

If your application uses a non-UTF-8 encoding by default, you can also change the
default encoding used by serio to avoid having to pass `{encoding: 'XX'}`
every time:

```ts
// Default encoding is UTF-8:
const buf1 = str1.serialize();

setDefaultEncoding('cp437');
// ...will now use CP437 if no encoding specified:
const buf1 = str1.serialize();
```

### Fixed sized strings

[SStringNT.ofLength(N)](https://jichu4n.github.io/serio/classes/SStringNT.html#ofLength)
can be used to represent fixed size strings (equivalent to C character arrays
`char[N]`). An instance of `SStringNT.ofLength(N)` will zero pad / truncate the
raw data to size N during serialization and deserialization.

Example usage:

```ts
// Create a fixed size null-terminated string:
const str1 = new (SStringNT().ofLength(5))();
// ...with an initial value:
const str2 = SStringNT.ofLength(5).of('hello world!');
// ...by decoding from a buffer using the default encoding (UTF-8):
const str3 = SStringNT.ofLength(5).from(buffer.subarray(...));

// Manipulate the wrapped value:
str1.value = 'foo bar';

// Fixed size strings will zero-pad up to its specified size for serialization
// / deserialization:
const str1 = new (SStringNT.ofLength(3))();
console.log(str1.value); // =>  ''
const buf1 = str1.serialize(); // => '\x00\x00\x00'
const size1 = str1.getSerializedLength(); // => 3
str1.value = 'A';
const buf2 = str1.serialize(); // => 'A\x00\x00'
const size2 = str1.getSerializedLength(); // => 3

// Fixed size strings will truncate values down to its specified size for
// serialization / deserialization:
const str2 = SStringNT.ofLength(3).of('hello');
console.log(str2.value); // => 'hello'
str2.serialize(); // => 'he\x00'
str2.getSerializedLength(); // => 3
str2.deserialize(Buffer.from('hello', 'utf-8'));
console.log(str2.value); // => 'hel'

// SString works similarly but does not write a trailing null byte.
const str3 = SString.ofLength(3).of('hello');
console.log(str3.value); // => 'hello'
str3.serialize(); // => 'hel'
str3.getSerializedLength(); // => 3
str3.deserialize(Buffer.from('hello', 'utf-8'));
console.log(str3.value); // => 'hel'
```

## Arrays

serio provides the
[`SArray`](https://jichu4n.github.io/serio/classes/SArray.html) class for
working with array values. An `SArray` instance can wrap an array of other
`Serializables`, including `SObject`s and other `SArray`s:

```ts
// Create an empty SArray object:
const arr1 = new SArray<SUInt32LE>();
// ...with an initial set of values:
const arr2 = SArray.of([obj1, obj2, obj3]);
// ...with an element value repeated N times:
const arr3 = SArray.of(_.times(5, () => SUInt32LE.of(0)));

// The underlying array can be manipulated via the `value` property:
arr1.value.forEach(...);
arr1.value = [obj1, obj2];


// Serialize to Buffer:
const buf1 = arr1.serialize();

// Deserialize from a Buffer into the current elements in `value`:
arr1.deserialize(buffer);

// Returns the total serialized length of all elements in `value`:
const size = arr1.getSerializedLength();
```

To wrap arrays of numbers, strings, and other raw values, `SArray` can be
combined with wrapper classes such as `SUInt32LE` and `SStringNT` using
`SArray.of(wrapperClass)`. To wrap multi-dimensional arrays, multiple levels of
`SArray`s can be created using `SArray.of(SArray.of(...))`. For example:

```ts
// Create an SArray equivalent to uint8_t[3], initialized to 0.
const arr1 = SArray.of(SUInt8).of([0, 0, 0]);
console.log(arr1.value); // [0, 0, 0]
console.log(arr1.serialize()); // Buffer.of(0, 0, 0)

// Create an SArray of strings from an existing array:
const arr3 = SArray.of(SStringNT.ofLength(10)).of(['hello', 'foo', 'bar']);
console.log(arr3.value); // 'hello', 'foo', 'bar'

// Create a 3x3 2D SArray:
const arr4 = SArray.of(SArray.of(SUInt8)).of([
  [0, 0, 0],
  [1, 1, 1],
  [2, 2, 2],
]);
console.log(arr4.value[2][0]); // => 2

// Serialization / deserialization options are passed through to contained elements.
const arr5 = SArray.of(SStringNT).of(['你好', '世界']);
console.log([
  arr5.getSerializedLength(), // => 14
  arr5.getSerializedLength({encoding: 'gb2312'}), // 10
]);
arr5.serialize({encoding: 'gb2312'});
arr5.deserialize(buffer, {encoding: 'gb2312'});
```

### Fixed sized arrays

[`SArray.ofLength(N,
elementType)`](https://jichu4n.github.io/serio/classes/SArray.html#ofLength) and
[`SArray.of(wrapperType).ofLength(N)`](https://jichu4n.github.io/serio/classes/SArrayWithWrapper.html#ofLength)
can be used to represent fixed size arrays, equivalent to C arrays
(`elementType[N]`). An instance of `SArray.ofLength(N, elementType)` or
`SArray.of(wrapperType).ofLength(N)` will pad / truncate the array to size N
during serialization and deserialization.

Example usage:

```ts
// Create a fixed size array equivalent to uint8_t[3], initialized to 0.
const arr1 = new (SArray.of(SUInt8).ofLength(3))();
console.log(arr1.value); // [0, 0, 0]

// Extra elements are ignored during serialization.
arr1.value = [1, 2, 3, 4, 5];
console.log(arr1.getSerializedLength()); // 3
console.log(arr1.toJSON()); // [1, 2, 3]
console.log(arr1.serialize()); // Buffer.of([1, 2, 3]);
// Extra elements are preserved as-is during deserialization.
arr1.deserialize(Buffer.of(6, 7, 8, 9, 10));
console.log(arr1.value); // [6, 7, 8, 4, 5]
console.log(arr1.serialize()); // Buffer.of([6, 7, 8]);

// Missing elements are padded with default values during serialization.
arr1.value = [];
console.log(arr1.getSerializedLength()); // 3
console.log(arr1.serialize()); // Buffer.of([0, 0, 0]);
// Missing elements are added during deserialization.
arr1.deserialize(Buffer.of(101, 102, 103));
console.log(arr1.value); // [101, 102, 103]
```

To create / update nested `SObject`s and `SArray`s with JSON / POJO values, use
`ofJSON()` and `assignJSON()`:

```ts
const arr = SArray.ofLength(3, MyObject).ofJSON([{...}, {...}, {...}]);
arr.assignJSON([{prop1: '...'}, {...}, {...}]);
```

## Objects

serio provides the
[`SObject`](https://jichu4n.github.io/serio/classes/SObject.html) class for
defining serializable objects that are conceptually equivalent to C/C++
`struct`s.

To define a serializable object:

1. Define a class that extends
   [`SObject`](https://jichu4n.github.io/serio/classes/SObject.html).
2. Use the [`@field()`
   decorator](https://jichu4n.github.io/serio/functions/field.html) to annotate
   class properties that should be serialized / deserialized:
   - `@field() prop = X;` if the property is itself a `Serializable`, such as
     another object;
   - `@field(WrapperClass) prop = X;` if the property should be wrapped with a
     `Serializable` wrapper, such as an integer or a string.

Basic example:

```ts
/** A class that maps to the following C struct:
 *
 *     struct Position {
 *         uint32_t x;
 *         uint32_t y;
 *     };
 */
class Position extends SObject {
  // This will serialize / deserialize x as an SUInt32LE behind the scenes,
  // but allows it to be manipulated as a normal numeric property.
  @field(SUInt32LE)
  x = 0;

  @field(SUInt32LE)
  y = 0;

  // Undecorated object properties are ignored during serialization /
  // deserialization, but are included in JSON output by default.
  // Use `@json(false)` to exclude them.
  @json(false)
  foo = 100;

  // Computed properties are excluded from JSON output by default. Use
  // `@json(true)` to include them.
  @json(true)
  get distFromOrigin() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }
}

// Create instance with default values:
const pos1 = new Position();
// ...or with a set of initial values (can be partial):
const pos2 = Position.with({x: 5, y: 0});
// ...or by deserializing from an existing Buffer:
const pos3 = Position.from(buffer.subarray(...));

// Fields can be manipulated normally:
pos1.x = 5;
pos1.y = pos1.x + 10;

// Serialize to Buffer:
const buf = pos1.serialize(); // => Buffer
// Get the byte size of the instance's serialized form:
const size = pos1.getSerializedLength();  // => 8
// Deserialize into an existing instance, returning number of bytes red
const bytesRead = pos1.deserialize(buffer.subarray(...));  // => 8
```

A more advanced example showing `@field()` with getter / setters:

```ts
/** A class that implements 8-bit color in the format RRR GG BB (see
 *  https://en.wikipedia.org/wiki/8-bit_color).
 */
class Color extends SObject {
  // We expose red, green and blue component values as separate properties to
  // make them easy to manipulate.
  red = 0;
  green = 0;
  blue = 0;

  // We use @field() to decorate our getter / setter for `color`, which
  // encodes red / green / blue components as an 8-bit color value in the
  // format RRR GGG BB.
  @field(SUInt8)
  // Getters / setters aren't included in JSON output by default. Use
  // `@json(true)` to include them.
  @json(true)
  get value() {
    return (
      ((this.red & 0x07) << 5) | (this.green & (0x07 << 2)) | (this.blue & 0x03)
    );
  }
  set value(v: number) {
    this.red = (v >> 5) & 0x07;
    this.green = (v >> 2) & 0x07;
    this.blue = v & 0x03;
  }
}
```

**Note: Avoid using `@field()` with both regular
properties and getters / setters in the same `SObject` class**. This is due to a
quirk in the ES6 decorator spec: decorator initializers for getters / setters
always run before regular properties, so if a class contains a mixure of
decorated properties and decorated getters / setters, the resulting
serialization order may be different from the declaration order in the
code.

Example combining objects and arrays:

```ts
class ExampleObject extends SObject {
  // Equivalent C: Point[10]
  @field(SArray)
  prop1 = Array(10)
    .fill()
    .map(() => new Point());

  // Equivalent C: uint8_t[10]
  @field(SArray.of(SUInt8))
  prop2 = Array(10).fill(0);

  // Equivalent C: char[2][2][10]
  @field(SArray.of(SArray.of(SStringNT.ofLength(10))))
  prop3 = [
    ['hello', 'world'],
    ['foo', 'bar'],
  ];
}

// Equivalent C: ExampleObject[5]
const arr1 = SArray.of(_.times(5, () => new ExampleObject()));
console.log(arr1.value[0].prop3[0][0]); // => 'hello'
```

To create / update nested `SObject`s and `SArray`s with JSON / POJO values, use
`withJSON()` and `assignJSON()`:

```ts
class Segment extends SObject {
  @field()
  p1 = new Point();
  @field()
  p2 = new Point();
}
// Create nested SObject's from JSON / POJO value:
const s2 = Segment.withJSON({
  p1: {x: 1, y: 1},
  p2: {x: 2, y: 2},
});
// The above is equivalent to:
// const s1 = Segment.with({
//   p1: Point.with({x: 1, y: 1}),
//   p2: Point.with({x: 2, y: 2}),
// });

// Perform partial update on nested SObject with JSON / POJO value:
s2.assignJSON({p2: {x: 10}});
console.log(s2.toJSON()); // => {p1: {x: 1, y: 1}, p2: {x: 10, y: 2}}
```

## Bitmasks

serio provides the
[`SBitmask`](https://jichu4n.github.io/serio/classes/SBitmask.html) class for
working with bitmask values that represent the binary OR of several fields. The
interface is similar to `SObject`. Example usage:

```ts
/** An 8-bit color in the format RRR GG BB (see
 * https://en.wikipedia.org/wiki/8-bit_color).
 *
 * SBitmask.of(wrapperClass) produces a base class that serializes
 * to the specified length.
 */
class Color8Bit extends SBitmask.of(SUInt8) {
  // @bitfield(number of bits) is used to annotate the fields that go into the
  // bitmask, from most significant to least significant.
  @bitfield(3)
  r = 0;
  @bitfield(3)
  g = 0;
  @bitfield(2)
  b = 0;
}

const c1 = new Color8Bit();
c1.serialize(); // => Buffer.of(0b00000000)
c1.r = 0b111;
c1.g = 0b001;
c1.serialize(); // => Buffer.of(0b11100100)

const c2 = Color8Bit.with({r: 0b000, g: 0b111, b: 0b01});
c2.serialize(); // => Buffer.of(0b00011101)
console.log(c2.value); // => 0b00011101
c2.value = 0b11100010;
console.log(c2.toJSON()); // => {r: 7, g: 0, b: 2}

c2.deserialize(Buffer.of(0b11111111));
console.log(c2.toJSON()); // => {r: 7, g: 7, b: 3}

const c3 = Color8Bit.of(0b11100010);
console.log(c3.toJSON()); // => {r: 7, g: 0, b: 2}
```

Boolean flags are also supported:

```ts
class MyBitmask extends SBitmask.of(SUInt8) {
  @bitfield(1)
  flag1 = false;
  @bitfield(2)
  flag2 = false;
  @bitfield(6)
  @json(false) // Exclude from JSON output
  unused = 0;
}

const bm1 = MyBitmask.of(0b11000000);
console.log(bm1.toJSON()); // => {flag1: true, flag2: true}
bm1.flag1 = false;
bm1.serialize(); // => Buffer.of(0b01000000)
```

Similar to `@field()`, you can also use `@bitfield()` with getters / setters, but you should avoid using `@bitfield()` with both getters / setters and regular properties in the same class.

## Creating new `Serializable` classes

To define your own `Serializable` classes that can be used with `SArray`, `SObject`
etc, you can extend the
[`Serializable`](https://jichu4n.github.io/serio/classes/Serializable.html)
abstract class and provide the required method implementations:

```ts
class MyType extends Serializable {
  x = 0;
  name = SStringNT.ofLength(32);

  /** Serializes this value into a buffer. */
  serialize(opts?: SerializeOptions): Buffer {
    const buffer = Buffer.alloc(this.getSerializedLength(opts));
    buffer.writeUInt8(this.x, 0);
    this.name.serialize(opts).copy(buffer, 1);
    return buffer;
  }
  /** Deserializes a buffer into this value. */
  deserialize(buffer: Buffer, opts?: DeserializeOptions): number {
    this.x = buffer.readUInt8(0);
    this.name.deserialize(buffer.subarray(1), opts);
    return this.getSerializedLength(opts);
  }
  /** Computes the serialized length of this value. */
  getSerializedLength(opts?: SerializeOptions): number {
    return 1 + this.name.getSerializedLength(opts);
  }

  /** Optionally, define how to convert this value to JSON.
   *
   * SObject.toJSON() and SArray.toJSON() will recursively invoke the toJSON()
   * method of their elements.
   */
  toJSON() {
    return {x: this.x, name: this.name};
  }

  /** Optionally, define how to parse / hydrate this value from JSON.
   *
   * SObject.assignJSON() and SArray.assignJSON() will recursively invoke the
   * assignJSON() method of their elements.
   */
  assignJSON(jsonValue: {x: string; name: string}) {
    this.x = jsonValue.x;
    this.name = jsonValue.name;
  }
}

// MyType can be constructed like other `Serializable`s:
const obj1 = new MyType();
const obj2 = MyType.from(buffer);

// MyType can be used together with SArray, SObject etc:
const arr1 = SArray.of([new MyType(), new MyType()]);
class SomeObject extends SObject {
  @field()
  myType = new MyType();
}
```

To define a class that wraps a raw value, to be used with `@field()` and
`SArray.of()`, you can instead extend the
[`SerializableWrapper`](https://jichu4n.github.io/serio/classes/SerializableWrapper.html)
class:

```ts
/** An example class that wraps a number. */
class MyWrapperType extends SerializableWrapper<number> {
  // A SerializableWrapper must have a `value` property that represents the raw
  // value to be wrapped.
  value = 0;

  // Define `serialize()`, `deserialize()` and `getSerializedLength()` as above
  serialize(opts?: SerializeOptions): Buffer {
    /* ... */
  }
  deserialize(buffer: Buffer, opts?: DeserializeOptions): number {
    /* ... */
  }
  getSerializedLength(opts?: SerializeOptions): number {
    /* ... */
  }
  // Define `toJSON()` and `assignJSON()` as above
  toJSON() {
    /* ... */
  }
  assignJSON(jsonValue: unknown) {
    /* ... */
  }
}

// MyWrapperType can be used in the same way as built-in wrappers such as `SInt8`:
const obj1 = new MyWrapperType();
const obj2 = MyWrapperType.from(buffer);
const obj3 = MyWrapperType.of(42);

// MyWrapperType can be used with `SArray.of()` and `@field()`:
const arr1 = SArray.of(MyWrapperType).of([1, 2, 3]);
class SomeObject extends SObject {
  @field(MyWrapperType)
  foo: number = 0;
}
```

## About

serio is distributed under the Apache License v2.

## Changelog

### 2.0

- New APIs to simplify the construction of nested `SObject`s and `SArray`s from
  JSON / POJO values:
  - Introduce the `assignJSON()` method to most `Serializable` classes as a
    canonical method for hydrating a `Serializable` from a JSON / POJO value.
  - Introduce `SObject.withJSON()` and `SArrayWithWrapper.ofJSON()`, allowing inline
    construction of nested `SObject`s and `SArray`s from JSON / POJO values.
- New API for converting `SObject`s and `SBitmask`s to JSON / POJO values:
  - Introduce the `@json(boolean)` decorator to control whether a field should
    appear in the output of `toJSON()` without having to override the latter.
- Breaking changes:
  - `SObject.assignFromSerializable()` has been renamed to
    `SObject.assignSerializableMap()` for consistency with `assignJSON()`, and
    passing in unknown properties in the argument will now throw an error instead
    of being silently ignored.
  - `SObject.mapValuesToSerializable()` has been renamed to
    `SObject.toSerializableMap()` for consistency with `toJSON()`.
  - `SBitmask.toJSON()` previously only returned fields decorated with
    `@bitfield()`. Its behavior has been updated to be consistent with
    `SObject.toJSON()`: it now returns all properties on the object, with
    support for field-level control with `@json(boolean)`.

[npm-url]: https://npmjs.org/package/serio
[npm-version-image]: https://badgen.net/npm/v/serio
[github-url]: https://github.com/jichu4n/serio
[build-status-image]: https://github.com/jichu4n/serio/actions/workflows/build.yaml/badge.svg
