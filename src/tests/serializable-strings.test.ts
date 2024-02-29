import iconv from 'iconv-lite';
import {SString, SStringNT} from '..';

describe('SStringNT', function () {
  test('serialize and deserialize without fixed size', function () {
    const str1 = new SStringNT();
    expect(str1.getSerializedLength()).toStrictEqual(1);
    expect(str1.serialize().toString('utf-8')).toStrictEqual('\x00');

    str1.value = 'hello';
    expect(str1.getSerializedLength()).toStrictEqual(6);
    expect(str1.serialize().toString('utf-8')).toStrictEqual('hello\x00');

    const str2 = SStringNT.from(str1.serialize());
    expect(str2.value).toStrictEqual('hello');
    expect(str2.getSerializedLength()).toStrictEqual(6);
    expect(str2.serialize().toString('utf-8')).toStrictEqual('hello\x00');
  });

  test('serialize and deserialize with fixed size', function () {
    const str1 = new (SStringNT.ofLength(5))();
    expect(str1.getSerializedLength()).toStrictEqual(5);
    expect(str1.serialize().toString('utf-8')).toStrictEqual(
      '\x00\x00\x00\x00\x00'
    );

    str1.value = 'cat';
    expect(str1.getSerializedLength()).toStrictEqual(5);
    expect(str1.serialize().length).toStrictEqual(5);
    expect(str1.serialize().toString('utf-8')).toStrictEqual('cat\x00\x00');

    const str2 = SStringNT.ofLength(5).from(str1.serialize());
    expect(str2.value).toStrictEqual('cat');
    expect(str2.getSerializedLength()).toStrictEqual(5);
    expect(str2.serialize().toString('utf-8')).toStrictEqual('cat\x00\x00');

    const str3 = SStringNT.ofLength(5).of('hello world');
    expect(str3.value).toStrictEqual('hello world');
    expect(str3.getSerializedLength()).toStrictEqual(5);
    expect(str3.serialize().toString('utf-8')).toStrictEqual('hell\x00');

    const str4 = SStringNT.ofLength(5).from(str3.serialize());
    expect(str4.value).toStrictEqual('hell');
  });

  test('serialize and deserialize with different encodings', function () {
    const str1 = SStringNT.of('你好');
    // UTF-8 uses 3 bytes per character.
    expect(str1.getSerializedLength()).toStrictEqual(7);
    expect(str1.serialize().toString('utf-8')).toStrictEqual('你好\x00');
    // GB2312 uses two bytes per character.
    expect(str1.getSerializedLength({encoding: 'gb2312'})).toStrictEqual(5);
    expect(
      iconv.decode(str1.serialize({encoding: 'gb2312'}), 'gb2312')
    ).toStrictEqual('你好\x00');

    // Test truncation with fixed length.
    const str2 = SStringNT.ofLength(7).of('你好啊，世界');
    expect(str2.getSerializedLength()).toStrictEqual(7);
    expect(str2.serialize().toString('utf-8')).toStrictEqual('你好\x00');
    expect(str2.getSerializedLength({encoding: 'gb2312'})).toStrictEqual(7);
    expect(
      iconv.decode(str2.serialize({encoding: 'gb2312'}), 'gb2312')
    ).toStrictEqual('你好啊\x00');
  });
});

describe('SString', function () {
  test('serialize and deserialize without fixed size', function () {
    const str1 = new SString();
    expect(str1.getSerializedLength()).toStrictEqual(0);
    expect(str1.serialize().toString('utf-8')).toStrictEqual('');

    str1.value = 'hello';
    expect(str1.getSerializedLength()).toStrictEqual(5);
    expect(str1.serialize().toString('utf-8')).toStrictEqual('hello');

    const str2 = SString.from(str1.serialize());
    expect(str2.value).toStrictEqual('hello');
    expect(str2.getSerializedLength()).toStrictEqual(5);
    expect(str2.serialize().toString('utf-8')).toStrictEqual('hello');
  });

  test('serialize and deserialize with fixed size', function () {
    const str1 = new (SString.ofLength(5))();
    expect(str1.getSerializedLength()).toStrictEqual(5);
    expect(str1.serialize().toString('utf-8')).toStrictEqual(
      '\x00\x00\x00\x00\x00'
    );

    str1.value = 'cat';
    expect(str1.getSerializedLength()).toStrictEqual(5);
    expect(str1.serialize().length).toStrictEqual(5);
    expect(str1.serialize().toString('utf-8')).toStrictEqual('cat\x00\x00');

    const str2 = SString.ofLength(5).from(str1.serialize());
    expect(str2.value).toStrictEqual('cat\x00\x00');
    expect(str2.getSerializedLength()).toStrictEqual(5);
    expect(str2.serialize().toString('utf-8')).toStrictEqual('cat\x00\x00');

    const str3 = SString.ofLength(5).of('hello world');
    expect(str3.value).toStrictEqual('hello world');
    expect(str3.getSerializedLength()).toStrictEqual(5);
    expect(str3.serialize().toString('utf-8')).toStrictEqual('hello');

    const str4 = SString.ofLength(5).from(str3.serialize());
    expect(str4.value).toStrictEqual('hello');
  });

  test('serialize and deserialize with different encodings', function () {
    const str1 = SString.of('你好');
    // UTF-8 uses 3 bytes per character.
    expect(str1.getSerializedLength()).toStrictEqual(6);
    expect(str1.serialize().toString('utf-8')).toStrictEqual('你好');
    // GB2312 uses two bytes per character.
    expect(str1.getSerializedLength({encoding: 'gb2312'})).toStrictEqual(4);
    expect(
      iconv.decode(str1.serialize({encoding: 'gb2312'}), 'gb2312')
    ).toStrictEqual('你好');

    // Test truncation with fixed length.
    const str2 = SString.ofLength(6).of('你好啊，世界');
    expect(str2.getSerializedLength()).toStrictEqual(6);
    expect(str2.serialize().toString('utf-8')).toStrictEqual('你好');
    expect(str2.getSerializedLength({encoding: 'gb2312'})).toStrictEqual(6);
    expect(
      iconv.decode(str2.serialize({encoding: 'gb2312'}), 'gb2312')
    ).toStrictEqual('你好啊');
  });

  test('JSON conversion', function () {
    const str1 = SString.of('hello');
    expect(str1.toJSON()).toStrictEqual('hello');
    str1.assignJSON('world');
    expect(str1.toJSON()).toStrictEqual('world');

    const str2 = SStringNT.of('hello');
    expect(str2.toJSON()).toStrictEqual('hello');
    str2.assignJSON('world');
    expect(str2.toJSON()).toStrictEqual('world');
  });
});
