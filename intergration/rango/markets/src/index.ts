/*
    E2E testing

 */

require("dotenv").config()
require('dotenv').config({path:"../../.env"});
require('dotenv').config({path:"./../../.env"});
require("dotenv").config({path:'../../../.env'})
require("dotenv").config({path:'../../../../.env'})

const TAG  = " | intergration-test | "

import * as core from "@shapeshiftoss/hdwallet-core";
import * as native from "@shapeshiftoss/hdwallet-native";

const log = require("@pioneer-platform/loggerdog")()
let assert = require('assert')
import {v4 as uuidv4} from 'uuid';
let SDK = require('@pioneer-sdk/sdk')
let wait = require('wait-promise');
let sleep = wait.sleep;

let BLOCKCHAIN = 'ethereum'
let BLOCKCHAIN_OUTPUT = 'bitcoin'
let ASSET = 'ETH'
let MIN_BALANCE = process.env['MIN_BALANCE_LTC'] || "0.004"
let TEST_AMOUNT = process.env['TEST_AMOUNT'] || "0.05"
let spec = process.env['URL_PIONEER_SPEC'] || 'https://pioneers.dev/spec/swagger.json'
let wss = process.env['URL_PIONEER_SOCKET'] || 'wss://pioneers.dev'

let TRADE_PAIR  = "ETH_BTC"
let INPUT_ASSET = ASSET
let OUTPUT_ASSET = "BTC"

//hdwallet Keepkey
let Controller = require("@keepkey/keepkey-hardware-controller")


let noBroadcast = false

console.log("spec: ",spec)
console.log("wss: ",wss)

let blockchains = [
    'bitcoin','ethereum','thorchain','bitcoincash','litecoin','binance','cosmos','dogecoin','osmosis'
]

let txid:string

let IS_SIGNED: boolean

// let invocationId:string
let invocationId = '95a8db44-bcc2-4a21-b970-7b3f7e172cd9'

const start_keepkey_controller = async function(){
    try{
        let config = {
        }

        //sub ALL events
        let controller = new Controller.KeepKey(config)

        //state
        controller.events.on('state', function (request:any) {
            console.log("state: ", request)
        })

        //errors
        controller.events.on('error', function (request:any) {
            console.log("state: ", request)
        })

        //logs
        controller.events.on('logs', function (request:any) {
            console.log("logs: ", request)
        })

        controller.init()

        while(!controller.wallet){
            await sleep(1000)
        }
        return controller.wallet
    }catch(e){
        console.error(e)
    }
}

const start_software_wallet = async function(){
    try{
        let mnemonic = process.env['WALLET_MAIN']
        if(!mnemonic) throw Error("Unable to load wallet! missing env WALLET_MAIN")
        const keyring = new core.Keyring();
        //@ts-ignore
        const nativeAdapter = native.NativeAdapter.useKeyring(keyring, {
            mnemonic,
            deviceId: "native-wallet-test",
        });
        let wallet = await nativeAdapter.pairDevice("testid");
        if(!wallet) throw Error("failed to init wallet!")
        return wallet
    }catch(e){
        console.error(e)
    }
}

const test_service = async function () {
    let tag = TAG + " | test_service | "
    try {
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
        let app = new SDK.SDK(spec,config)
        log.info(tag,"app: ",app)

        //verify paths
        log.info(tag,"paths: ",app.paths.length)
        log.info(tag,"paths: ",app.paths)

        //get HDwallet
        let wallet = await start_keepkey_controller()
        // let wallet = await start_software_wallet()
        log.info(tag,"wallet: ",wallet)



        // //init with HDwallet
        let result = await app.init()
        log.info(tag,"result: ",result)


        //pair wallet
        if(!app.isConnected){
            let resultPair = await app.pairWallet(wallet)
            // log.info(tag,"resultPair: ",resultPair)
        }

        log.info(tag,"app.availableOutputs: ",app.availableOutputs)

        let runeInfo = app.availableOutputs.filter((e:any) => e.symbol === "RUNE")
        log.info(tag,"runeInfo: ",runeInfo)


        let runeInfo1 = app.availableOutputs.filter((e:any) => e.symbol === "THOR")
        log.info(tag,"runeInfo1: ",runeInfo1)

        let runeInfo2 = app.availableOutputs.filter((e:any) => e.blockchain === "THORCHAIN")
        log.info(tag,"runeInfo2: ",runeInfo2)

        //Test remote objects
        //get available inputs
        // assert(app.availableInputs)
        //get available outputs
        // assert(app.availableOutputs)


        log.notice("****** TEST PASS ******")
        //process
        process.exit(0)
    } catch (e) {
        log.error(e)
        //process
        process.exit(666)
    }
}
test_service()
