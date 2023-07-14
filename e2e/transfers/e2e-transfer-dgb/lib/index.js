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
const core = __importStar(require("@shapeshiftoss/hdwallet-core"));
const native = __importStar(require("@shapeshiftoss/hdwallet-native"));
const log = require("@pioneer-platform/loggerdog")();
let assert = require('assert');
let SDK = require('@pioneer-sdk/sdk');
let wait = require('wait-promise');
let sleep = wait.sleep;
let BLOCKCHAIN = 'digibytes';
let ASSET = 'DGB';
let MIN_BALANCE = process.env['MIN_BALANCE_LTC'] || "0.004";
let TEST_AMOUNT = process.env['TEST_AMOUNT'] || "0.0001";
let spec = process.env['URL_PIONEER_SPEC'] || 'https://pioneers.dev/spec/swagger.json';
let wss = process.env['URL_PIONEER_SOCKET'] || 'wss://pioneers.dev';
let FAUCET_ADDRESS = process.env['FAUCET_DGB_ADDRESS'];
if (!FAUCET_ADDRESS)
    throw Error("Need Faucet Address!");
//hdwallet Keepkey
let Controller = require("@keepkey/keepkey-hardware-controller");
let noBroadcast = true;
console.log("spec: ", spec);
console.log("wss: ", wss);
let blockchains = [
    'bitcoin', 'ethereum', 'thorchain', 'bitcoincash', 'litecoin', 'binance', 'cosmos', 'dogecoin', 'osmosis'
];
let txid;
let invocationId;
let IS_SIGNED;
//use noBroadcast by default
let params = process.argv;
//is param passed then publish to chain (THIS COSTS FEES BRO!)
if (params[0] === 'broadcast')
    noBroadcast = false;
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
        const queryKey = "sdk:pair-keepkey:test-1234";
        assert(queryKey);
        const username = "sdk:test-user-1234";
        assert(username);
        //add custom path
        let paths = [
            {
                note: "Bitcoin account Native Segwit (Bech32)",
                blockchain: 'bitcoin',
                symbol: 'BTC',
                network: 'BTC',
                script_type: "p2wpkh",
                available_scripts_types: ['p2pkh', 'p2sh', 'p2wpkh', 'p2sh-p2wpkh'],
                type: "zpub",
                addressNList: [0x80000000 + 84, 0x80000000 + 0, 0x80000000 + 0],
                addressNListMaster: [0x80000000 + 84, 0x80000000 + 0, 0x80000000 + 0, 0, 0],
                curve: 'secp256k1',
                showDisplay: false // Not supported by TrezorConnect or Ledger, but KeepKey should do it
            }
        ];
        let config = {
            blockchains,
            username,
            queryKey,
            spec,
            paths,
            wss
        };
        let app = new SDK.SDK(spec, config);
        // log.info(tag,"app: ",app)
        //get HDwallet
        let wallet = await start_keepkey_controller();
        // let wallet = await start_software_wallet()
        // log.info(tag,"wallet: ",wallet)
        //init with HDwallet
        let result = await app.init(wallet);
        //log.info(tag,"result: ",result)
        assert(app.username);
        assert(app.context);
        // // console.log("context: ",app.context)
        log.info(tag, "pubkeys: ", app.pubkeys.length);
        log.info(tag, "balances: ", app.balances.length);
        // let send = {
        //     blockchain:BLOCKCHAIN,
        //     asset:ASSET,
        //     address:FAUCET_BTC_ADDRESS,
        //     amount:"MAX"
        // }
        let send = {
            blockchain: BLOCKCHAIN,
            asset: ASSET,
            address: FAUCET_ADDRESS,
            amount: TEST_AMOUNT
        };
        let tx = {
            type: 'sendToAddress',
            payload: send
        };
        let invocationId = await app.build(tx);
        log.info(tag, "invocationId: ", invocationId);
        //signTx
        let resultSign = await app.sign(invocationId);
        log.info(tag, "resultSign: ", resultSign);
        //get txid
        let payload = {
            noBroadcast: false,
            sync: true,
            invocationId
        };
        let resultBroadcast = await app.broadcast(payload);
        log.info(tag, "resultBroadcast: ", resultBroadcast);
        assert(resultBroadcast);
        assert(resultBroadcast.broadcast);
        assert(resultBroadcast.broadcast.success);
        /*
            Status codes
            -1: errored
             0: unknown
             1: built
             2: broadcasted
             3: confirmed
             4: fullfilled (swap completed)
         */
        //monitor tx lifecycle
        let isConfirmed = false;
        let isFullfilled = false;
        let fullfillmentTxid = false;
        let currentStatus;
        let statusCode = 0;
        //wait till confirmed
        while (!isConfirmed) {
            log.info("check for confirmations");
            //
            let invocationInfo = await app.getInvocation(invocationId);
            log.debug(tag, "invocationInfo: (VIEW) ", invocationInfo);
            log.info(tag, "invocationInfo: (VIEW): ", invocationInfo.state);
            if (invocationInfo.broadcast.noBroadcast) {
                log.notice(tag, "noBroadcast flag found: exiting ");
                statusCode = 3;
                isConfirmed = true;
            }
            if (invocationInfo && invocationInfo.isConfirmed) {
                log.test(tag, "Confirmed!");
                statusCode = 3;
                isConfirmed = true;
                console.timeEnd('timeToConfirmed');
                console.time('confirm2fullfillment');
            }
            else {
                log.test(tag, "Not Confirmed!", new Date().getTime());
            }
            await sleep(3000);
            log.info("sleep over");
        }
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
