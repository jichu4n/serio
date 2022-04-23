import sum from 'lodash/sum';
import times from 'lodash/times';
import {
  DeserializeOptions,
  Serializable,
  SerializableWrapper,
  SerializeOptions,
  WrappedValueT,
} from '.';
import {toJSON} from './utils';

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

  /** Create an SArray instance with a given length, filled with the provided
   * generator function.
   *
   * @param elementGenerator A function that returns an element value.
   */
  static ofLength<ValueT extends Serializable = Serializable>(
    length: number,
    elementGenerator: (idx: number) => ValueT
  ): SArray<ValueT> {
    return SArray.of<Array<ValueT>, SArray<ValueT>>(
      times(length, elementGenerator)
    );
  }

  /** Returns an SArrayWithWrapper class that wraps elements with the provided
   * SerializableWrapper. */
  static serializeAs<WrapperT extends SerializableWrapper<any>>(
    wrapperType: new () => WrapperT
  ) {
    return class extends SArrayWithWrapper<WrappedValueT<WrapperT>, WrapperT> {
      wrapperType = wrapperType;
    };
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
          e2.stack = e.stack;
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

/** SArray variant that wraps each element for serialization / deserialization.
 */
export abstract class SArrayWithWrapper<
  ValueT,
  WrapperT extends SerializableWrapper<ValueT>
> extends SerializableWrapper<Array<ValueT>> {
  /** Array of unwrapped values. */
  value: Array<ValueT> = [];
  /** Wrapper type constructor. */
  abstract wrapperType: new () => WrapperT;

  deserialize(buffer: Buffer, opts?: DeserializeOptions): number {
    const array = this.toSArray();
    const readOffset = array.deserialize(buffer, opts);
    this.value.splice(
      0,
      this.value.length,
      ...array.value.map(({value}) => value)
    );
    return readOffset;
  }

  serialize(opts?: SerializeOptions): Buffer {
    return this.toSArray().serialize(opts);
  }

  getSerializedLength(opts?: SerializeOptions): number {
    return this.toSArray().getSerializedLength(opts);
  }

  toJSON() {
    return this.toSArray().toJSON();
  }

  /** Create an SArrayWithWrapper instance with a given length, filled with the provided
   * element value or generator function.
   *
   * @param elementValueOrGenerator An element value or a function that returns an
   *     element value.
   */
  static ofLength<WrapperT extends SerializableWrapper<any>>(
    this: new () => SArrayWithWrapper<WrappedValueT<WrapperT>, WrapperT>,
    length: number,
    elementValueOrGenerator:
      | WrappedValueT<WrapperT>
      | ((idx: number) => WrappedValueT<WrapperT>)
  ): SArrayWithWrapper<WrappedValueT<WrapperT>, WrapperT> {
    const elementGenerator =
      typeof elementValueOrGenerator === 'function'
        ? elementValueOrGenerator
        : () => elementValueOrGenerator;
    const instance = new this();
    instance.value = times(length, elementGenerator);
    return instance;
  }

  /** Constructs an SArray of wrappers around the current array of elements. */
  toSArray() {
    if (!this.value.map) {
      console.error('this.value.map is not a function: ' + this.value);
    }
    return SArray.of(
      this.value.map((element) => {
        const wrapper = new this.wrapperType();
        wrapper.value = element;
        return wrapper;
      })
    );
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
