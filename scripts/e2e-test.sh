#!/bin/bash

echo "env: $1";
echo "debug: $2";
echo "coin: $3";

env=$1
debug=$2
coin=$3

# DEV move (dont use jest)
if [[ $2 = 'true' ]]
then
  cd e2e/transfers/e2e-transfer-bitcoin && npm run dev
# Default mode (use jest)
else
  cd e2e/transfers/e2e-transfer-bitcoin && npm run test

