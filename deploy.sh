#!/usr/bin/env sh
# abort on errors
set -e
# build
now=$(date +'%d-%m-%Y')
message="deploy-${now}"
# echo "${message}"
npm run build
git add dist/ -f
git commit -m ${message}
git subtree push --prefix dist origin gh-pages