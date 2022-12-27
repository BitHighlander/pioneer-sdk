/*
    CLI inquiries

            -Highlander
 */

const TAG = " | App | ";
const log = require("loggerdog-client")();
const inquirer = require("inquirer-promise");


export async function prompt_seed_input() {
    let tag = TAG + " | prompt_seed_input | ";
    try {
        const questions = [
            {
                type: "input",
                name: "seed",
                message: "Insert your 12 or 24 word mnemonics",
                default: "alcohol woman abuse must during monitor noble actual mixed trade anger aisle",
            }
        ];

        let response = await inquirer.prompt(questions)
        return response.seed
    } catch (e) {
        console.error(tag, "e: ", e);
        return {};
    }
}


export async function prompt_fio_enable() {
    let tag = TAG + " | importConfig | ";
    try {
        const questions = [
            {
                type: "list",
                name: "fio",
                message: "enable FIO wallet features",
                choices: ["enable", "continue setup without (Opt out)"],

            }
        ];

        let response = await inquirer.prompt(questions)
        if(response.fio === "enable"){
            return true
        } else {
            return false
        }
    } catch (e) {
        console.error(tag, "e: ", e);
        return {};
    }
}


export async function prompt_password_enable(){
    let tag = TAG + " | prompt_fio_enable | "
    try{
        const questions = [
            {
                type: "list",
                name: "passwordEnabled",
                message: "Would you like to encrypt your wallet? (requires a password on every startup)",
                choices: ["continue unencrypted","enable password protection"],

            }
        ];

        let response = await inquirer.prompt(questions)
        if(response.passwordEnabled === "enable password protection"){
            return true
        } else {
            return false
        }
    }catch(e){
        log.error(e)
    }
}

export async function prompt_create_wallet(){
    let tag = TAG + " | prompt_create_wallet | "
    try{
        const questions = [
            {
                type: "list",
                name: "type",
                message: "What do you want to do?",
                choices: ["create a new wallet", "restore from seed","pair hardware wallet",],
            }
        ];

        let response = await inquirer.prompt(questions)
        return response.type
    }catch(e){
        log.error(e)
    }
}

export async function prompt_password_create(){
    let tag = TAG + " | prompt_password_create | "
    try{
        const questions = [
            {
                type: "password",
                name: "password",
                message: "password",
                default: ""},
            {
                type: "password",
                name: "password2",
                message: "confirm password",
                default: "",
            }
        ];
        let response = await inquirer.prompt(questions)
        return response
    }catch(e){
        log.error(e)
    }
}

export async function prompt_password_input(){
    let tag = TAG + " | prompt_fio_enable | "
    try{
        const questions = [
            {
                type: "password",
                name: "password",
                message: "password",
                default: ""}
        ];
        let response = await inquirer.prompt(questions)
        return response.password
    }catch(e){
        log.error(e)
    }
}
