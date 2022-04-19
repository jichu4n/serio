import iconv from 'iconv-lite';
import {SmartBuffer} from 'smart-buffer';
import {DeserializeOptions, SerializableWrapper, SerializeOptions} from '.';

/** Serializable wrapper class for null-terminated strings. */
export class SStringNT extends SerializableWrapper<string> {
  value: string = '';

  deserialize(buffer: Buffer, opts?: DeserializeOptions): number {
    const reader = SmartBuffer.fromBuffer(buffer);
    this.value = decodeString(reader.readBufferNT(), opts);
    return reader.readOffset;
  }

  serialize(opts?: SerializeOptions): Buffer {
    const writer = new SmartBuffer();
    writer.writeBufferNT(encodeString(this.value, opts));
    return writer.toBuffer();
  }

  getSerializedLength(opts?: SerializeOptions): number {
    return encodeString(this.value, opts).length + 1;
  }

  toJSON() {
    return this.value;
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
