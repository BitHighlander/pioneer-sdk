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
import { NativeAdapter } from '@shapeshiftoss/hdwallet-native'
import { KeepKeySdk } from '@keepkey/keepkey-sdk'
import { KkRestAdapter } from '@keepkey/hdwallet-keepkey-rest'

const log = require("@pioneer-platform/loggerdog")()
let assert = require('assert')
import {v4 as uuidv4} from 'uuid';
let SDK = require('@pioneer-sdk/sdk')
let wait = require('wait-promise');
let sleep = wait.sleep;

let BLOCKCHAIN = 'thorchain'
let ASSET = 'RUNE'
let MIN_BALANCE = process.env['MIN_BALANCE_ETH'] || "0.004"
let TEST_AMOUNT = process.env['TEST_AMOUNT'] || "0.0005"
let spec = process.env['URL_PIONEER_SPEC'] || 'https://pioneers.dev/spec/swagger.json'
let wss = process.env['URL_PIONEER_SOCKET'] || 'wss://pioneers.dev'
let FAUCET_ADDRESS = process.env['FAUCET_RUNE_ADDRESS']
if(!FAUCET_ADDRESS) throw Error("Need Faucet Address!")
let TEST_MEMO = process.env['TEST_MEMO'] || 'e2e-pioneer-test'

//hdwallet Keepkey
let Controller = require("@keepkey/keepkey-hardware-controller")

let noBroadcast = false

console.log("spec: ",spec)
console.log("wss: ",wss)

let blockchains = [
    'bitcoin','ethereum','thorchain','bitcoincash','litecoin','binance','cosmos','dogecoin','osmosis'
]

let txid:string
// let invocationId:string
//pioneer:invocation:v0.01:RUNE:wHvdY2dTBXEUQcMRTBef4M
let invocationId = 'pioneer:invocation:v0.01:RUNE:wHvdY2dTBXEUQcMRTBef4M'
let IS_SIGNED: boolean

const start_keepkey_controller = async function(){
    try{
        let serviceKey = "135085f0-5c73-4bb1-abf0-04ddfc710b07"
        let config: any = {
            apiKey: serviceKey,
            pairingInfo: {
                name: 'ShapeShift',
                imageUrl: 'https://assets.coincap.io/assets/icons/fox@2x.png',
                basePath: 'http://localhost:1646/spec/swagger.json',
                url: 'https://app.shapeshift.com',
            },
        }
        let sdk = await KeepKeySdk.create(config)
        const keyring = new core.Keyring();
        // @ts-ignore
        let wallet = await KkRestAdapter.useKeyring(keyring).pairDevice(sdk)
        return wallet
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
        const queryKey = "sdk:pair-keepkey:test-12345";
        assert(queryKey)

        const username = "sdk:test-user-12345";
        assert(username)

        let config:any = {
            blockchains,
            username,
            queryKey,
            spec,
            wss,
            paths:[]
        }
        let app = new SDK.SDK(spec,config)
        log.debug(tag,"app: ",app)
        //
        //get HDwallet
        let wallet = await start_keepkey_controller()
        // let wallet = await start_software_wallet()
        log.debug(tag,"wallet: ",wallet)

        //init with HDwallet
        let result = await app.init(wallet)
        log.debug(tag,"result: ",result)

        let send = {
            blockchain:BLOCKCHAIN,
            asset:ASSET,
            address:FAUCET_ADDRESS,
            amount:TEST_AMOUNT,
            memo:TEST_MEMO,
            noBroadcast:false
        }

        let tx = {
            type:'sendToAddress',
            payload:send
        }

        log.debug("tx: ",tx)
        let invocationId = await app.build(tx)
        log.debug(tag,"invocationId: ",invocationId)

        //signTx
        let resultSign = await app.sign(invocationId)
        log.debug(tag,"resultSign: ",resultSign)

        
        //get txid
        let payload = {
            noBroadcast:false,
            sync:true,
            invocationId
        }
        let resultBroadcast = await app.broadcast(payload)
        log.debug(tag,"resultBroadcast: ",resultBroadcast)

        assert(resultBroadcast)
        assert(resultBroadcast.broadcast)
        assert(resultBroadcast.broadcast.success)


        let checkTx = async function(){
            try{
                log.debug(tag,"checkTx")
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
                let isConfirmed = false
                let isFullfilled = false
                let fullfillmentTxid = false
                let currentStatus
                let statusCode = 0

                    log.debug("check for confirmations")
                    //
                    let invocationInfo = await app.getInvocation(invocationId)
                    log.debug(tag,"invocationInfo: (VIEW) ",invocationInfo)
                    log.debug(tag,"invocationInfo: (VIEW): ",invocationInfo.state)

                    if(invocationInfo.broadcast.noBroadcast){
                        log.notice(tag,"noBroadcast flag found: exiting ")
                        statusCode = 3
                        isConfirmed = true
                    }

                    if(invocationInfo && invocationInfo.isConfirmed){
                        log.test(tag,"Confirmed!")
                        statusCode = 3
                        isConfirmed = true
                        console.timeEnd('timeToConfirmed')
                        console.time('confirm2fullfillment')

                        log.notice("****** TEST PASS ******")
                        //process
                        process.exit(0)
                    } else {
                        log.test(tag,"Not Confirmed!",new Date().getTime())
                    }

            }catch(e){

            }
        }

        app.events.events.on('blocks', (event:any) => {
            log.debug(tag,"blocks event!", event)

            checkTx()

        })

        //
        // /*
        //     Status codes
        //     -1: errored
        //      0: unknown
        //      1: built
        //      2: broadcasted
        //      3: confirmed
        //      4: fullfilled (swap completed)
        //  */
        // //monitor tx lifecycle
        // let isConfirmed = false
        // let isFullfilled = false
        // let fullfillmentTxid = false
        // let currentStatus
        // let statusCode = 0
        //
        // //wait till confirmed
        // while(!isConfirmed){
        //     log.debug("check for confirmations")
        //     //
        //     let invocationInfo = await app.getInvocation(invocationId)
        //     log.debug(tag,"invocationInfo: (VIEW) ",invocationInfo)
        //     log.debug(tag,"invocationInfo: (VIEW): ",invocationInfo.state)
        //
        //     if(invocationInfo.broadcast.noBroadcast){
        //         log.notice(tag,"noBroadcast flag found: exiting ")
        //         statusCode = 3
        //         isConfirmed = true
        //     }
        //
        //     if(invocationInfo && invocationInfo.isConfirmed){
        //         log.test(tag,"Confirmed!")
        //         statusCode = 3
        //         isConfirmed = true
        //         console.timeEnd('timeToConfirmed')
        //         console.time('confirm2fullfillment')
        //     } else {
        //         log.test(tag,"Not Confirmed!",new Date().getTime())
        //     }
        //
        //     await sleep(3000)
        //     log.debug("sleep over")
        // }
        
    } catch (e) {
        log.error(e)
        //process
        process.exit(666)
    }
}
test_service()
