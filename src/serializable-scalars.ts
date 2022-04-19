import {
  createSerializableScalarWrapperClass,
  SerializableWrapper,
} from './serializable-wrapper';

/** Serializable wrapper for an unsigned 8-bit integer. */
export class SUInt8
  extends createSerializableScalarWrapperClass({
    readFn: Buffer.prototype.readUInt8,
    writeFn: Buffer.prototype.writeUInt8,
    serializedLength: 1,
    defaultValue: 0,
  })
  implements SerializableWrapper<number> {}

/** Serializable wrapper for an unsigned 16-bit integer with big endian encoding. */
export class SUInt16BE
  extends createSerializableScalarWrapperClass({
    readFn: Buffer.prototype.readUInt16BE,
    writeFn: Buffer.prototype.writeUInt16BE,
    serializedLength: 2,
    defaultValue: 0,
  })
  implements SerializableWrapper<number> {}

/** Serializable wrapper for an unsigned 32-bit integer with big endian encoding. */
export class SUInt32BE
  extends createSerializableScalarWrapperClass({
    readFn: Buffer.prototype.readUInt32BE,
    writeFn: Buffer.prototype.writeUInt32BE,
    serializedLength: 4,
    defaultValue: 0,
  })
  implements SerializableWrapper<number> {}

// TODO: Add more scalar types.
