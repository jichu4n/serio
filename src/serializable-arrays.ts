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
export class SArray<ValueT extends Serializable> extends SerializableWrapper<
  Array<ValueT>
> {
  /** Array of Serializables. */
  value: Array<ValueT> = [];
  /** Fixed size, or undefined if dynamically sized. */
  readonly length?: number;

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

  /** Create a new instance of this wrapper class from a raw value. */
  static of<ValueT extends Serializable, SArrayT extends SArray<ValueT>>(
    this: new () => SArrayT,
    value: Array<ValueT>
  ): SArrayT;
  /** Returns an SArrayWithWrapper class that wraps elements with the provided
   * SerializableWrapper. */
  static of<ValueT>(
    wrapperType: new () => SerializableWrapper<ValueT>
  ): ReturnType<typeof createSArrayWithWrapperClass<ValueT>>;
  static of<ValueT>(
    arg: Array<ValueT> | (new () => SerializableWrapper<ValueT>)
  ) {
    if (Array.isArray(arg)) {
      return super.of(arg);
    }
    if (
      typeof arg === 'function' &&
      arg.prototype instanceof SerializableWrapper
    ) {
      return createSArrayWithWrapperClass<ValueT>(arg);
    }
    throw new Error(
      'SArray.of() should be invoked either with an array of Serializable ' +
        'values or a SerializableWrapper constructor'
    );
  }

  static ofLength<ValueT extends Serializable>(
    length: number,
    elementType: new () => ValueT
  ) {
    return class extends SArray<ValueT> {
      value = times(length, () => new elementType());
      length = length;
    };
  }

  map<FnT extends (element: ValueT, index: number) => any>(
    fn: FnT
  ): Array<ReturnType<FnT>> {
    if (this.length !== undefined && this.value.length !== this.length) {
      throw new Error(
        'SArray value has invalid length: ' +
          `expected ${this.length}, but value has length ${this.value.length}`
      );
    }
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

function createSArrayWithWrapperClass<ValueT>(
  wrapperType: new () => SerializableWrapper<ValueT>,
  length?: number
) {
  return class extends SArrayWithWrapper<ValueT> {
    value = times(length ?? 0, () => new wrapperType().value);
    wrapperType = wrapperType;
    length = length;

    static ofLength(length: number) {
      return createSArrayWithWrapperClass<ValueT>(wrapperType, length);
    }
  };
}

/** SArray variant that wraps each element for serialization / deserialization.
 */
export abstract class SArrayWithWrapper<ValueT> extends SerializableWrapper<
  Array<ValueT>
> {
  /** Array of unwrapped values. */
  value: Array<ValueT> = [];
  /** Wrapper type constructor. */
  abstract readonly wrapperType: new () => SerializableWrapper<ValueT>;
  /** Fixed size, or undefined if dynamically sized. */
  readonly length?: number;

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

  /** Constructs an SArray of wrappers around the current array of elements. */
  toSArray() {
    const cls =
      this.length === undefined
        ? SArray
        : SArray.ofLength(this.length, this.wrapperType);
    return cls.of(
      this.value.map((element) => {
        const wrapper = new this.wrapperType();
        wrapper.value = element;
        return wrapper;
      })
    );
  }
}

/** Error augmented by SArray with index information. */
export class SArrayError<
  ValueT extends Serializable = Serializable
> extends Error {
  constructor(message: string, {cause}: {cause: Error}) {
    super(message);
    Object.setPrototypeOf(this, SArrayError.prototype);
    this.cause = cause;
  }
  /** The original error. */
  cause: Error;
  /** Indicates this is an SArrayError. */
  isSArrayError: true = true;
  /** The element that raised the error. */
  element!: ValueT;
  /** Index of the element that raised the error. */
  index!: number;
}
