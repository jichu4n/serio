import {DeserializeOptions, SerializeOptions} from './serializable';
import {SerializableWrapper} from './serializable-wrapper';

/** No-op Serializable implementation that serializes to / from Buffers. */
export class SBuffer extends SerializableWrapper<Buffer> {
  value: Buffer = Buffer.alloc(0);

  deserialize(buffer: Buffer) {
    this.value = Buffer.alloc(buffer.length);
    buffer.copy(this.value);
    return this.value.length;
  }

  serialize() {
    return this.value;
  }

  getSerializedLength() {
    return this.value.length;
  }

  assignJSON(
    jsonValue: {data: Array<number>; type: 'Buffer'} | Array<number> | Buffer
  ) {
    if (Buffer.isBuffer(jsonValue)) {
      this.value = jsonValue;
    } else if (
      jsonValue &&
      typeof jsonValue === 'object' &&
      'data' in jsonValue &&
      Array.isArray(jsonValue.data) &&
      'type' in jsonValue &&
      jsonValue.type === 'Buffer'
    ) {
      this.value = Buffer.from(jsonValue.data);
    } else if (jsonValue && Array.isArray(jsonValue)) {
      this.value = Buffer.from(jsonValue);
    } else {
      throw new Error(
        `Invalid JSON value for SBuffer: ${JSON.stringify(jsonValue)}`
      );
    }
  }
}

/** A Buffer encoded as a number N followed by N bytes. */
export abstract class SDynamicBuffer<
  LengthT extends SerializableWrapper<number>,
> extends SBuffer {
  /** Length type, to be provided by child classes. */
  protected abstract lengthType: new () => LengthT;

  deserialize(buffer: Buffer, opts?: DeserializeOptions): number {
    const length = new this.lengthType();
    const readOffset = length.deserialize(buffer, opts);
    this.value = buffer.subarray(readOffset, readOffset + length.value);
    return readOffset + length.value;
  }

  serialize(opts?: SerializeOptions) {
    const length = new this.lengthType();
    length.value = this.value.length;
    return Buffer.concat([length.serialize(opts), this.value]);
  }

  getSerializedLength(opts?: SerializeOptions) {
    const length = new this.lengthType();
    length.value = this.value.length;
    return length.getSerializedLength(opts) + this.value.length;
  }
}
