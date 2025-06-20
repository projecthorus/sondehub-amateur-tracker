#!/bin/bash

set -e

VERSION="`git rev-parse --short HEAD`"
BUILD_DATE="`date -u +%Y-%m-%dT%H:%M:%SZ`"


# cache fixes
echo -n "Generating index.html... "
sed -e "s/{VER}/$VERSION/" -e "s/{BUILD_DATE}/$BUILD_DATE/" index.template.html > index.html
echo "Done!"

echo -n "Generating service-worker.js... "
sed -e "s/{VER}/$VERSION/" service-worker.template.js > service-worker.js
echo "Done!"

echo "Build version: $VERSION Build date: $BUILD_DATE"
