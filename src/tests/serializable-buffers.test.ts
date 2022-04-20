import {SBuffer, SDynamicBuffer, SUInt16BE} from '../';

describe('SBuffer', function () {
  test('serialize and deserialize', function () {
    const text = 'hello, world';
    const buf1 = SBuffer.of(Buffer.from(text, 'utf-8'));
    expect(buf1.getSerializedLength()).toStrictEqual(text.length);
    const serializedBuf1 = buf1.serialize();

    const buf2 = SBuffer.from(serializedBuf1);
    expect(buf2.value.toString('utf-8')).toStrictEqual(text);
  });
});

class SDynamicBufferWithSUInt16BE extends SDynamicBuffer<SUInt16BE> {
  protected lengthType = SUInt16BE;
}

describe('SDynamicBuffer', function () {
  test('serialize and deserialize', function () {
    const buf1 = SDynamicBufferWithSUInt16BE.of(Buffer.alloc(10));
    expect(buf1.getSerializedLength()).toStrictEqual(12);
    const serializedBuf1 = buf1.serialize();
    expect(serializedBuf1.length).toStrictEqual(12);
    expect(SUInt16BE.from(serializedBuf1).value).toStrictEqual(10);

    const buf2 = SDynamicBufferWithSUInt16BE.from(serializedBuf1);
    expect(buf2.value).toStrictEqual(buf1.value);
  });
});
