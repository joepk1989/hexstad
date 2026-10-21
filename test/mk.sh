#!/bin/sh
# Lint: alle bronbestanden achter elkaar in één functie, zoals build.js ze samenvoegt
cd "$(dirname "$0")"
node -e "
const fs=require('fs');const d='../src/js/';const js=fs.readdirSync(d).sort().map(f=>fs.readFileSync(d+f,'utf8').replace(/\n$/,'')).join('\n');
fs.mkdirSync('out',{recursive:true});fs.writeFileSync('out/all.js','(() => {\n'+js+'\n})();\n');"
npx eslint -c eslint.config.mjs out/all.js
