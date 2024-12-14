import {Serializable} from './serializable';
import {toJSON} from './utils';

/** Serializable implementation that simply wraps another value. */
export abstract class SerializableWrapper<ValueT> extends Serializable {
  abstract value: ValueT;

  toJSON() {
    return toJSON(this.value);
  }

  assignJSON<JsonValueT extends ValueT>(jsonValue: JsonValueT) {
    this.value = jsonValue;
  }

  /** Create a new instance of this wrapper class from a raw value. */
  static of<ValueT, WrapperT extends SerializableWrapper<ValueT>>(
    this: new () => WrapperT,
    value: ValueT
  ): WrapperT {
    const instance = new this();
    instance.value = value;
    return instance;
  }
}

export type WrappedValueT<WrapperT> =
  WrapperT extends SerializableWrapper<infer ValueT> ? ValueT : never;
