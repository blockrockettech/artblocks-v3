#!/usr/bin/env bash

node ./node_modules/.bin/truffle-flattener ./contracts/Migrations.sol > ./flat/Migrations.sol;

node ./node_modules/.bin/truffle-flattener ./contracts/SimpleArtistToken.sol > ./flat/FLAT-SimpleArtistToken-FLAT.sol;
