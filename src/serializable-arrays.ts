import sum from 'lodash/sum';
import times from 'lodash/times';
import {
  DeserializeOptions,
  Serializable,
  SerializableWrapper,
  SerializeOptions,
  toJSON,
} from '.';

/** A Serializable that represents a concatenation of other Serializables. */
export class SArray<
  ValueT extends Serializable = Serializable
> extends SerializableWrapper<Array<ValueT>> {
  /** Array of Serializables. */
  value: Array<ValueT> = [];

  deserialize(buffer: Buffer, opts?: DeserializeOptions): number {
    let offset = 0;
    this.map((element) => {
      offset += element.deserialize(buffer.slice(offset), opts);
    });
    return offset;
  }

  serialize(opts?: SerializeOptions): Buffer {
    return Buffer.concat(this.map((element) => element.serialize(opts)));
  }

  getSerializedLength(opts?: SerializeOptions): number {
    return sum(this.map((element) => element.getSerializedLength(opts)));
  }

  toJSON() {
    return this.map(toJSON);
  }

  private map<FnT extends (element: ValueT, index: number) => any>(
    fn: FnT
  ): Array<ReturnType<FnT>> {
    return this.value.map((element, index) => {
      try {
        return fn(element, index);
      } catch (e) {
        if (e instanceof Error) {
          const e2 = new SArrayError(
            `Error at element ${index}: ${e.message}`,
            {cause: e}
          );
          e2.element = element;
          e2.index = index;
          throw e2;
        } else {
          throw e;
        }
      }
    });
  }
}

/** An array encoded as a number N followed by N elements. */
export abstract class SDynamicArray<
  LengthT extends SerializableWrapper<number>,
  ValueT extends Serializable = Serializable
> extends SArray<ValueT> {
  /** Length type, to be provided by child classes. */
  protected abstract lengthType: new () => LengthT;
  /** Element type, to be provided by child classes. */
  protected abstract valueType: new () => ValueT;

  deserialize(buffer: Buffer, opts?: DeserializeOptions): number {
    const length = new this.lengthType();
    let readOffset = length.deserialize(buffer, opts);
    this.value = times(length.value, () => new this.valueType());
    readOffset += super.deserialize(buffer.slice(readOffset), opts);
    return readOffset;
  }

  serialize(opts?: SerializeOptions) {
    const length = new this.lengthType();
    length.value = this.value.length;
    return Buffer.concat([length.serialize(opts), super.serialize(opts)]);
  }

  getSerializedLength(opts?: SerializeOptions) {
    const length = new this.lengthType();
    length.value = this.value.length;
    return length.getSerializedLength(opts) + super.getSerializedLength(opts);
  }
}

/** Error augmented by SArray with index information. */
export class SArrayError<
  ValueT extends Serializable = Serializable
> extends Error {
  constructor(message: string, {cause}: {cause: Error}) {
    // @ts-ignore
    super(message, {cause});
    Object.setPrototypeOf(this, SArrayError.prototype);
  }
  /** Indicates this is an SArrayError. */
  isSArrayError: true = true;
  /** The element that raised the error. */
  element!: ValueT;
  /** Index of the element that raised the error. */
  index!: number;
}
