/** Common options to Serializable.deserialize(). */
export interface DeserializeOptions {
  /** Text encoding.
   *
   * Available list of encodings:
   * https://github.com/ashtuchkin/iconv-lite/wiki/Supported-Encodings
   */
  encoding?: string;
}

/** Common options to Serializable.serialize(). */
export interface SerializeOptions {
  /** Text encoding.
   *
   * Available list of encodings:
   * https://github.com/ashtuchkin/iconv-lite/wiki/Supported-Encodings
   */
  encoding?: string;
}

/** A value that can be serialized / deserialized.
 *
 * This is the base class that all serializable types should extend.
 */
export abstract class Serializable {
  /** Deserializes a buffer into this value.
   *
   * @returns Number of bytes read.
   */
  abstract deserialize(buffer: Buffer, opts?: DeserializeOptions): number;
  /** Serializes this value into a buffer. */
  abstract serialize(opts?: SerializeOptions): Buffer;
  /** Computes the serialized length of this value. */
  abstract getSerializedLength(opts?: SerializeOptions): number;

  /** Creates a new instance of this value by deserializing from a buffer. */
  static from<T extends Serializable>(
    this: new () => T,
    buffer: Buffer,
    opts?: DeserializeOptions
  ): T {
    const instance = new this();
    instance.deserialize(buffer, opts);
    return instance;
  }
}
