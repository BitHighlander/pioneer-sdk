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
const TAG = " | e2e-test | ";
const native = __importStar(require("@shapeshiftoss/hdwallet-native"));
const log = require("@pioneer-platform/loggerdog")();
let assert = require('assert');
let SDK = require('@pioneer-sdk/sdk');
let wait = require('wait-promise');
let sleep = wait.sleep;
let BLOCKCHAIN = 'osmosis';
let ASSET = 'OSMO';
let TEST_AMOUNT = process.env['TEST_AMOUNT'] || "max";
let spec = process.env['URL_PIONEER_SPEC'] || 'https://pioneers.dev/spec/swagger.json';
let wss = process.env['URL_PIONEER_SOCKET'] || 'wss://pioneers.dev';
//hdwallet Keepkey
let Controller = require("@keepkey/keepkey-hardware-controller");
let noBroadcast = false;
console.log("spec: ", spec);
console.log("wss: ", wss);
let blockchains = [
    'bitcoin', 'ethereum', 'thorchain', 'bitcoincash', 'litecoin', 'binance', 'cosmos', 'dogecoin', 'osmosis'
];
let BLOCKCHAIN_OUTPUT = 'cosmos';
let OUTPUT_ASSET = "ATOM";
let txid;
let invocationId;
let IS_SIGNED;
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
        const nativeAdapterArgs = {
            mnemonic,
            deviceId: 'test'
        };
        const wallet = new native.NativeHDWallet(nativeAdapterArgs);
        await wallet.initialize();
        await wallet.loadDevice({
            mnemonic,
            label: 'test',
            skipChecksum: true
        });
        if (!wallet)
            throw Error("failed to init wallet!");
        return wallet;
    }
    catch (e) {
        console.error(e);
        throw e;
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
        const queryKey = "sdk:pair-keepkey:test-1234";
        assert(queryKey);
        const username = "sdk:test-user-1234";
        assert(username);
        let config = {
            blockchains,
            username,
            queryKey,
            spec,
            wss
        };
        let app = new SDK.SDK(spec, config);
        log.info(tag, "app: ", app);
        //get KeepKey
        // let wallet = await start_keepkey_controller()
        //get HDwallet
        let wallet = await start_software_wallet();
        // let isNative = await wallet?._isNative
        // let isKeepKey = await wallet?._isKeepKey
        // console.log(wallet)
        // console.log("*** isNative: ",isNative)
        // console.log("*** isKeepKey: ",isKeepKey)
        let result = await app.init();
        log.info(tag, "result: ", result);
        //pair wallet
        if (!app.isConnected) {
            log.info(tag, "app.isConnected: ", app.isConnected);
            let resultPair = await app.pairWallet(wallet);
            log.info(tag, "resultPair: ", resultPair);
        }
        else {
            log.info(tag, "wallet info cached!");
        }
        let lp = {
            leg1: {
                blockchain: BLOCKCHAIN,
                asset: ASSET,
            },
            leg2: {
                blockchain: BLOCKCHAIN_OUTPUT,
                asset: OUTPUT_ASSET,
            },
            pair: "OSMO_ATOM",
            amountLeg1: "0.01",
            noBroadcast: false
        };
        //get max amount
        log.info(tag, "lp: ", lp);
        //get amount given input leg1 amount
        let quote = await app.lpQuote(lp);
        log.info(tag, "quote: ", quote);
        //TODO
        //get amount given input leg2 amount
        //build
        let txUnsigned = await app.buildLp(quote.invocationId);
        log.info(tag, "txUnsigned: ", txUnsigned);
        //execute
        let statusExecute = await app.execute(quote.invocationId);
        log.info(tag, "statusExecute: ", statusExecute);
        log.notice("****** TEST PASS ******");
        // //process
        // process.exit(0)
    }
    catch (e) {
        log.error(e);
        //process
        process.exit(666);
    }
};
test_service();
