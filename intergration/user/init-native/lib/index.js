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
const hdwallet_native_1 = require("@shapeshiftoss/hdwallet-native");
const log = require("@pioneer-platform/loggerdog")();
let assert = require('assert');
let SDK = require('@pioneer-sdk/sdk');
let wait = require('wait-promise');
let sleep = wait.sleep;
let BLOCKCHAIN = 'ethereum';
let BLOCKCHAIN_OUTPUT = 'bitcoin';
let ASSET = 'ETH';
let MIN_BALANCE = process.env['MIN_BALANCE_OSMO'] || "0.004";
let TEST_AMOUNT = process.env['TEST_AMOUNT'] || "0.05";
let spec = process.env['URL_PIONEER_SPEC'] || 'https://pioneers.dev/spec/swagger.json';
let wss = process.env['URL_PIONEER_SOCKET'] || 'wss://pioneers.dev';
// let TRADE_PAIR  = "ETH_BTC"
// let INPUT_ASSET = ASSET
// let OUTPUT_ASSET = "BTC"
let noBroadcast = false;
console.log("spec: ", spec);
console.log("wss: ", wss);
let blockchains = [
    'bitcoin', 'ethereum', 'thorchain', 'bitcoincash', 'litecoin', 'binance', 'cosmos', 'dogecoin'
];
let txid;
let IS_SIGNED;
const start_software_wallet = async function () {
    try {
        let mnemonic = process.env['WALLET_MAIN'];
        if (!mnemonic)
            throw Error("Unable to load wallet! missing env WALLET_MAIN");
        console.log("mnemonic: ", mnemonic);
        const keyring = new core.Keyring();
        const nativeAdapter = hdwallet_native_1.NativeAdapter.useKeyring(keyring);
        let wallet = await nativeAdapter.pairDevice("testid");
        //@ts-ignore
        await nativeAdapter.initialize();
        // @ts-ignore
        wallet.loadDevice({ mnemonic });
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
        console.log(tag, ' CHECKPOINT 1');
        console.time('start2paired');
        console.time('start2build');
        console.time('start2broadcast');
        console.time('start2end');
        //if force new user
        const queryKey = "sdk:pair-keepkey:" + Math.random();
        // const queryKey = process.env['PIONEER_QUERYKEY'];
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
        console.log(tag, ' CHECKPOINT 2');
        let app = new SDK.SDK(spec, config);
        log.info(tag, "app: ", app);
        console.log(tag, ' CHECKPOINT 3');
        //forget
        // log.info(tag,"app.pioneer: ",app.pioneer.instance)
        // let resultForget = await app.pioneer.instance.Forget()
        // log.info(tag,"resultForget: ",resultForget.data)
        //verify paths
        //NOTE bitcoin has 2 paths, and this is NOT equal to the number of blockchains
        // log.info(tag,"blockchains: ",blockchains)
        // log.info(tag,"paths: ",app.paths)
        // log.info(tag,"paths: ",app.paths.length)
        // log.info(tag,"blockchains: ",blockchains.length)
        // if(app.paths.length !== blockchains.length){
        //     let blockchainsInPaths:any = []
        //     for(let i = 0; i < app.paths.length; i++){
        //         blockchainsInPaths.push(app.paths[i].blockchain)
        //     }
        //     log.error(tag,"blockchains: ",blockchains)
        //     log.error(tag,"blockchainsInPaths: ",blockchainsInPaths)
        //     let missing = blockchainsInPaths.filter((item: string) => blockchains.indexOf(item) < 0);
        //     log.info(tag,"missing: ",missing)
        // }
        // assert(app.paths.length === blockchains.length)
        //get HDwallet
        let wallet = await start_software_wallet();
        // let wallet = await start_software_wallet()
        log.debug(tag, "wallet: ", wallet);
        assert(wallet);
        // let pubkeysNative = await app.getPubkeys(wallet)
        // assert(pubkeysNative)
        // assert(pubkeysNative.publicAddress)
        // assert(pubkeysNative.context)
        // assert(pubkeysNative.wallet)
        // // assert(pubkeysMetaMask.pubkeys.length, 1)
        // log.info(tag,"pubkeysNative: ",pubkeysNative)
        //init with HDwallet
        let result = await app.init(wallet);
        log.info(tag, "result: ", result);
        //path
        log.info(tag, "ASSET: ", ASSET);
        let path = app.paths.filter((e) => e.symbol === ASSET);
        log.info("path: ", path);
        log.info("app.paths: ", app.paths.length);
        assert(path[0]);
        let pubkey = app.pubkeys.filter((e) => e.symbol === ASSET);
        log.info("pubkey: ", pubkey);
        log.info("app.pubkeys: ", app.pubkeys.length);
        assert(pubkey[0]);
        // let balance = app.balances.filter((e:any) => e.symbol === ASSET)
        // log.info("balance: ",balance)
        // log.info("balance: ",balance[0].balance)
        // assert(balance)
        // assert(balance[0])
        // assert(balance[0].balance)
        //verify a pubkey for every chain
        //refresh
        // let resultRefresh = await app.refresh()
        // log.info(tag,"resultRefresh: ",resultRefresh)
        // let events = await app.startSocket()
        //
        // events.on('blocks', (event:any) => {
        //     log.info(tag,"***** blocks event!", event)
        // });
        //LOAD SEED TO KEEPKEY @TODO move to its own test
        // //wipe
        // let resultWipe = await wallet.wipe()
        // log.info(tag,"resultWipe: ",resultWipe)
        //
        // //load
        // console.log("WALLET_MAIN: ",process.env['WALLET_MAIN'])
        // let resultLoad = await wallet.loadDevice({
        //     mnemonic:process.env['WALLET_MAIN']
        // })
        // log.info(tag,"resultLoad: ",resultLoad)
        //expect
        //xpub
        //zpub6rLj8yHs3mXRYSGNBSbajrkwghwLtpZLJf16q8bETA2mhZsMQdcPhXE4QQJAkQMAv8wpVeZYWqm3V45zzyAYS7exCugndVv8F8PmGfBTC5i
        //iterate over pubkeys
        //verify all are valid
        // for(let i = 0; i < app.pubkeys.length; i++){
        //     let pubkey = app.pubkeys[i]
        //     // log.info(tag,pubkey.blockchain+ " path: "+pubkey.path + " pubkey: ",pubkey)
        //     log.info(tag,pubkey.blockchain+ " path: "+pubkey.path + " script_type: "+pubkey.script_type+" pubkey: ",pubkey.pubkey)
        //     assert(pubkey.pubkey)
        // }
        // let ethPubkeys = app.pubkeys.filter((e:any) => e.symbol === "ETH")
        // log.info("ethPubkeys: ",ethPubkeys)
        //
        //
        // let ethBalances = app.balances.filter((e:any) => e.symbol === "ETH")
        // log.info("ethBalances: ",ethBalances)
        // log.info("ethBalances: ",ethBalances[0].balance)
        //update
        // let refreshResult = await app.refresh()
        // log.info("refreshResult: ",refreshResult)
        // let refreshUpdate = await app.updateContext()
        // log.info("refreshUpdate: ",refreshUpdate)
        //
        // // let ethBalances2 = app.balances.filter((e:any) => e.symbol === "ETH")
        // // // log.info("ethBalances: ",ethBalances)
        // // log.info("ethBalances2: ",ethBalances2[0].balance)
        //
        // let bitcoinPubkeys = app.pubkeys.filter((e:any) => e.symbol === "BTC")
        // log.info("bitcoinPubkeys: ",bitcoinPubkeys)
        //
        // let bitcoinBalances = app.balances.filter((e:any) => e.symbol === "BTC")
        // log.info("bitcoinBalances: ",bitcoinBalances)
        //
        // //verify usd value correct
        // for(let i = 0; i < bitcoinBalances.length; i++){
        //     let balance = bitcoinBalances[i]
        //     log.info(tag,"** balance: ",balance.balance)
        //     log.info(tag,"** priceUsd: ",balance.priceUsd)
        // }
        //
        // //rune
        // let runeBalance = app.balances.filter((e:any) => e.symbol === "RUNE")
        // log.info("runeBalance: ",runeBalance)
        // //get prefured pubkey
        // let preferedPubkey = await app.getPubkey('BTC')
        // log.info("preferedPubkey: ",preferedPubkey)
        //
        // //get balance (aggrate)
        // // let preferedPubkey = app.getBalance('BTC')
        // // log.info("preferedPubkey: ",preferedPubkey)
        //
        // //get address (of primary)
        // let preferredAddy = await app.getAddress('BTC')
        // log.info("preferredAddy: ",preferredAddy)
        //
        // //Test remote objects
        // //get available inputs
        // // assert(app.availableInputs)
        // //get available outputs
        // // assert(app.availableOutputs)
        //listen to events
        log.notice("****** TEST PASS ******");
        //process
        //process.exit(0)
    }
    catch (e) {
        log.error(e);
        //process
        process.exit(666);
    }
};
test_service();
