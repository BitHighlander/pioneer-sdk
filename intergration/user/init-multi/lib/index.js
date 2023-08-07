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
const keepkey_sdk_1 = require("@keepkey/keepkey-sdk");
const core = __importStar(require("@shapeshiftoss/hdwallet-core"));
const hdwallet_keepkey_rest_1 = require("@keepkey/hdwallet-keepkey-rest");
const hdwallet_native_1 = require("@shapeshiftoss/hdwallet-native");
const log = require("@pioneer-platform/loggerdog")();
let assert = require('assert');
let SDK = require('@pioneer-sdk/sdk');
let wait = require('wait-promise');
let sleep = wait.sleep;
let BLOCKCHAIN = 'ethereum';
let ASSET = 'DAI';
let MIN_BALANCE = process.env['MIN_BALANCE_DOGE'] || "1.0004";
let TEST_AMOUNT = process.env['TEST_AMOUNT'] || "0.005";
let spec = process.env['URL_PIONEER_SPEC'] || 'https://pioneers.dev/spec/swagger.json';
let wss = process.env['URL_PIONEER_SOCKET'] || 'wss://pioneers.dev';
// let TRADE_PAIR  = "ETH_BTC"
// let INPUT_ASSET = ASSET
// let OUTPUT_ASSET = "BTC"
let noBroadcast = false;
console.log("spec: ", spec);
console.log("wss: ", wss);
// let blockchains = [
//     'avalanche'
// ]
let blockchains = [
    'bitcoin', 'ethereum', 'thorchain', 'bitcoincash', 'litecoin', 'binance', 'cosmos', 'dogecoin'
];
let txid;
let IS_SIGNED;
const start_metamask_wallet = async () => {
    const TAG = " | start_metamask_wallet | ";
    let wallet = {
        _isMetaMask: true,
        ethAddress: "0x33b35c665496ba8e71b22373843376740401f106",
        accounts: ['0x33b35c665496ba8e71b22373843376740401f106', '0xbda1b484152f32e215aa5457366ec537d0e35e4b', '0x651982e85d5e43db682cd6153488083e1b810798', '0xfeb8bf56e554fc47639e5ed9e1dae21dff69d6a9'],
        ethGetAddress: function () {
            return this.ethAddress;
        }
    };
    return wallet;
};
let metamask_accounts = [
    '0x33b35c665496ba8e71b22373843376740401f106', '0x651982e85D5E43db682cD6153488083e1b810798', '0xBDa1b484152F32e215aA5457366ec537d0E35e4B'
];
const start_software_wallet = async function () {
    try {
        let mnemonic = process.env['WALLET_MAIN'];
        if (!mnemonic)
            throw Error("Unable to load wallet! missing env WALLET_MAIN");
        console.log("mnemonic: ", mnemonic);
        const keyring = new core.Keyring();
        const nativeAdapter = hdwallet_native_1.NativeAdapter.useKeyring(keyring);
        let wallet = await nativeAdapter.pairDevice("testids");
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
const start_keepkey_controller = async function () {
    try {
        let serviceKey = "135085f0-5c73-4bb1-abf0-04ddfc710b07";
        let config = {
            apiKey: serviceKey,
            pairingInfo: {
                name: 'ShapeShift',
                imageUrl: 'https://assets.coincap.io/assets/icons/fox@2x.png',
                basePath: 'http://localhost:1646/spec/swagger.json',
                url: 'https://app.shapeshift.com',
            },
        };
        let sdk = await keepkey_sdk_1.KeepKeySdk.create(config);
        console.log(config.apiKey);
        const keyring = new core.Keyring();
        // let adapter = KkRestAdapter.create()
        // console.log("adapter: ",KkRestAdapter)
        // let wallet = await KkRestAdapter.pairDevice(sdk)
        // @ts-ignore
        let wallet = await hdwallet_keepkey_rest_1.KkRestAdapter.useKeyring(keyring).pairDevice(sdk);
        //console.log("wallet: ",wallet)
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
        log.info(tag, "queryKey: ", queryKey);
        // const queryKey = "key:66fefdd6-7ea9-48cf-8e69-fc74afb9c45412"
        assert(queryKey);
        const username = "user:66fefdd6-7ea9-48cf-8e69-fc74afb9c45412";
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
        log.debug(tag, "app: ", app);
        console.log(tag, ' CHECKPOINT 3');
        //forget
        // log.info(tag,"app.pioneer: ",app.pioneer.instance)
        // let resultForget = await app.pioneer.instance.Forget()
        // log.info(tag,"resultForget: ",resultForget.data)
        //get HDwallet
        let walletKeepKey = await start_keepkey_controller();
        let walletSoftware = await start_software_wallet();
        let walletMetaMask = await start_metamask_wallet();
        // let wallet = await start_software_wallet()
        log.debug(tag, "walletKeepKey: ", walletKeepKey);
        assert(walletKeepKey);
        log.debug(tag, "walletSoftware: ", walletSoftware);
        assert(walletSoftware);
        log.debug(tag, "wallet: ", walletMetaMask);
        assert(walletMetaMask);
        //Fucking race conditon
        await sleep(1000);
        //get pubkeys
        log.info(tag, "app: ", app);
        let pubkeysMetaMask = await app.getPubkeys(walletMetaMask);
        assert(pubkeysMetaMask);
        assert(pubkeysMetaMask.publicAddress);
        assert(pubkeysMetaMask.context);
        assert(pubkeysMetaMask.wallet);
        assert(pubkeysMetaMask.pubkeys.length, 1);
        log.info(tag, "pubkeysMetaMask: ", pubkeysMetaMask.pubkeys.length);
        //validate pubkeys
        let pubkeysNative = await app.getPubkeys(walletSoftware);
        assert(pubkeysNative);
        assert(pubkeysNative.publicAddress);
        assert(pubkeysNative.context);
        assert(pubkeysNative.wallet);
        assert(pubkeysNative.pubkeys.length, 9);
        log.info(tag, "pubkeysNative: ", pubkeysNative.pubkeys.length);
        let pubkeysKeepKey = await app.getPubkeys(walletKeepKey);
        assert(pubkeysKeepKey);
        assert(pubkeysKeepKey.publicAddress);
        assert(pubkeysKeepKey.context);
        assert(pubkeysKeepKey.wallet);
        assert(pubkeysKeepKey.pubkeys.length, 9);
        log.info(tag, "pubkeysKeepKey: ", pubkeysKeepKey.pubkeys.length);
        //init with metamask
        // let result = await app.init(walletMetaMask)
        // log.info(tag,"result: ",result)
        // assert(result)
        //init with software
        // let result = await app.init(walletSoftware)
        // log.info(tag,"result: ",result)
        // assert(result)
        //init with keepkey
        let result = await app.init(walletKeepKey);
        // log.info(tag,"result: ",result)
        assert(result);
        assert(app.wallet);
        assert(app.context);
        log.info(tag, "app.context: ", app.context);
        // assert(result.User)
        //get balances for keepkey
        //balances
        log.info("app.balances: ", app.balances);
        let balance1 = app.balances.filter((e) => e.symbol === ASSET);
        log.info("balance1: ", balance1);
        log.info("balance1: ", balance1[0].balance);
        assert(balance1);
        assert(balance1[0]);
        assert(balance1[0].balance);
        let user0 = await result.User();
        user0 = user0.data;
        // log.info(tag,"user0 user: ",user0)
        log.info(tag, "user0 isFox: ", user0.isFox);
        log.info(tag, "user0 isPioneer: ", user0.isPioneer);
        log.info(tag, "user0 wallets: ", user0.wallets);
        log.info(tag, "user0 walletDescriptions: ", user0.walletDescriptions);
        assert(user0);
        assert(user0.wallets);
        assert(user0.walletDescriptions);
        //get descripton
        let descriptionKeepKey = user0.walletDescriptions.filter((e) => e.type === "keepkey")[0];
        assert(descriptionKeepKey);
        // let descriptionMetamask = user0.walletDescriptions.filter((e:any) => e.type === "metamask")[0]
        // assert(descriptionMetamask)
        //verify isFox
        // assert(user0.isFox)
        //pair keepkey
        // let successKeepKey = await app.pairWallet(walletKeepKey)
        // log.info(tag,"successKeepKey: ",successKeepKey)
        // assert(successKeepKey)
        // app.refresh()
        // log.info(tag,"checkpoint post refresh: ")
        // let user1 = await result.User()
        // user1 = user1.data
        // log.info(tag,"user1 isFox: ",user1.isFox)
        // log.info(tag,"user1 isPioneer: ",user1.isPioneer)
        // log.info(tag,"user1 wallets: ",user1.wallets)
        // log.info(tag,"user1 walletDescriptions: ",user1.walletDescriptions)
        // assert(user1.wallets.length, 2)
        // assert(user1.walletDescriptions.length, 2)
        let successMetaMask = await app.pairWallet(walletMetaMask);
        log.info(tag, "successMetaMask: ", successMetaMask);
        assert(successMetaMask);
        app.refresh();
        log.info(tag, "checkpoint post refresh: ");
        //context should match first account
        let context = await app.context;
        log.info(tag, "context: ", context);
        assert(context);
        assert(context, "metamask.wallet.json");
        //all the other accounts should be in wallets just offline
        assert(app.wallet);
        let allWallets = await app.wallets;
        log.info(tag, "allWallets: ", allWallets);
        // assert(allWallets.length, metamask_accounts.length + 1) //plus keepkey
        let user1 = await result.User();
        user1 = user1.data;
        log.info(tag, "user1 isFox: ", user1.isFox);
        log.info(tag, "user1 isPioneer: ", user1.isPioneer);
        log.info(tag, "user1 wallets: ", user1.wallets);
        log.info(tag, "user1 walletDescriptions: ", user1.walletDescriptions);
        assert(user1.wallets.length, 2);
        assert(user1.walletDescriptions.length, 2);
        // assert(user1)
        //Should be Pioneer now
        // assert(user1.isPioneer)
        //pair softwareclea
        let successSoftware = await app.pairWallet(walletSoftware);
        log.info(tag, "successSoftware: ", successSoftware);
        assert(successSoftware);
        //verify all are paired
        //User
        let user2 = await result.User();
        user2 = user2.data;
        // log.info(tag,"user2: ",user2)
        log.info(tag, "user2 wallets: ", user2.wallets);
        log.info(tag, "user2 walletDescriptions: ", user2.walletDescriptions);
        //walletDescriptions
        //
        let metamaskWalletDescription = user2.walletDescriptions.filter((e) => e.type === "metamask");
        assert(metamaskWalletDescription.length, 1);
        log.info(tag, "metamaskWalletDescription: ", metamaskWalletDescription);
        let keepkeyWalletDescription = user2.walletDescriptions.filter((e) => e.type === "keepkey");
        assert(keepkeyWalletDescription.length, 1);
        log.info(tag, "keepkeyWalletDescription: ", keepkeyWalletDescription);
        let nativeWalletDescription = user2.walletDescriptions.filter((e) => e.type === "native");
        assert(nativeWalletDescription.length, 1);
        log.info(tag, "nativeWalletDescription: ", nativeWalletDescription);
        // app.refresh()
        // log.info(tag,"checkpoint post refresh: ")
        //
        // let nativeWalletDescription1 = user2.walletDescriptions.filter((e:any) => e.type === "native")
        // assert(nativeWalletDescription1)
        // log.info(tag,"nativeWalletDescription1: ",nativeWalletDescription1)
        //
        // let metamaskWalletDescription1 = user2.walletDescriptions.filter((e:any) => e.type === "metamask")
        // assert(metamaskWalletDescription1)
        // log.info(tag,"metamaskWalletDescription1: ",metamaskWalletDescription1)
        //
        // let keepkeyWalletDescription1 = user2.walletDescriptions.filter((e:any) => e.type === "keepkey")
        // assert(keepkeyWalletDescription1)
        // log.info(tag,"keepkeyWalletDescription1: ",keepkeyWalletDescription1)
        //verify isPioneer
        // assert(user2.isPioneer)
        // assert(user2.pioneerImage)
        // log.info(tag,"user2.pioneerImage: ",user2.pioneerImage)
        //switch context to metamask and get address
        // //path
        // log.debug(tag,"ASSET: ",ASSET)
        // let path = app.paths.filter((e:any) => e.symbol === ASSET)
        // log.debug("path: ",path)
        // log.debug("app.paths: ",app.paths.length)
        // assert(path[0])
        //
        // let pubkey = app.pubkeys.filter((e:any) => e.symbol === ASSET)
        // log.debug("pubkey: ",pubkey)
        // log.debug("app.pubkeys: ",app.pubkeys.length)
        // assert(pubkey[0])
        //
        // //verify you have a balance of selected asset
        // let balance = app.balances.filter((e:any) => e.symbol === ASSET)
        // log.debug("balance: ",balance)
        // log.debug("balance: ",balance[0].balance)
        // assert(balance)
        // assert(balance[0])
        // assert(balance[0].balance)
        //sync
        log.info("app.pubkeys: ", app.pubkeys);
        let pubkey = app.pubkeys.filter((e) => e.symbol === "ETH");
        log.info("pubkey: ", pubkey);
        log.info("app.pubkeys: ", app.pubkeys);
        assert(pubkey[0]);
        //sync pubkey
        let pubkeySynced = await app.getPubkey(pubkey[0].symbol, true);
        log.info("pubkeySynced: ", pubkeySynced);
        assert(pubkeySynced);
        assert(pubkeySynced.balances);
        //balances
        let balance = app.balances.filter((e) => e.symbol === ASSET);
        log.info("balance: ", balance);
        log.info("balance: ", balance[0].balance);
        assert(balance);
        assert(balance[0]);
        assert(balance[0].balance);
        //
        assert(app.wallet);
        //TODO context changing
        //should have a default context always
        let walletContext = await app.context;
        assert(walletContext);
        log.info("walletContext: ", walletContext);
        //get wallets
        let wallets = await app.wallets;
        log.info("wallets: ", wallets);
        assert(wallets.length, 3);
        //set to current wallet
        let changeContext = await app.setContext(wallets[0].wallet);
        // log.info("changeContext: ",changeContext)
        assert(changeContext);
        assert(app.context, wallets[0].context);
        assert(app.wallet);
        log.info("app.wallet: ", app.wallet);
        //get address on wallet on context
        const addressInfo = {
            addressNList: [2147483692, 2147483708, 2147483648, 0, 0],
            coin: "Ethereum",
            scriptType: "ethereum",
            showDisplay: false,
        };
        log.info(tag, "app.wallet: ", app.wallet);
        const address = await app.wallet.ethGetAddress(addressInfo);
        console.log("address0: ", address);
        let changeContext1 = await app.setContext(wallets[1].wallet);
        // log.info("changeContext: ",changeContext)
        assert(changeContext);
        assert(app.context, wallets[1]);
        assert(app.wallet);
        const address1 = await app.wallet.ethGetAddress(addressInfo);
        console.log("address1: ", address1);
        let changeContext2 = await app.setContext(wallets[2].wallet);
        // log.info("changeContext: ",changeContext)
        assert(changeContext);
        assert(app.context, wallets[2]);
        assert(app.wallet);
        const address2 = await app.wallet.ethGetAddress(addressInfo);
        console.log("address2: ", address2);
        //verify wallet has changed
        // let blockchainContext = await app.blockchainContext
        // assert(blockchainContext)
        // log.info("blockchainContext: ",blockchainContext)
        //
        // //set blockchain context
        // let changeBlockchainContext = await app.setBlockchainContext(BLOCKCHAIN)
        // assert(changeBlockchainContext)
        // log.info("changeBlockchainContext: ",changeBlockchainContext)
        //
        // let blockchainContextPost = await app.blockchainContext
        // assert(blockchainContextPost, BLOCKCHAIN)
        // log.info("blockchainContextPost: ",blockchainContextPost)
        //
        // //set asset context
        // let assetContext = await app.assetContext
        // assert(assetContext)
        // log.info("assetContext: ",assetContext)
        //
        // let changeAssetContext = await app.setAssetContext(ASSET)
        // assert(changeAssetContext)
        // log.info("changeAssetContext: ",changeAssetContext)
        //
        // //set asset context
        // let assetContextPost = await app.assetContext
        // assert(assetContextPost, ASSET)
        // log.info("assetContextPost: ",assetContextPost)
        //attempt to change wallet context to unpaired wallet
        //attempt to change blockchain context to unsupported by current wallet
        //attempt to change asset context to a unsupported asset of current blockchain
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
