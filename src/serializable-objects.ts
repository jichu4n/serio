import fromPairs from 'lodash/fromPairs';
import mapValues from 'lodash/mapValues';
import {
  DeserializeOptions,
  SArray,
  SArrayError,
  Serializable,
  SerializableWrapper,
  SerializeOptions,
} from '.';
import {toJSON} from './utils';

/** Serializable record where fields are defined via `@field()`. */
export class SObject extends Serializable {
  deserialize(buffer: Buffer, opts?: DeserializeOptions): number {
    const array = toSArray(this);
    const readOffset = wrapSArrayErrorAsSObjectError(this, () =>
      array.deserialize(buffer, opts)
    );
    const fieldSpecs = getFieldSpecs(this);
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
    return wrapSArrayErrorAsSObjectError(this, () =>
      toSArray(this).serialize(opts)
    );
  }

  getSerializedLength(opts?: SerializeOptions): number {
    return wrapSArrayErrorAsSObjectError(this, () =>
      toSArray(this).getSerializedLength(opts)
    );
  }

  toJSON(): any {
    const serializableFields = this.mapValuesToSerializable();
    return Object.fromEntries(
      Object.entries(this).map(([propertyKey, value]) => {
        try {
          return [
            propertyKey,
            toJSON(
              propertyKey in serializableFields
                ? serializableFields[propertyKey]
                : value
            ),
          ];
        } catch (e: any) {
          throw new SObjectError(propertyKey, e);
        }
      })
    );
  }

  /** Create a new instance with the provided initial properties. */
  static with<T extends SObject>(this: new () => T, props: Partial<T> = {}): T {
    const instance = new this();
    Object.assign(instance, props);
    return instance;
  }

  /** Map values of this object to Serializable.
   *
   * Fields defined with `@field()` are preserved as-is, and field defined with
   * `@field(wrapper)` are wrapped in their respective wrapper types.
   */
  mapValuesToSerializable(): {[propertyKey: string]: Serializable} {
    return fromPairs(
      getFieldSpecs(this).map((fieldSpec) => [
        fieldSpec.propertyKey,
        getFieldOrWrapper(this, fieldSpec),
      ])
    );
  }

  /** Assign properties to this object from a map of Serializables.
   *
   * Conceptually equivalent to Object.assign(), but automatically unwraps
   * wrapped properties. Fields defined with `@field()` are directly assigned,
   * and fields defined with `@field(wrapper)` are assigned by unwrapping the
   * corresponding SerializableWrapper. Unknown fields are ignored.
   */
  assignFromSerializable(serializableMap: {
    [propertyKey: string]: Serializable;
  }) {
    for (const {propertyKey, wrapperType} of getFieldSpecs(this)) {
      const serializableValue = serializableMap[propertyKey.toString()];
      if (!serializableValue) {
        continue;
      }
      if (wrapperType) {
        if (!(serializableValue instanceof SerializableWrapper)) {
          throw new Error(
            `Error in field ${propertyKey.toString()}: ` +
              `expected SerializableWrapper in assignment, ` +
              `got ${typeof serializableValue} (${toJSON(serializableValue)})`
          );
        }
        (this as any)[propertyKey] = serializableValue.value;
      } else {
        (this as any)[propertyKey] = serializableValue;
      }
    }
  }
}

/** Converts this object to an SArray of serializable field values. */
function toSArray(targetInstance: SObject): SArray<Serializable> {
  return SArray.of(
    getFieldSpecs(targetInstance).map((fieldSpec) =>
      getFieldOrWrapper(targetInstance, fieldSpec)
    )
  );
}

function wrapSArrayErrorAsSObjectError<FnT extends () => any>(
  targetInstance: SObject,
  fn: FnT
): ReturnType<FnT> {
  try {
    return fn();
  } catch (e) {
    if (e instanceof SArrayError) {
      const propertyKey =
        getFieldSpecs(targetInstance)[e.index].propertyKey.toString();
      // @ts-ignore
      const cause: Error = e.cause;
      const e2 = new SObjectError(propertyKey, cause);
      throw e2;
    } else {
      throw e;
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

type SerializableFieldDecorator<ValueT> = {
  (
    value: Function,
    context: ClassGetterDecoratorContext | ClassSetterDecoratorContext
  ): void;
  (value: undefined, context: ClassFieldDecoratorContext): (
    initialValue: ValueT
  ) => ValueT;
};

/** Decorator for Serializable fields of an SObject. */
export function field<WrappedValueT, ValueT extends WrappedValueT>(
  wrapperType?: new () => SerializableWrapper<WrappedValueT>
) {
  return function (
    value: undefined | Function,
    context:
      | ClassFieldDecoratorContext
      | ClassGetterDecoratorContext
      | ClassSetterDecoratorContext
  ) {
    context.addInitializer(function () {
      registerField(this, context.name, wrapperType);
    });
    switch (context.kind) {
      case 'field':
        return (initialValue: ValueT) => initialValue;
      case 'getter':
      case 'setter':
        return;
      default:
        throw new Error('@field() should only be used on class properties');
    }
  } as SerializableFieldDecorator<ValueT>;
}

/** Key for metadata stored on an SObject's prototype. */
const SOBJECT_METADATA_KEY = Symbol('__sobjectMetadata');

/** Metadata stored for each serializable property on an SObject's prototype. */
interface SObjectFieldSpec<ValueT = any> {
  /** The name of the property. */
  propertyKey: string | symbol;
  /** The wrapper type for the property, if defined with @field(wrapper). */
  wrapperType?: new () => SerializableWrapper<ValueT>;
}

/** Metadata stored on an SObject's prototype. */
interface SObjectMetadata {
  /** List of serializable fields, in declaration order. */
  fieldSpecs: Array<SObjectFieldSpec>;
  /** Name of all serializable fields as a set. */
  propertyKeys: Set<string | symbol>;
}

/** Registers a serializable property in the metadata of an SObject. */
function registerField<ValueT>(
  targetInstance: any,
  propertyKey: string | symbol,
  wrapperType?: new () => SerializableWrapper<ValueT>
) {
  const targetPrototype = Object.getPrototypeOf(targetInstance);
  const metadata = targetPrototype[SOBJECT_METADATA_KEY] as
    | SObjectMetadata
    | undefined;
  const fieldSpec: SObjectFieldSpec<ValueT> = {
    propertyKey,
    wrapperType,
  };
  if (metadata) {
    if (metadata.propertyKeys.has(propertyKey)) {
      return;
    }
    metadata.propertyKeys.add(propertyKey);
    metadata.fieldSpecs.push(fieldSpec);
  } else {
    const newMetadata: SObjectMetadata = {
      fieldSpecs: [fieldSpec],
      propertyKeys: new Set<string | symbol>([propertyKey]),
    };
    targetPrototype[SOBJECT_METADATA_KEY] = newMetadata;
  }
}

/** Extract SObjectFieldSpec's defined on a SObject. */
function getFieldSpecs(targetInstance: any) {
  return (
    (
      Object.getPrototypeOf(targetInstance)[SOBJECT_METADATA_KEY] as
        | SObjectMetadata
        | undefined
    )?.fieldSpecs ?? []
  );
}

/** Get the Serializable value corresponding to an SObject field. */
function getFieldOrWrapper(
  targetInstance: any,
  {propertyKey, wrapperType}: SObjectFieldSpec
) {
  const value = targetInstance[propertyKey];
  if (wrapperType) {
    const wrapper = new wrapperType();
    wrapper.value = value;
    return wrapper;
  } else {
    return value as Serializable;
  }
}
