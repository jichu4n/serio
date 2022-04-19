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
 * This is the base interface that all serializable types should implement.
 */
export interface Serializable {
  /** Deserializes a buffer into this value.
   *
   * @returns Number of bytes read.
   */
  deserialize(buffer: Buffer, opts?: DeserializeOptions): number;
  /** Serializes this value into a buffer. */
  serialize(opts?: SerializeOptions): Buffer;
  /** Computes the serialized length of this value. */
  getSerializedLength(opts?: SerializeOptions): number;
}
