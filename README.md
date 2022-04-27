# serio

Fluent binary serialization / deserialization in TypeScript.

If you need to work with binary protocols and file formats, or manipulate C/C++
`struct`s and arrays from TypeScript, this library is for you. It provides an
ergonomic object-oriented framework for defining TypeScript classes that can
serialize and deserialize to binary formats.

## Quickstart

### Installation

```
npm install --save serio
```

Make sure to enable the following settings in your `tsconfig.json`:

```json
"experimentalDecorators": true,
"emitDecoratorMetadata": true,
```

### Basic usage

```ts
import {SObject, SUInt32LE, field} from serio;

/** A class that maps to the following C struct:
 *
 *     struct Position {
 *         uint32_t x;
 *         uint32_t y;
 *     };
 */
class Position extends SObject {
  @field.as(SUInt32LE)
  x = 0;
  @field.as(SUInt32LE)
  y = 0;

  // Properties without a decorator are ignored for serialization.
  foo = 100;
}


// Create instance with default values:
const pos1 = new Position();
// ...or with a set of initial values (can be partial):
const pos2 = Position.with({x: 5, y: 0});
// ...or by deserializing from an existing Buffer:
const pos3 = Position.from(buffer.slice(...));


// Fields can be manipulated normally:
pos1.x = 5;
pos1.y = pos1.x + 10;


// Serialize to Buffer:
const buf = pos1.serialize(); // => Buffer
// Get the byte size of the instance's serialized form:
const size = pos1.getSerializedLength();  // => 8
// Deserialize into an existing instance, returning number of bytes red
const bytesRead = pos1.deserialize(buffer.slice(...));  // => 8
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
const obj2 = X.from(buffer.slice(...));

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
const v3 = SUInt32LE.from(buffer.slice(...));

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
const str3 = SStringNT.from(buffer.slice(...));
// ...by decoding from a buffer using a different encoding:
const str4 = SStringNT.from(buffer.slice(...), {encoding: 'gb2312'});

// Manipulate the wrapped value:
str1.value = 'foo bar';

// Serialize to a Buffer using the default encoding (UTF-8):
const buf1 = str1.serialize();
// ...or using a different encoding:
const buf2 = str1.serialize({encoding: 'win1251'});
// Deserialize from a Buffer using the default encoding:
str1.deserialize(buffer.slice(...));
// ...or using a different encoding:
str1.deserialize(buffer.slice(...), {encoding: 'win1251'});

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
const str3 = SStringNT.ofLength(5).from(buffer.slice(...));

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
const arr3 = SArray.ofLength(5, () => SUInt32LE.of(42));
// ...by decoding from a buffer:
const arr4 = SArray.ofLength(5, () => SUInt32LE.of(0)).from(buffer);

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

`SArray` can also be combined with wrappers such as `SUInt32LE` and `SStringNT`
to make it easier to work with arrays of numbers, strings or other raw values.
Since `SArray` is itself a wrapper class for arrays, This mechanism also makes
it easy to work with multi-dimensional arrays. For example:

```ts
// Create an SArray equivalent to uint8_t[5], initialized to 0.
const arr1 = SArray.as(SUInt8).ofLength(5, 0);
console.log(arr1.value); // [0, 0, 0, 0, 0]

// Create an SArray equivalent to uint8_t[5], with initial values.
const arr2 = SArray.as(SUInt8).ofLength(5, (idx) => idx);
console.log(arr2.value); // [0, 1, 2, 3, 4]

// Create an SArray of strings from an existing array:
const arr3 = SArray.as(SStringNT.ofLength(10)).of(['hello', 'foo', 'bar']);
console.log(arr3.value); // 'hello', 'foo', 'bar'

// Create a 3x3 2-D SArray:
const arr4 = SArray.as(SArray.as(SUInt8)).of([
  [0, 0, 0],
  [1, 1, 1],
  [2, 2, 2],
]);
console.log(arr4.value[2][0]); // => 2

// Serialization / deserialization options are passed through to contained elements.
const arr5 = SArray.as(SStringNT).of(['你好', '世界']);
console.log([
  arr5.getSerializedLength(), // => 14
  arr5.getSerializedLength({encoding: 'gb2312'}), // 10
]);
arr5.serialize({encoding: 'gb2312'});
arr5.deserialize(buffer, {encoding: 'gb2312'});
```

## Objects

serio provides the
[`SObject`](https://jichu4n.github.io/serio/classes/SObject.html) class for
defining serializable objects that are conceptually equivalent to C/C++
`struct`s.

To define a serializable object:

1. Create a TypeScript class that derives from
   [`SObject`](https://jichu4n.github.io/serio/classes/SObject.html), i.e.
   `class X extends SObject`.
2. Use the following decorators to annotate class properties that should be
   serialized / deserialized:
   - [`@field prop = X;`](https://jichu4n.github.io/serio/modules.html#field) if the
     property is itself a `Serializable`, such as another object;
   - [`@field.as(WrapperClass) prop = X;`](https://jichu4n.github.io/serio/modules/field.html#as) if the
     property should be wrapped with a `Serializable` wrapper, such as an
     integer or a string.

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
  // This will wrap x using SUInt32LE for serialization / deserialization
  // behind the scenes, but allows it to be manipulated as a normal class
  // property of type number.
  @field.as(SUInt32LE)
  x = 0;

  @field.as(SUInt32LE)
  y = 0;

  // Properties without a decorator are ignored for serialization.
  foo = 100;
}


// Create instance with default values:
const pos1 = new Position();
// ...or with a set of initial values (can be partial):
const pos2 = Position.with({x: 5, y: 0});
// ...or by deserializing from an existing Buffer:
const pos3 = Position.from(buffer.slice(...));


// Fields can be manipulated normally:
pos1.x = 5;
pos1.y = pos1.x + 10;


// Serialize to Buffer:
const buf = pos1.serialize(); // => Buffer
// Get the byte size of the instance's serialized form:
const size = pos1.getSerializedLength();  // => 8
// Deserialize into an existing instance, returning number of bytes red
const bytesRead = pos1.deserialize(buffer.slice(...));  // => 8
```

A more advanced example showing nesting, `@field`, and wrapping getter / setters:

```ts
/** A class that maps to the following C struct:
 *
 *      struct Point {
 *          Position position;
 *          uint8_t color;
 *          char[31] label;
 *      };
 *
 *  ...where `color` is an 8-bit color in the format RRR GG BB (see
 *  https://en.wikipedia.org/wiki/8-bit_color).
 */
class Point {
  // Since Position is itself a Serializable object, we use @field instead
  // of @field.as.
  @field
  position = new Position();

  // We expose red, green and blue component values as separate properties to
  // make them easy to manipulate.
  red = 0;
  green = 0;
  blue = 0;

  // We use @field.as to decorate our getter / setter for `color`, which
  // encodes red / green / blue components as an 8-bit color value in the
  // format RRR GGG BB.
  @field.as(SUInt8)
  get color() {
    return (
      ((this.red & 0x07) << 5) | (this.green & (0x07 << 2)) | (this.blue & 0x03)
    );
  }
  set color(v: number) {
    this.red = (v >> 5) & 0x07;
    this.green = (v >> 2) & 0x07;
    this.blue = v & 0x03;
  }

  @field.as(SStringNT.ofLength(31))
  label = '';
}

// Serialization / deserialization options are passed through to fields.
const obj1 = Point.with({label: '你好'});
obj1.serialize({encoding: 'gb2312'});
obj1.deserialize(buffer, {encoding: 'gb2312'});
```

Example combining objects and arrays:

```ts
class ExampleObject extends SObject {
  // Equivalent C: Point[10]
  @field.as(SArray)
  prop1 = Array(10)
    .fill()
    .map(() => new Point());

  // Equivalent C: uint8_t[10]
  @field.as(SArray.as(SUInt8))
  prop2 = Array(10).fill(0);

  // Equivalent C: char[2][2][10]
  @field.as(SArray.as(SArray.as(SStringNT.ofLength(10))))
  prop3 = [
    ['hello', 'world'],
    ['foo', 'bar'],
  ];
}

// Equivalent C: ExampleObject[5]
const arr1 = SArray.ofLength(5, () => new ExampleObject());
console.log(arr1.value[0].prop3[0][0]); // => 'hello'
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
 * SBitmask.as(wrapper type) produces a base class that serializes
 * to the specified length.
 */
class Color8Bit extends SBitmask.as(SUInt8) {
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
class MyBitmask extends SBitmask.as(SUInt8) {
  @bitfield(1, Boolean)
  flag1 = false;
  @bitfield(2, Boolean)
  flag2 = false;
  @bitfield(6)
  unused = 0;
}

const bm1 = MyBitmask.of(0b11000000);
console.log(bm1.toJSON()); // => {flag1: true, flag2: true, unused: 0}
bm1.flag1 = false;
bm1.serialize(); // => Buffer.of(0b01000000)
```

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
    this.name.deserialize(buffer.slice(1), opts);
    return this.getSerializedLength(opts);
  }
  /** Computes the serialized length of this value. */
  getSerializedLength(opts?: SerializeOptions): number {
    return 1 + this.name.getSerializedLength(opts);
  }

  /** Optionally, define how this class should be JSONified. */
  toJSON() {
    return {x: this.x, name: this.name};
  }
}

// MyType can be constructed like other `Serializable`s:
const obj1 = new MyType();
const obj2 = MyType.from(buffer);

// MyType can be used together with SArray, SObject etc:
const arr1 = SArray.of([new MyType(), new MyType()]);
class SomeObject extends SObject {
  @field
  myType = new MyType();
}
```

To define a class that wraps a raw value, to be used with `@field.as()` and
`SArray.as()`, you can instead extend the
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
}

// MyWrapperType can be constructed similar to other wrappers such as `SInt8`:
const obj1 = new MyWrapperType();
const obj2 = MyWrapperType.from(buffer);
const obj3 = MyWrapperType.of(42);

// MyWrapperType can be used with `SArray.as()` and `@field.as`:
const arr1 = SArray.as(MyWrapperType).of([1, 2, 3]);
class SomeObject extends SObject {
  @field.as(MyWrapperType)
  foo: number = 0;
}
```

## About

serio is distributed under the Apache License v2.
