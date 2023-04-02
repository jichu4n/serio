#!/bin/bash
#
# Smoke test for verifying the published package. It runs `npm pack` and
# verifies the output can be installed and imported.
#

TEST_SCRIPT=$(cat <<'EOF'

import assert from 'assert';
import {SUInt8, SArray, SObject, field} from 'serio';

class MyObject extends SObject {
  @field(SArray.of(SUInt8))
	prop1: Array<number> = Array(10).fill(0);
}

const obj1 = new MyObject();
obj1.prop1.fill(42);
assert.strictEqual(obj1.getSerializedLength(), 10);
assert.strictEqual(obj1.serialize().length, 10);

const obj2 = MyObject.from(obj1.serialize());
assert.deepStrictEqual(obj2.prop1, Array(10).fill(42));

EOF
)
SOURCE_DIR="$PWD"
TEMP_DIR="$PWD/tmp-smoke-test"


cd "$SOURCE_DIR"
echo "> Building package"
npm pack || exit 1
echo

package_files=(*.tgz)
if [ ${#package_files[@]} -eq 1 ]; then
  package_file="$SOURCE_DIR/${package_files[0]}"
  echo "> Found package $package_file"
	echo
else
	echo "Could not identify package file"
	exit 1
fi

echo "> Installing package in temp directory $TEMP_DIR"
if [ -d "$TEMP_DIR" ]; then
  rm -rf "$TEMP_DIR"
fi
mkdir -p "$TEMP_DIR"
cd "$TEMP_DIR"
npm init -y
npm install --save ts-node typescript '@types/node' "$package_file"
echo

echo "> Running test script"
echo "$TEST_SCRIPT"
if ./node_modules/.bin/ts-node -e "$TEST_SCRIPT"; then
  echo
	echo "> Success!"
	exit_code=0
else
  exit_code=$?
  echo
	echo "> Error - script returned status ${exit_code}"
fi
echo

echo "> Cleaning up"
cd "$SOURCE_DIR"
rm -rf "$TEMP_DIR" "$package_file"

exit $exit_code
