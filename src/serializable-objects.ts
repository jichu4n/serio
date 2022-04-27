import fromPairs from 'lodash/fromPairs';
import mapValues from 'lodash/mapValues';
import 'reflect-metadata';
import {
  DeserializeOptions,
  SArray,
  SArrayError,
  Serializable,
  SerializableWrapper,
  SerializeOptions,
} from '.';
import {toJSON} from './utils';

/** Serializable record where props are defined via @field. */
export class SObject extends Serializable {
  deserialize(buffer: Buffer, opts?: DeserializeOptions): number {
    const array = this.toSArray();
    const readOffset = this.wrapSArrayErrorAsSObjectError(() =>
      array.deserialize(buffer, opts)
    );
    const fieldSpecs = getSObjectFieldSpecs(this);
    for (let i = 0; i < fieldSpecs.length; ++i) {
      const {propertyKey, wrapperType} = fieldSpecs[i];
      if (wrapperType) {
        (this as any)[propertyKey] = (
          array.value[i] as SerializableWrapper<any>
        ).value;
      }
    }
    return readOffset;
  }

  serialize(opts?: SerializeOptions): Buffer {
    return this.wrapSArrayErrorAsSObjectError(() =>
      this.toSArray().serialize(opts)
    );
  }

  getSerializedLength(opts?: SerializeOptions): number {
    return this.wrapSArrayErrorAsSObjectError(() =>
      this.toSArray().getSerializedLength(opts)
    );
  }

  toJSON(): any {
    return mapValues(this.mapValuesToSerializable(), (value, propertyKey) => {
      try {
        return toJSON(value);
      } catch (e: any) {
        throw new SObjectError(propertyKey, e);
      }
    });
  }

  /** Create a new instance with the provided initial properties. */
  static with<T extends SObject>(this: new () => T, props: Partial<T> = {}): T {
    const instance = new this();
    Object.assign(instance, props);
    return instance;
  }

  /** Create a object where all properties are mapped to Serializable.
   *
   * Fields defined with @field are preserved as-is, and field defined with
   * @field.as are wrapped in their respective wrapper types.
   */
  public mapValuesToSerializable(): {[propertyKey: string]: Serializable} {
    return fromPairs(
      getSObjectFieldSpecs(this).map((fieldSpec) => [
        fieldSpec.propertyKey,
        getSObjectFieldOrWrapper(this, fieldSpec),
      ])
    );
  }

  /** Converts this object to an SArray of serializable field values. */
  private toSArray(): SArray<Serializable> {
    return SArray.of(
      getSObjectFieldSpecs(this).map((fieldSpec) =>
        getSObjectFieldOrWrapper(this, fieldSpec)
      )
    );
  }

  private wrapSArrayErrorAsSObjectError<FnT extends () => any>(
    fn: FnT
  ): ReturnType<FnT> {
    try {
      return fn();
    } catch (e) {
      if (e instanceof SArrayError) {
        const propertyKey =
          getSObjectFieldSpecs(this)[e.index].propertyKey.toString();
        // @ts-ignore
        const cause: Error = e.cause;
        const e2 = new SObjectError(propertyKey, cause);
        throw e2;
      } else {
        throw e;
      }
    }
  }
}

/** Error augmented by SObject with property information. */
export class SObjectError extends Error {
  constructor(propertyKey: string, cause: any) {
    super(`Error in field ${propertyKey}: ${cause.message}`);
    Object.setPrototypeOf(this, SObjectError.prototype);
    this.cause = cause;
    this.propertyKey = propertyKey;
    this.stack = cause.stack;
  }
  /** The original error. */
  cause: any;
  /** The property that raised the error. */
  propertyKey: string;
}

/** Decorator for Serializable fields of an SObject. */
export function field<ValueT>(target: any, propertyKey: string | symbol) {
  registerSObjectField(target, propertyKey);
}
export namespace field {
  /** Decorator for fields to be wrapped in a Serializable wrapper class. */
  export function as<ValueT>(
    wrapperType: new () => SerializableWrapper<ValueT>
  ): PropertyDecorator {
    return function (target: Object, propertyKey: string | symbol) {
      registerSObjectField(target, propertyKey, wrapperType);
    };
  }
}

/** Key for storing property information on an SObject's metadata. */
const SOBJECT_FIELD_SPECS_METADATA_KEY = Symbol('__sobjectFieldSpecs');

/** Registers a serializable property in the metadata of an SObject. */
function registerSObjectField<ValueT>(
  target: any,
  propertyKey: string | symbol,
  wrapperType?: new () => SerializableWrapper<ValueT>
) {
  const fieldSpecs = Reflect.getMetadata(
    SOBJECT_FIELD_SPECS_METADATA_KEY,
    target
  ) as Array<SObjectFieldSpec> | undefined;
  const fieldSpec: SObjectFieldSpec = {
    propertyKey,
    wrapperType,
  };
  if (fieldSpecs) {
    fieldSpecs.push(fieldSpec);
  } else {
    Reflect.defineMetadata(
      SOBJECT_FIELD_SPECS_METADATA_KEY,
      [fieldSpec],
      target
    );
  }
}

/** Metadata stored for each serializable property on an SObject's metadata. */
interface SObjectFieldSpec<ValueT = any> {
  /** The name of the property. */
  propertyKey: string | symbol;
  /** The wrapper type for the property, if defined with @field.as. */
  wrapperType?: new () => SerializableWrapper<ValueT>;
}

/** Extract SObjectFieldSpec's defined on a SObject. */
function getSObjectFieldSpecs(targetInstance: Object) {
  return (Reflect.getMetadata(
    SOBJECT_FIELD_SPECS_METADATA_KEY,
    Object.getPrototypeOf(targetInstance)
  ) ?? []) as Array<SObjectFieldSpec>;
}

/** Get the Serializable value corresponding to an SObject field. */
function getSObjectFieldOrWrapper(
  targetInstance: Object,
  {propertyKey, wrapperType}: SObjectFieldSpec
) {
  const value = (targetInstance as any)[propertyKey];
  if (wrapperType) {
    const wrapper = new wrapperType();
    wrapper.value = value;
    return wrapper;
  } else {
    return value as Serializable;
  }
}
