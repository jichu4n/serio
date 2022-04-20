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
