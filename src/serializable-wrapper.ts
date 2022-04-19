import {Serializable} from '.';

/** Serializable implementation that simply wraps another value. */
export abstract class SerializableWrapper<ValueT> extends Serializable {
  abstract value: ValueT;

  toJSON() {
    const value = this.value as any;
    if ('toJSON' in value && typeof value.toJSON === 'function') {
      return value.toJSON();
    }
    return value;
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
