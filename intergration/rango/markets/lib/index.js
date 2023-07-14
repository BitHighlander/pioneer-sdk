"use strict";
/*
    E2E testing

 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv").config();
require('dotenv').config({ path: "../../.env" });
require('dotenv').config({ path: "./../../.env" });
require("dotenv").config({ path: '../../../.env' });
require("dotenv").config({ path: '../../../../.env' });
const TAG = " | intergration-test | ";
const core = __importStar(require("@shapeshiftoss/hdwallet-core"));
const native = __importStar(require("@shapeshiftoss/hdwallet-native"));
const log = require("@pioneer-platform/loggerdog")();
let assert = require('assert');
let SDK = require('@pioneer-sdk/sdk');
let wait = require('wait-promise');
let sleep = wait.sleep;
let BLOCKCHAIN = 'ethereum';
let BLOCKCHAIN_OUTPUT = 'bitcoin';
let ASSET = 'ETH';
let MIN_BALANCE = process.env['MIN_BALANCE_LTC'] || "0.004";
let TEST_AMOUNT = process.env['TEST_AMOUNT'] || "0.05";
let spec = process.env['URL_PIONEER_SPEC'] || 'https://pioneers.dev/spec/swagger.json';
let wss = process.env['URL_PIONEER_SOCKET'] || 'wss://pioneers.dev';
let TRADE_PAIR = "ETH_BTC";
let INPUT_ASSET = ASSET;
let OUTPUT_ASSET = "BTC";
//hdwallet Keepkey
let Controller = require("@keepkey/keepkey-hardware-controller");
let noBroadcast = false;
console.log("spec: ", spec);
console.log("wss: ", wss);
let blockchains = [
    'bitcoin', 'ethereum', 'thorchain', 'bitcoincash', 'litecoin', 'binance', 'cosmos', 'dogecoin', 'osmosis'
];
let txid;
let IS_SIGNED;
// let invocationId:string
let invocationId = '95a8db44-bcc2-4a21-b970-7b3f7e172cd9';
const start_keepkey_controller = async function () {
    try {
        let config = {};
        //sub ALL events
        let controller = new Controller.KeepKey(config);
        //state
        controller.events.on('state', function (request) {
            console.log("state: ", request);
        });
        //errors
        controller.events.on('error', function (request) {
            console.log("state: ", request);
        });
        //logs
        controller.events.on('logs', function (request) {
            console.log("logs: ", request);
        });
        controller.init();
        while (!controller.wallet) {
            await sleep(1000);
        }
        return controller.wallet;
    }
    catch (e) {
        console.error(e);
    }
};
const start_software_wallet = async function () {
    try {
        let mnemonic = process.env['WALLET_MAIN'];
        if (!mnemonic)
            throw Error("Unable to load wallet! missing env WALLET_MAIN");
        const keyring = new core.Keyring();
        //@ts-ignore
        const nativeAdapter = native.NativeAdapter.useKeyring(keyring, {
            mnemonic,
            deviceId: "native-wallet-test",
        });
        let wallet = await nativeAdapter.pairDevice("testid");
        if (!wallet)
            throw Error("failed to init wallet!");
        return wallet;
    }
    catch (e) {
        console.error(e);
    }
};
const test_service = async function () {
    let tag = TAG + " | test_service | ";
    try {
        console.time('start2paired');
        console.time('start2build');
        console.time('start2broadcast');
        console.time('start2end');
        //if force new user
        //const queryKey = "sdk:pair-keepkey:"+uuidv4();
        const queryKey = process.env['PIONEER_QUERYKEY'];
        assert(queryKey);
        const username = process.env['PIONEER_USERNAME'];
        assert(username);
        //add custom path
        let paths = [];
        let config = {
            blockchains,
            username,
            queryKey,
            spec,
            wss,
            paths
        };
        let app = new SDK.SDK(spec, config);
        log.info(tag, "app: ", app);
        //verify paths
        log.info(tag, "paths: ", app.paths.length);
        log.info(tag, "paths: ", app.paths);
        //get HDwallet
        let wallet = await start_keepkey_controller();
        // let wallet = await start_software_wallet()
        log.info(tag, "wallet: ", wallet);
        // //init with HDwallet
        let result = await app.init();
        log.info(tag, "result: ", result);
        //pair wallet
        if (!app.isConnected) {
            let resultPair = await app.pairWallet(wallet);
            // log.info(tag,"resultPair: ",resultPair)
        }
        log.info(tag, "app.availableOutputs: ", app.availableOutputs);
        let runeInfo = app.availableOutputs.filter((e) => e.symbol === "RUNE");
        log.info(tag, "runeInfo: ", runeInfo);
        let runeInfo1 = app.availableOutputs.filter((e) => e.symbol === "THOR");
        log.info(tag, "runeInfo1: ", runeInfo1);
        let runeInfo2 = app.availableOutputs.filter((e) => e.blockchain === "THORCHAIN");
        log.info(tag, "runeInfo2: ", runeInfo2);
        //Test remote objects
        //get available inputs
        // assert(app.availableInputs)
        //get available outputs
        // assert(app.availableOutputs)
        log.notice("****** TEST PASS ******");
        //process
        process.exit(0);
    }
    catch (e) {
        log.error(e);
        //process
        process.exit(666);
    }
};
test_service();
