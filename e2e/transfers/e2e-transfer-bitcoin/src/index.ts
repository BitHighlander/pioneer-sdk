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
let ASSET = 'BTC'
let MIN_BALANCE = process.env['MIN_BALANCE_LTC'] || "0.004"
let TEST_AMOUNT = process.env['TEST_AMOUNT'] || "0.0005"
let spec = process.env['URL_PIONEER_SPEC'] || 'https://pioneers.dev/spec/swagger.json'
let wss = process.env['URL_PIONEER_SOCKET'] || 'wss://pioneers.dev'
let FAUCET_BTC_ADDRESS = process.env['FAUCET_BTC_ADDRESS']
let FAUCET_ADDRESS = FAUCET_BTC_ADDRESS
if(!FAUCET_ADDRESS) throw Error("Need Faucet Address!")

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

        const queryKey = "sdk:pair-keepkey:"+uuidv4();
        assert(queryKey)

        let config:any = {
            blockchains,
            queryKey,
            spec,
            wss
        }
        let app = new SDK.SDK(spec,config)
        log.info(tag,"app: ",app)
        //
        // //get HDwallet
        let wallet = await start_keepkey_controller()
        // // let wallet = await start_software_wallet()
        // log.info(tag,"wallet: ",wallet)
        //
        // //init with HDwallet
        // let result = await app.init(wallet)
        // log.info(tag,"result: ",result)
        //
        // let send = {
        //     blockchain:BLOCKCHAIN,
        //     asset:ASSET,
        //     address:FAUCET_BTC_ADDRESS,
        //     amount:TEST_AMOUNT,
        //     noBroadcast:true
        // }
        //
        // let txid = await app.sendToAddress(send)
        // log.info(tag,"txid: ",txid)

        //From Alpha BROKE
        // let unsignedTx = {
        //     "coin": "Bitcoin",
        //     "inputs": [
        //         {
        //             "addressNList": [
        //                 2147483692,
        //                 2147483648,
        //                 2147483648,
        //                 0,
        //                 3
        //             ],
        //             "scriptType": "p2pkh",
        //             "amount": "88532",
        //             "vout": 1,
        //             "txid": "f924d714227eeb55e5644f6720270c117725e920b4e95eb8104c04f7ada2b982",
        //             "hex": "02000000000103db6cc88bb8ef54384b89c2a0600779920bde103d9423ec2726f5c67abec3f8250000000000ffffffffce76a4e406c2b78c0a66a80804a1d3551f26d2a8dd6a8caedbf217268f8266de0100000000ffffffff1530d817d620d8451ecfc8dff293fd98fdb8ea88286dd4545466e55e8be7b1e10000000000ffffffff023658010000000000160014fcfd06686b9a4b712249c1d2a4a7153f9efe1765d4590100000000001976a9146ee7adb6fc9def7531d2edff2c215cc91c8926c088ac02483045022100f72079fbabe1845b8bb4179d94fb3a2327b8d5a47691b9e6e1a4163d5c9c1cfc022001970109771e27d2bfcf9e1899885f02cb41cdff8b2d4a196f5ecb549e79ff2b012103b731c84fa3ce2ee36a01dc85ee6bb897f2b663e04eb564f307f08942095c598302483045022100e628817e3c33ae9ec6db03515a2071818819a27b3e77947e9627a081d6cde2a60220042739bc5143881397155dfd6690b9cd68129b243d5dff6247d43babb6347229012103b731c84fa3ce2ee36a01dc85ee6bb897f2b663e04eb564f307f08942095c598302483045022100c50bdfbfcbe89e1cd67ed83caf2016671a21b7cd30cd6830679dd7d3e0eba0ad02205b0ae656140edc98877d0b4e2339712822c2e7d32511b1047aa1e6591ac54b0c012103b731c84fa3ce2ee36a01dc85ee6bb897f2b663e04eb564f307f08942095c598300000000"
        //         }
        //     ],
        //     "outputs": [
        //         {
        //             "addressType": "spend",
        //             "amount": "50000",
        //             "address": "bc1qs7ek0m3ah0xhn9a2txxrgvcw50clnvuhymx87h"
        //         },
        //         {
        //             "addressType": "change",
        //             "amount": "35820",
        //             "addressNList": [
        //                 2147483692,
        //                 2147483648,
        //                 2147483648,
        //                 1,
        //                 69
        //             ],
        //             "scriptType": "p2pkh",
        //             "isChange": true
        //         }
        //     ]
        // }

        //from Pioneer
        let unsignedTx = {
            "coin":"Bitcoin",
            "inputs":[
                {
                    "addressNList":[
                        2147483692,
                        2147483648,
                        2147483648,
                        0,
                        3
                    ],
                    //from good
                    "scriptType":"p2wpkh",
                    //from broke
                    // "scriptType": "p2pkh",

                    "amount":"88532",
                    "vout":1,


                    //from broke
                    "txid":"f924d714227eeb55e5644f6720270c117725e920b4e95eb8104c04f7ada2b982",

                    //from good
                    // "txid":"f924d714227eeb55e5644f6720270c117725e920b4e95eb8104c04f7ada2b982",
                    // "segwit":false,

                    //from good
                    // "hex": "02000000000103db6cc88bb8ef54384b89c2a0600779920bde103d9423ec2726f5c67abec3f8250000000000ffffffffce76a4e406c2b78c0a66a80804a1d3551f26d2a8dd6a8caedbf217268f8266de0100000000ffffffff1530d817d620d8451ecfc8dff293fd98fdb8ea88286dd4545466e55e8be7b1e10000000000ffffffff023658010000000000160014fcfd06686b9a4b712249c1d2a4a7153f9efe1765d4590100000000001976a9146ee7adb6fc9def7531d2edff2c215cc91c8926c088ac02483045022100f72079fbabe1845b8bb4179d94fb3a2327b8d5a47691b9e6e1a4163d5c9c1cfc022001970109771e27d2bfcf9e1899885f02cb41cdff8b2d4a196f5ecb549e79ff2b012103b731c84fa3ce2ee36a01dc85ee6bb897f2b663e04eb564f307f08942095c598302483045022100e628817e3c33ae9ec6db03515a2071818819a27b3e77947e9627a081d6cde2a60220042739bc5143881397155dfd6690b9cd68129b243d5dff6247d43babb6347229012103b731c84fa3ce2ee36a01dc85ee6bb897f2b663e04eb564f307f08942095c598302483045022100c50bdfbfcbe89e1cd67ed83caf2016671a21b7cd30cd6830679dd7d3e0eba0ad02205b0ae656140edc98877d0b4e2339712822c2e7d32511b1047aa1e6591ac54b0c012103b731c84fa3ce2ee36a01dc85ee6bb897f2b663e04eb564f307f08942095c598300000000",

                    //from broke
                    "hex": "02000000000103db6cc88bb8ef54384b89c2a0600779920bde103d9423ec2726f5c67abec3f8250000000000ffffffffce76a4e406c2b78c0a66a80804a1d3551f26d2a8dd6a8caedbf217268f8266de0100000000ffffffff1530d817d620d8451ecfc8dff293fd98fdb8ea88286dd4545466e55e8be7b1e10000000000ffffffff023658010000000000160014fcfd06686b9a4b712249c1d2a4a7153f9efe1765d4590100000000001976a9146ee7adb6fc9def7531d2edff2c215cc91c8926c088ac02483045022100f72079fbabe1845b8bb4179d94fb3a2327b8d5a47691b9e6e1a4163d5c9c1cfc022001970109771e27d2bfcf9e1899885f02cb41cdff8b2d4a196f5ecb549e79ff2b012103b731c84fa3ce2ee36a01dc85ee6bb897f2b663e04eb564f307f08942095c598302483045022100e628817e3c33ae9ec6db03515a2071818819a27b3e77947e9627a081d6cde2a60220042739bc5143881397155dfd6690b9cd68129b243d5dff6247d43babb6347229012103b731c84fa3ce2ee36a01dc85ee6bb897f2b663e04eb564f307f08942095c598302483045022100c50bdfbfcbe89e1cd67ed83caf2016671a21b7cd30cd6830679dd7d3e0eba0ad02205b0ae656140edc98877d0b4e2339712822c2e7d32511b1047aa1e6591ac54b0c012103b731c84fa3ce2ee36a01dc85ee6bb897f2b663e04eb564f307f08942095c598300000000"

                    // "tx":{
                    //     "txid":"f924d714227eeb55e5644f6720270c117725e920b4e95eb8104c04f7ada2b982",
                    //     "hash":"f924d714227eeb55e5644f6720270c117725e920b4e95eb8104c04f7ada2b982",
                    //     "version":2,
                    //     "vin":[
                    //         {
                    //             "txid":"25f8c3be7ac6f52627ec23943d10de0b92790760a0c2894b3854efb88bc86cdb",
                    //             "addr":"bc1qs7ek0m3ah0xhn9a2txxrgvcw50clnvuhymx87h",
                    //             "scriptSig":{
                    //                 "hex":"0014459a4d8600bfdaa52708eaae5be1dcf959069efc"
                    //             },
                    //             "valueSat":177534,
                    //             "value":0.00177534
                    //         },
                    //         {
                    //             "txid":"de66828f2617f2dbae8c6adda8d2261f55d3a10408a8660a8cb7c206e4a476ce",
                    //             "vout":1,
                    //             "addr":"bc1qs7ek0m3ah0xhn9a2txxrgvcw50clnvuhymx87h",
                    //             "scriptSig":{
                    //                 "hex":"0014459a4d8600bfdaa52708eaae5be1dcf959069efc"
                    //             },
                    //             "valueSat":1660,
                    //             "value":0.0000166
                    //         },
                    //         {
                    //             "txid":"e1b1e78b5ee5665454d46d2888eab8fd98fd93f2dfc8cf1e45d820d617d83015",
                    //             "addr":"bc1qs7ek0m3ah0xhn9a2txxrgvcw50clnvuhymx87h",
                    //             "scriptSig":{
                    //                 "hex":"0014459a4d8600bfdaa52708eaae5be1dcf959069efc"
                    //             },
                    //             "valueSat":3336,
                    //             "value":0.00003336
                    //         }
                    //     ],
                    //     "vout":[
                    //         {
                    //             "value":"88118",
                    //             "scriptPubKey":{
                    //                 "hex":"0014fcfd06686b9a4b712249c1d2a4a7153f9efe1765"
                    //             }
                    //         },
                    //         {
                    //             "value":"88532",
                    //             "scriptPubKey":{
                    //                 "hex":"76a9146ee7adb6fc9def7531d2edff2c215cc91c8926c088ac"
                    //             }
                    //         }
                    //     ],
                    //     "hex":"02000000000103db6cc88bb8ef54384b89c2a0600779920bde103d9423ec2726f5c67abec3f8250000000000ffffffffce76a4e406c2b78c0a66a80804a1d3551f26d2a8dd6a8caedbf217268f8266de0100000000ffffffff1530d817d620d8451ecfc8dff293fd98fdb8ea88286dd4545466e55e8be7b1e10000000000ffffffff023658010000000000160014fcfd06686b9a4b712249c1d2a4a7153f9efe1765d4590100000000001976a9146ee7adb6fc9def7531d2edff2c215cc91c8926c088ac02483045022100f72079fbabe1845b8bb4179d94fb3a2327b8d5a47691b9e6e1a4163d5c9c1cfc022001970109771e27d2bfcf9e1899885f02cb41cdff8b2d4a196f5ecb549e79ff2b012103b731c84fa3ce2ee36a01dc85ee6bb897f2b663e04eb564f307f08942095c598302483045022100e628817e3c33ae9ec6db03515a2071818819a27b3e77947e9627a081d6cde2a60220042739bc5143881397155dfd6690b9cd68129b243d5dff6247d43babb6347229012103b731c84fa3ce2ee36a01dc85ee6bb897f2b663e04eb564f307f08942095c598302483045022100c50bdfbfcbe89e1cd67ed83caf2016671a21b7cd30cd6830679dd7d3e0eba0ad02205b0ae656140edc98877d0b4e2339712822c2e7d32511b1047aa1e6591ac54b0c012103b731c84fa3ce2ee36a01dc85ee6bb897f2b663e04eb564f307f08942095c598300000000"
                    // }
                }
            ],
            "outputs":[
                {
                    "address":"bc1qs7ek0m3ah0xhn9a2txxrgvcw50clnvuhymx87h",
                    "addressType":"spend",
                    "scriptType":"p2wpkh",
                    "amount":"50000",
                    "isChange":false
                },
                {
                    "addressType": "change",
                    "amount": "35820",
                    "addressNList": [
                        2147483692,
                        2147483648,
                        2147483648,
                        1,
                        69
                    ],
                    "scriptType": "p2pkh",
                    "isChange": true
                }
                // {
                //     "address":"1LUEqRQv9NJZsfwEM2qqGrW4TVw5QeJd5r",
                //     "addressType":"spend",
                //     "scriptType":"p2wpkh",
                //     "amount":"15480",
                //     "isChange":true
                // }
            ],
            "version":1,
            "locktime":0
        }

        let signedTx = await wallet.btcSignTx(unsignedTx)
        console.log(signedTx)

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
