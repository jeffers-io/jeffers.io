#!/bin/bash

set -euox pipefail

rm -rf dist
mkdir -p dist/articles/
mkdir -p dist/assets/
mkdir -p dist/error_pages/
cp -v index.html dist/
cp -v highlight.pack.js dist/
cp -v dracula.css dist/
npx postcss --verbose index.css > dist/index.css
npx svgo \
  --disable=removeViewBox \
  --enable=removeDimensions \
  -f assets/ \
  -o dist/assets/
find assets -not -name "*.svg" -type f -exec cp -v {} dist/assets \;
cp -rv error_pages/* dist/error_pages/
cp -rv articles/* dist/articles/
find dist/articles/**/*.md | xargs rm
rm dist/articles/build.js
rm dist/articles/index.html.tmpl
