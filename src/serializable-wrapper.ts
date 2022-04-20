import {Serializable, toJSON} from '.';

/** Serializable implementation that simply wraps another value. */
export abstract class SerializableWrapper<ValueT> extends Serializable {
  abstract value: ValueT;

  toJSON() {
    return toJSON(this.value);
  }

  /** Create a new instance of this wrapper class from a raw value. */
  static of<ValueT, WrapperT extends SerializableWrapper<ValueT>>(
    this: new () => WrapperT,
    value: ValueT
  ) {
    const instance = new this();
    instance.value = value;
    return instance;
  }
}
