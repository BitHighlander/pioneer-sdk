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

let BLOCKCHAIN = 'bitcoin'
let BLOCKCHAIN_OUTPUT = 'ethereum'
let ASSET = 'BTC'
let MIN_BALANCE = process.env['MIN_BALANCE_LTC'] || "0.004"
let TEST_AMOUNT = process.env['TEST_AMOUNT'] || "0.0006"
let spec = process.env['URL_PIONEER_SPEC'] || 'https://pioneers.dev/spec/swagger.json'
let wss = process.env['URL_PIONEER_SOCKET'] || 'wss://pioneers.dev'
let FAUCET_BTC_ADDRESS = process.env['FAUCET_BTC_ADDRESS']
let FAUCET_ADDRESS = FAUCET_BTC_ADDRESS
if(!FAUCET_ADDRESS) throw Error("Need Faucet Address!")

let TRADE_PAIR  = "BTC_ETH"
let INPUT_ASSET = ASSET
let OUTPUT_ASSET = "ETH"

//hdwallet Keepkey
let Controller = require("@keepkey/keepkey-hardware-controller")


let noBroadcast = false

console.log("spec: ",spec)
console.log("wss: ",wss)

let blockchains = [
    'bitcoin','ethereum','thorchain','bitcoincash','litecoin','binance','cosmos','dogecoin','osmosis'
]

let txid:string
let invocationId:string
let IS_SIGNED: boolean

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
        const queryKey = "sdk:pair-keepkey:test-1234";
        assert(queryKey)

        const username = "sdk:test-user-1234";
        assert(username)

        let config:any = {
            blockchains,
            username,
            queryKey,
            spec,
            wss
        }
        let app = new SDK.SDK(spec,config)
        log.info(tag,"app: ",app)
        //
        //get HDwallet
        let wallet = await start_keepkey_controller()
        // let wallet = await start_software_wallet()
        log.info(tag,"wallet: ",wallet)

        //init with HDwallet
        let result = await app.init(wallet)
        log.info(tag,"result: ",result)

        //pair wallet
        if(!app.isConnected){
            let resultPair = await app.pairWallet(wallet)
            log.info(tag,"resultPair: ",resultPair)
        }

        //get available inputs
        // assert(app.availableInputs)
        //get available outputs
        // assert(app.availableOutputs)

        log.info(tag,"availableInputs: ",app.availableInputs.length)
        log.info(tag,"balances: ",app.balances.length)
        // log.debug(tag,"balances: ",app.balances)

        let swap:any = {
            input:{
                blockchain:BLOCKCHAIN,
                asset:ASSET,
            },
            output:{
                blockchain:BLOCKCHAIN_OUTPUT,
                asset:OUTPUT_ASSET,
            },
            amount:TEST_AMOUNT,
            noBroadcast:true
        }
        
        //balance check of input
        let balance = await app.balances.filter((e:any) => e.asset == ASSET)[0]
        log.info(tag,"(check) balance: ",balance.balance)
        log.info(tag,"(check) balance: ",balance)
        assert(balance)
        if(balance.balance < TEST_AMOUNT) throw Error("Low funds! top off!")

        //estimated fee

        //sendMax

        //calculate max balance

        if(!invocationId){
            log.notice(tag,"CHECKPOINT0: pre-buildTx")
            //get quote
            let quote = await app.swapQuote(swap)
            log.info(tag,"quote: ",quote)
            assert(quote.invocationId)
            log.info(tag,"quote: ",quote.invocationId)
            invocationId = quote.invocationId
            //get invocations
            let invocations = await app.getInvocations()
            log.info(tag,"invocations: ",invocations.length)
            //TODO verify invocation inside

            let invocation = invocations.filter((e:any) => e.invocationId == quote.invocationId)[0]
            assert(invocation)
            log.info(tag,"invocation: ",invocation)

            log.notice(tag,"CHECKPOINT:  buildTx")

            //buildSwap
            let swapBuilt = await app.buildSwap(quote.invocationId)
            log.info(tag,"swapBuilt: ",swapBuilt)

            //executeSwap
            let executionResp = await app.swapExecute(quote.invocationId)
            log.info(tag,"executionResp: ",executionResp)
        }


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

        //wait till confirmed
        while(!isConfirmed){
            log.info("check for confirmations")
            //
            let invocationInfo = await app.getInvocation(invocationId)
            log.debug(tag,"invocationInfo: (VIEW) ",invocationInfo)

            if(invocationInfo && invocationInfo.isConfirmed){
                log.test(tag,"Confirmed!")
                statusCode = 3
                isConfirmed = true
                console.timeEnd('timeToConfirmed')
                console.time('confirm2fullfillment')
            } else {
                log.test(tag,"Not Confirmed!",new Date().getTime())
            }

            await sleep(3000)
            log.info("sleep over")
        }

        while(!isFullfilled){
            //get invocationInfo
            await sleep(6000)
            let invocationInfo = await app.getInvocation(invocationId)
            log.test(tag,"invocationInfo: ",invocationInfo.state)

            if(invocationInfo && invocationInfo.isConfirmed && invocationInfo.isFullfilled) {
                log.test(tag,"is fullfilled!")
                fullfillmentTxid = invocationInfo.fullfillmentTxid
                isFullfilled = true
                console.timeEnd('confirm2fullfillment')
                //get tx gas price
            } else {
                log.test(tag,"unfullfilled!")
            }
        }

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
