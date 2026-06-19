#!/usr/bin/env sh
set -eu

docker compose up -d db
npm install
