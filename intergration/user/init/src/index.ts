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
let ASSET = 'AVAX'
let MIN_BALANCE = process.env['MIN_BALANCE_LTC'] || "0.004"
let TEST_AMOUNT = process.env['TEST_AMOUNT'] || "0.05"
let spec = process.env['URL_PIONEER_SPEC'] || 'https://pioneers.dev/spec/swagger.json'
let wss = process.env['URL_PIONEER_SOCKET'] || 'wss://pioneers.dev'

// let TRADE_PAIR  = "ETH_BTC"
// let INPUT_ASSET = ASSET
// let OUTPUT_ASSET = "BTC"

//hdwallet Keepkey
let Controller = require("@keepkey/keepkey-hardware-controller")


let noBroadcast = false

console.log("spec: ",spec)
console.log("wss: ",wss)

let blockchains = [
    'avalanche'
]

// let blockchains = [
//     'bitcoin','ethereum','thorchain','bitcoincash','litecoin','binance','cosmos','dogecoin','osmosis'
// ]

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

        console.log("controller: ",controller)

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
            // {
            //     note:"Bitcoin account Native Segwit (Bech32)",
            //     blockchain: 'bitcoin',
            //     symbol: 'BTC',
            //     network: 'BTC',
            //     script_type:"p2wpkh", //bech32
            //     available_scripts_types:['p2pkh','p2sh','p2wpkh','p2sh-p2wpkh'],
            //     type:"zpub",
            //     addressNList: [0x80000000 + 84, 0x80000000 + 0, 0x80000000 + 0],
            //     addressNListMaster: [0x80000000 + 84, 0x80000000 + 0, 0x80000000 + 0, 0, 0],
            //     curve: 'secp256k1',
            //     showDisplay: false // Not supported by TrezorConnect or Ledger, but KeepKey should do it
            // },
            // {
            //     note:"Bitcoin account Native Segwit (Bech32) on WRONG path (extraction)",
            //     blockchain: 'bitcoin',
            //     symbol: 'BTC',
            //     network: 'BTC',
            //     script_type:"p2wpkh", //bech32
            //     available_scripts_types:['p2pkh','p2sh','p2wpkh','p2sh-p2wpkh'],
            //     type:"zpub",
            //     addressNList: [0x80000000 + 44, 0x80000000 + 0, 0x80000000 + 0],
            //     addressNListMaster: [0x80000000 + 44, 0x80000000 + 0, 0x80000000 + 0, 0, 0],
            //     curve: 'secp256k1',
            //     showDisplay: false // Not supported by TrezorConnect or Ledger, but KeepKey should do it
            // }
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

        //forget
        // log.info(tag,"app.pioneer: ",app.pioneer.instance)
        // let resultForget = await app.pioneer.instance.Forget()
        // log.info(tag,"resultForget: ",resultForget.data)


        //verify paths
        log.info(tag,"paths: ",app.paths.length)
        log.info(tag,"blockchains: ",blockchains.length)
        log.info(tag,"blockchains: ",blockchains)
        log.info(tag,"paths: ",app.paths)
        assert(app.paths.length === blockchains.length)

        //get HDwallet
        let wallet = await start_keepkey_controller()
        // let wallet = await start_software_wallet()
        // log.info(tag,"wallet: ",wallet)


        // //init with HDwallet
        let result = await app.init(wallet)
        // log.info(tag,"result: ",result)

        //path
        log.info(tag,"ASSET: ",ASSET)
        let path = app.paths.filter((e:any) => e.symbol === ASSET)
        log.info("path: ",path)
        log.info("app.paths: ",app.paths)
        assert(path[0])

        let pubkey = app.pubkeys.filter((e:any) => e.symbol === ASSET)
        log.info("pubkey: ",pubkey)
        log.info("app.pubkeys: ",app.pubkeys)
        assert(pubkey[0])

        let balance = app.balances.filter((e:any) => e.symbol === ASSET)
        log.info("balance: ",balance)
        log.info("balance: ",balance[0].balance)
        assert(balance)
        assert(balance[0])
        assert(balance[0].balance)

        //pair wallet
        if(!app.isConnected){
            let resultPair = await app.pairWallet(wallet)
            // log.info(tag,"resultPair: ",resultPair)
        }
        
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
