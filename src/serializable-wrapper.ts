import {Serializable, toJSON} from '.';

/** Serializable implementation that simply wraps another value. */
export abstract class SerializableWrapper<ValueT> extends Serializable {
  abstract value: ValueT;

  toJSON() {
    return toJSON(this.value);
  }

  static of<ValueT>(
    this: new () => SerializableWrapper<ValueT>,
    value: ValueT
  ) {
    const instance = new this();
    instance.value = value;
    return instance;
  }
}

/** Factory for Serializable wrappers for basic data types. */
export function createSerializableScalarWrapperClass<ValueT>({
  readFn,
  writeFn,
  serializedLength,
  defaultValue,
}: {
  readFn: () => ValueT;
  writeFn: (value: ValueT) => void;
  serializedLength: number;
  defaultValue: ValueT;
}) {
  const SerializableScalarWrapperClass = class extends SerializableWrapper<ValueT> {
    value: ValueT = defaultValue;

    deserialize(buffer: Buffer) {
      this.value = readFn.call(buffer);
      return serializedLength;
    }

    serialize() {
      const buffer = Buffer.alloc(serializedLength);
      writeFn.call(buffer, this.value);
      return buffer;
    }

    getSerializedLength() {
      return serializedLength;
    }
  };
  return SerializableScalarWrapperClass;
}
