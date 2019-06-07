#!/bin/bash

set -euox pipefail

rm -rf dist && \
mkdir -p dist/assets/ && \
cp -v index.html dist/ && \
npx postcss --verbose index.css > dist/index.css && \
npx svgo -f assets/ -o dist/assets/ && \
find assets -not -name "*.svg" -type f -exec cp -v {} dist/assets \;
