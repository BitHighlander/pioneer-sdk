/*
    E2E testing

 */

require("dotenv").config()
require('dotenv').config({path:"../../.env"});
require('dotenv').config({path:"./../../.env"});
require("dotenv").config({path:'../../../.env'})
require("dotenv").config({path:'../../../../.env'})

const TAG  = " | intergration-test | "
import { KeepKeySdk } from '@keepkey/keepkey-sdk'
import * as core from "@shapeshiftoss/hdwallet-core";
import { KkRestAdapter } from '@keepkey/hdwallet-keepkey-rest'
import { NativeAdapter } from '@shapeshiftoss/hdwallet-native'
const log = require("@pioneer-platform/loggerdog")()
let assert = require('assert')
let SDK = require('@pioneer-sdk/sdk')
let wait = require('wait-promise');

let sleep = wait.sleep;

let BLOCKCHAIN = 'ethereum'
let BLOCKCHAIN_OUTPUT = 'bitcoin'
let ASSET = 'ETH'
let MIN_BALANCE = process.env['MIN_BALANCE_OSMO'] || "0.004"
let TEST_AMOUNT = process.env['TEST_AMOUNT'] || "0.05"
let spec = process.env['URL_PIONEER_SPEC'] || 'https://pioneers.dev/spec/swagger.json'
let wss = process.env['URL_PIONEER_SOCKET'] || 'wss://pioneers.dev'

// let TRADE_PAIR  = "ETH_BTC"
// let INPUT_ASSET = ASSET
// let OUTPUT_ASSET = "BTC"


let noBroadcast = false

console.log("spec: ",spec)
console.log("wss: ",wss)

let blockchains = [
    'bitcoin','ethereum','thorchain','bitcoincash','litecoin','binance','cosmos','dogecoin'
]

let txid:string

let IS_SIGNED: boolean

const start_software_wallet = async function(){
    try{
        let mnemonic = process.env['WALLET_MAIN']
        if(!mnemonic) throw Error("Unable to load wallet! missing env WALLET_MAIN")
        const keyring = new core.Keyring();
        const nativeAdapter = NativeAdapter.useKeyring(keyring);
        let wallet = await nativeAdapter.pairDevice("testid");
        //@ts-ignore
        await nativeAdapter.initialize();
        // @ts-ignore
        wallet.loadDevice({ mnemonic });
        if(!wallet) throw Error("failed to init wallet!")
        return wallet
    }catch(e){
        console.error(e)
    }
}

const test_service = async function () {
    let tag = TAG + " | test_service | "
    try {
        console.log(tag,' CHECKPOINT 1');
        console.time('start2paired');
        console.time('start2build');
        console.time('start2broadcast');
        console.time('start2end');

        //if force new user
        //const queryKey = "sdk:pair-keepkey:"+uuidv4();
        const queryKey = process.env['PIONEER_QUERYKEY'];
        assert(queryKey)

        const username = process.env['PIONEER_USERNAME'];
        assert(username)
        
        //add custom path
        let paths:any = [
        ]
        
        let config:any = {
            blockchains,
            username,
            queryKey,
            spec,
            wss,
            paths
        }
        console.log(tag,' CHECKPOINT 2');
        let app = new SDK.SDK(spec,config)
        log.info(tag,"app: ",app)
        console.log(tag,' CHECKPOINT 3');
        //forget
        // log.info(tag,"app.pioneer: ",app.pioneer.instance)
        // let resultForget = await app.pioneer.instance.Forget()
        // log.info(tag,"resultForget: ",resultForget.data)

        
        //get HDwallet
        let wallet = await start_software_wallet()
        // let wallet = await start_software_wallet()
        log.debug(tag,"wallet: ",wallet)
        assert(wallet)
        
        //init with HDwallet
        let result = await app.init(wallet)
        log.info(tag,"result: ",result)

        //verify a pubkey for every chain
        
        //refresh
        // let resultRefresh = await app.refresh()
        // log.info(tag,"resultRefresh: ",resultRefresh)
        
        let events = await app.startSocket()

        events.on('message', (event:any) => {
            log.info(tag,"***** message event!", event)
        });
        
        events.on('blocks', (event:any) => {
            log.info(tag,"***** blocks event!", event)
        });
        
        //perform search
        
        //send message

        log.notice("****** TEST PASS ******")
        //process
        //process.exit(0)
    } catch (e) {
        log.error(e)
        //process
        process.exit(666)
    }
}
test_service()
