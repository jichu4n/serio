import iconv from 'iconv-lite';
import {SmartBuffer} from 'smart-buffer';
import {DeserializeOptions, SerializeOptions} from './serializable';
import {SerializableWrapper} from './serializable-wrapper';

/** Serializable wrapper class for null-terminated strings. */
export class SStringNT extends SerializableWrapper<string> {
  value: string = '';
  /** Fixed serialized size, or undefined if dynamically sized. */
  readonly length?: number;

  deserialize(buffer: Buffer, opts?: DeserializeOptions): number {
    let reader: SmartBuffer;
    let readOffset: number;
    if (this.length) {
      reader = SmartBuffer.fromBuffer(buffer.subarray(0, this.length));
      this.value = decodeString(reader.readBufferNT(), opts);
      readOffset = reader.length;
    } else {
      reader = SmartBuffer.fromBuffer(buffer);
      this.value = decodeString(reader.readBufferNT(), opts);
      readOffset = reader.readOffset;
    }
    return readOffset;
  }

  serialize(opts?: SerializeOptions): Buffer {
    const encodedValue = encodeString(this.value, opts);
    let writer: SmartBuffer;
    if (this.length) {
      writer = SmartBuffer.fromBuffer(Buffer.alloc(this.length));
      writer.writeBufferNT(encodedValue.subarray(0, this.length - 1));
    } else {
      writer = new SmartBuffer();
      writer.writeBufferNT(encodedValue);
    }
    return writer.toBuffer();
  }

  getSerializedLength(opts?: SerializeOptions): number {
    return this.length || encodeString(this.value, opts).length + 1;
  }

  /** Returns a SStringNT class that has a fixed serialized size. */
  static ofLength(length: number) {
    if (length < 0 || (length | 0) !== length) {
      throw new Error(`Invalid length ${length}`);
    }
    return class extends SStringNT {
      length = length;
    };
  }
}

/** Serializable wrapper class for non-null-terminated strings. */
export class SString extends SerializableWrapper<string> {
  value: string = '';
  /** Fixed serialized size, or undefined if dynamically sized. */
  length?: number;

  deserialize(buffer: Buffer, opts?: DeserializeOptions): number {
    if (this.length) {
      buffer = buffer.subarray(0, this.length);
    }
    this.value = decodeString(buffer, opts);
    return buffer.length;
  }

  serialize(opts?: SerializeOptions): Buffer {
    const encodedValue = encodeString(this.value, opts);
    let writer: SmartBuffer;
    if (this.length) {
      writer = SmartBuffer.fromBuffer(Buffer.alloc(this.length));
      writer.writeBuffer(encodedValue.subarray(0, this.length));
    } else {
      writer = new SmartBuffer();
      writer.writeBuffer(encodedValue);
    }
    return writer.toBuffer();
  }

  getSerializedLength(opts?: SerializeOptions): number {
    return this.length || encodeString(this.value, opts).length;
  }

  /** Returns a SStringNT class that has a fixed serialized size. */
  static ofLength(length: number) {
    if (length < 0 || (length | 0) !== length) {
      throw new Error(`Invalid length ${length}`);
    }
    return class extends SString {
      length = length;
    };
  }
}

/** Default text encoding used by this library. */
let defaultEncoding = 'utf-8';

/** Set the default text encoding used by this library.
 *
 * Available list of encodings:
 * https://github.com/ashtuchkin/iconv-lite/wiki/Supported-Encodings
 */
export function setDefaultEncoding(encoding: string) {
  if (!iconv.encodingExists(encoding)) {
    throw new Error(`Unknown text encoding: '${encoding}'`);
  }
  defaultEncoding = encoding;
}

/** Returns the default text encoding used by this library. */
export function getDefaultEncoding() {
  return defaultEncoding;
}

/** Helper for getting the encoding from DeserializeOptions / SerializeOptions. */
function getEncodingOrDefault(opts?: DeserializeOptions | SerializeOptions) {
  const encoding = opts?.encoding ?? defaultEncoding;
  if (!iconv.encodingExists(encoding)) {
    throw new Error(`Unknown text encoding: '${encoding}'`);
  }
  return encoding;
}

/** Shorthand for decoding a buffer to string given ParseOptions. */
export function decodeString(
  buffer: Buffer,
  opts?: DeserializeOptions
): string {
  return iconv.decode(buffer, getEncodingOrDefault(opts));
}

/** Shorthand for encoding a string to buffer given SerializeOptions. */
export function encodeString(s: string, opts?: SerializeOptions): Buffer {
  return iconv.encode(s, getEncodingOrDefault(opts));
}
