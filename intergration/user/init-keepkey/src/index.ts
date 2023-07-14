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
        console.log(config.apiKey)
        const keyring = new core.Keyring();
        // @ts-ignore
        let wallet = await KkRestAdapter.useKeyring(keyring).pairDevice(sdk)
        console.log("wallet: ",wallet)
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
        let wallet = await start_keepkey_controller()
        // let wallet = await start_software_wallet()
        log.debug(tag,"wallet: ",wallet)
        assert(wallet)
        
        //init with HDwallet
        let result = await app.init(wallet)
        log.info(tag,"result: ",result)
        
        //path
        log.info(tag,"ASSET: ",ASSET)
        let path = app.paths.filter((e:any) => e.symbol === ASSET)
        log.info("path: ",path)
        log.info("app.paths: ",app.paths.length)
        assert(path[0])

        let pubkey = app.pubkeys.filter((e:any) => e.symbol === ASSET)
        log.info("pubkey: ",pubkey)
        log.info("app.pubkeys: ",app.pubkeys.length)
        assert(pubkey[0])

        let balance = app.balances.filter((e:any) => e.symbol === ASSET)
        log.info("balance: ",balance)
        log.info("balance: ",balance[0].balance)
        assert(balance)
        assert(balance[0])
        assert(balance[0].balance)

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
