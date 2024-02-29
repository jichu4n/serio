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
  test('JSON conversion', function () {
    const buf1 = SBuffer.of(Buffer.of(0, 1, 2));
    expect(buf1.toJSON()).toEqual({data: [0, 1, 2], type: 'Buffer'});
    buf1.assignJSON({data: [3, 4], type: 'Buffer'});
    expect(buf1.toJSON()).toEqual({data: [3, 4], type: 'Buffer'});
    buf1.assignJSON({data: [5, 6, 7, 8], type: 'Buffer'});
    expect(buf1.toJSON()).toEqual({data: [5, 6, 7, 8], type: 'Buffer'});
    buf1.assignJSON([9, 10, 11, 12, 13]);
    expect(buf1.toJSON()).toEqual({data: [9, 10, 11, 12, 13], type: 'Buffer'});
    buf1.assignJSON([]);
    expect(buf1.toJSON()).toEqual({data: [], type: 'Buffer'});
    // @ts-expect-error
    expect(() => buf1.assignJSON({})).toThrow();
    // @ts-expect-error
    expect(() => buf1.assignJSON(null)).toThrow();
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
  test('JSON conversion', function () {
    const buf1 = SDynamicBufferWithSUInt16BE.of(Buffer.of(0, 1, 2));
    expect(buf1.toJSON()).toEqual({data: [0, 1, 2], type: 'Buffer'});
    buf1.assignJSON({data: [3, 4], type: 'Buffer'});
    expect(buf1.toJSON()).toEqual({data: [3, 4], type: 'Buffer'});
    buf1.assignJSON([9, 10, 11, 12, 13]);
    expect(buf1.toJSON()).toEqual({data: [9, 10, 11, 12, 13], type: 'Buffer'});
  });
});
