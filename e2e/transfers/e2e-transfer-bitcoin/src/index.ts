/*
    E2E testing

 */

require("dotenv").config()
require('dotenv').config({path:"../../.env"});
require('dotenv').config({path:"./../../.env"});
require("dotenv").config({path:'../../../.env'})
require("dotenv").config({path:'../../../../.env'})

const TAG  = " | e2e-test | "

import * as core from "@shapeshiftoss/hdwallet-core";
import * as native from "@shapeshiftoss/hdwallet-native";

const log = require("@pioneer-platform/loggerdog")()
let assert = require('assert')
import {v4 as uuidv4} from 'uuid';
let SDK = require('@pioneer-sdk/sdk')
let wait = require('wait-promise');
let sleep = wait.sleep;

let BLOCKCHAIN = 'bitcoincash'
let ASSET = 'BTC'
let MIN_BALANCE = process.env['MIN_BALANCE_LTC'] || "0.004"
let TEST_AMOUNT = process.env['TEST_AMOUNT'] || "0.0001"
let spec = process.env['URL_PIONEER_SPEC'] || 'https://pioneers.dev/spec/swagger.json'
let wss = process.env['URL_PIONEER_SOCKET'] || 'wss://pioneers.dev'
let FAUCET_BTC_ADDRESS = process.env['FAUCET_BTC_ADDRESS']
let FAUCET_ADDRESS = FAUCET_BTC_ADDRESS
if(!FAUCET_ADDRESS) throw Error("Need Faucet Address!")

//hdwallet Keepkey
// let Controller = require("@keepkey/keepkey-hardware-controller")


let noBroadcast = false

console.log("spec: ",spec)
console.log("wss: ",wss)

let blockchains = [
    'bitcoin','ethereum','thorchain','bitcoincash','litecoin','binance','cosmos','dogecoin','osmosis'
]

let txid:string
let invocationId:string
let IS_SIGNED: boolean

// const start_keepkey_controller = async function(){
//     try{
//         let config = {
//         }
//
//         //sub ALL events
//         let controller = new Controller.KeepKey(config)
//
//         //state
//         controller.events.on('state', function (request:any) {
//             console.log("state: ", request)
//         })
//
//         //errors
//         controller.events.on('error', function (request:any) {
//             console.log("state: ", request)
//         })
//
//         //logs
//         controller.events.on('logs', function (request:any) {
//             console.log("logs: ", request)
//         })
//
//         controller.init()
//
//         while(!controller.wallet){
//             await sleep(1000)
//         }
//         return controller.wallet
//     }catch(e){
//         console.error(e)
//     }
// }

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

        const queryKey = "sdk:pair-keepkey:"+uuidv4();
        assert(queryKey)

        let config:any = {
            queryKey,
            spec,
            wss
        }
        let app = new SDK.SDK(spec,config)
        log.info(tag,"app: ",app)

        //get HDwallet
        // let wallet = await start_keepkey_controller()
        let wallet = await start_software_wallet()
        log.info(tag,"wallet: ",wallet)
        
        //init with HDwallet
        let result = await app.init(wallet)
        log.info(tag,"result: ",result)


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
