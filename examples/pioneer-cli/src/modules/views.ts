/*
    Ascii art
        and CLI view generation
            -Highlander
 */
const TAG = " | App | ";
const chalk = require("chalk");
const figlet = require("figlet");
const log = require("loggerdog-client")();


export function showWelcome() {
    let tag = TAG + " | importConfig | ";
    try {
        log.debug(
            "\n",
            chalk.blue(figlet.textSync("Pioneer-cli", {horizontalLayout: "full"}))
        );
        log.debug(
            "\n        ,    .  ,   .           .\n" +
            "    *  / \\_ *  / \\_      " +
            chalk.yellowBright(".-.") +
            "  *       *   /\\'__        *\n" +
            "      /    \\  /    \\,   " +
            chalk.yellowBright("( ₿ )") +
            "     .    _/  /  \\  *'.\n" +
            " .   /\\/\\  /\\/ :' __ \\_  " +
            chalk.yellowBright(" - ") +
            "          _^/  ^/    `--.\n" +
            "    /    \\/  \\  _/  \\-'\\      *    /.' ^_   \\_   .'\\  *\n" +
            "  /\\  .-   `. \\/     \\ /==~=-=~=-=-;.  _/ \\ -. `_/   \\\n" +
            " /  `-.__ ^   / .-'.--\\ =-=~_=-=~=^/  _ `--./ .-'  `-\n" +
            "/        `.  / /       `.~-^=-=~=^=.-'      '-._ `._"
        );
        log.debug(
            " \n A simple Multi-Coin Wallet and explorer CLI      \n \n                        ---Highlander \n "
        );
    } catch (e) {
        console.error(tag, "e: ", e);
        return {};
    }
}
