#!/bin/sh
# 公開したときにスマホのブラウザが古い JS を使い続けないよう、index.html と js/*.js の import に版番号 (?v=日時) を付け直す
# 使い方: sh tools/bump_version.sh
V=$(date +%Y%m%d%H%M%S)
cd "$(dirname "$0")/.."
sed -i -E "s#(from '\./[a-z0-9-]+\.js)(\?v=[0-9]+)?'#\1?v=$V'#g; s#(from '\.\./vendor/three\.module\.min\.js)(\?v=[0-9]+)?'#\1'#g" js/*.js
sed -i -E "s#src=\"js/main\.js(\?v=[0-9]+)?\"#src=\"js/main.js?v=$V\"#; s#href=\"css/style\.css(\?v=[0-9]+)?\"#href=\"css/style.css?v=$V\"#" index.html howto.html
echo "version $V"
