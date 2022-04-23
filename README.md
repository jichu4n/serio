# serio

Smart binary serialization in TypeScript.

If you need to work with binary protocols and file formats, or manipulate
C/C++ `struct`s and arrays from TypeScript, this library is for you. It
provides an ergonomic, object-oriented framework for defining TypeScript classes
that can serialize and deserialize to binary formats.

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
import {SObject, SUInt32LE, serializeAs} from serio;

/** A class that maps to the following C struct:
 *
 *     struct Position {
 *         uint32_t x;
 *         uint32_t y;
 *     };
 */
class Position extends SObject {
  @serializeAs(SUInt32LE)
  x = 0;
  @serializeAs(SUInt32LE)
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


// Properties can be manipulated normally:
pos1.x = 5;
pos1.y = pos1.x + 10;


// Serialize to Buffer:
const buf = pos1.serialize(); // => Buffer
// Get the byte size of the instance's serialized form:
const size = pos1.getSerializedLength();  // => 8
// Deserialize into an existing instance, returning number of bytes red
const bytesRead = pos1.deserialize(buffer.slice(...));  // => 8
```

## Documentation

### Serializable

This is the base class that all serializable values (such as `SUInt8` and
`SObject`) derive from. It provides a common interface for
basic operations such as creating, serializing and deserializing values.

Example usage of any `Serializable` implementation `X`:

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

### Integers

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

|    Type     | Size (bytes) |  Signed  |  Endianness   |
| :---------: | :----------: | :------: | :-----------: |
|  `SUInt8`   |      1       | Unsigned |      N/A      |
|   `SInt8`   |      1       |  Signed  |      N/A      |
| `SUInt16LE` |      2       | Unsigned | Little endian |
| `SInt16LE`  |      2       |  Signed  | Little endian |
| `SUInt16BE` |      2       | Unsigned |  Big endian   |
| `SInt16BE`  |      2       |  Signed  |  Big endian   |
| `SUInt32LE` |      4       | Unsigned | Little endian |
| `SInt32LE`  |      4       |  Signed  | Little endian |
| `SUInt32BE` |      4       | Unsigned |  Big endian   |
| `SInt32BE`  |      4       |  Signed  |  Big endian   |

### Strings

serio provides wrappers for string types. It uses the
[iconv-lite](https://github.com/ashtuchkin/iconv-lite) library for encoding /
decoding text in various character sets.

#### Variable-length strings

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

#### Fixed sized strings

Fixed size strings are equivalent to C character arrays (`char[N]`) and will
zero pad or truncate data to a fixed size during serialization and
deserialization.

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
const buf1 = str2.serialize(); // => 'he\x00'
const size2 = str2.getSerializedLength(); // => 3
str2.deserialize(Buffer.from('hello', 'utf-8'));
console.log(str2.value); // => 'hel'
```

### Arrays

serio provides an `SArray` class for working with array values. An `SArray`
instance can wrap an array of other `Serializables`:

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
to directly work with arrays of numbers, strings or other raw values. This
wrapping mechanism also allows for nested arrays. For example:

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

### Objects

serio provides a base class `SObject` and a set of decorators for defining
serializable objects (i.e. C/C++ `struct`s).

To define a serializable object:

1. Create a normal TypeScript class that derives from `SObject`, i.e. `class X extends SObject`.
2. Use decorators to annotate class properties that should be serialized /
   deserialized:
   - Use `@serialize` if the property is itself a `Serializable`, such as a
     nested object;
   - Use `@serializeAs(WrapperClass)` if the property should be wrapped with a
     `Serializable` wrapper, such as an integer or a string.

Example showing wrapping numeric values with `@serializeAs`:

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
	@serializeAs(SUInt32LE)
	x = 0;

	@serializeAs(SUInt32LE)
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


// Properties can be manipulated normally:
pos1.x = 5;
pos1.y = pos1.x + 10;


// Serialize to Buffer:
const buf = pos1.serialize(); // => Buffer
// Get the byte size of the instance's serialized form:
const size = pos1.getSerializedLength();  // => 8
// Deserialize into an existing instance, returning number of bytes red
const bytesRead = pos1.deserialize(buffer.slice(...));  // => 8
```

Advanced example showing nesting, `@serialize`, and wrapping getter / setters:

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
  // Since Position is itself a Serializable object, we use @serialize instead
  // of @serializeAs.
  @serialize
  position = new Position();

  // We expose red, green and blue component values as separate properties to
  // make them easy to manipulate.
  red = 0;
  green = 0;
  blue = 0;

  // We use @serializeAs to decorate our getter / setter for `color`, which
  // encodes red / green / blue components as an 8-bit color value in the
  // format RRR GGG BB.
  @serializeAs(SUInt8)
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

  @serializeAs(SStringNT.ofLength(31))
  label = '';
}

// Serialization / deserialization options are passed through to properties.
const obj1 = Point.with({label: '你好'});
obj1.serialize({encoding: 'gb2312'});
obj1.deserialize(buffer, {encoding: 'gb2312'});
```

Example combining objects and arrays:

```ts
class ExampleObject extends SObject {
  // Equivalent C: Point[10]
  @serializeAs(SArray)
  prop1 = Array(10)
    .fill()
    .map(() => new Point());

  // Equivalent C: uint8_t[10]
  @serializeAs(SArray.as(SUInt8))
  prop2 = Array(10).fill(0);

  // Equivalent C: char[2][2][10]
  @serializeAs(SArray.as(SArray.as(SStringNT.ofLength(10))))
  prop3 = [
    ['hello', 'world'],
    ['foo', 'bar'],
  ];
}

// ExampleObject[5]
const arr1 = SArray.ofLength(5, () => new ExampleObject());
console.log(arr1.value[0].prop3[0][0]); // => 'hello'
```

## About

serio is distributed under the Apache License v2.
