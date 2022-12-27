// File name: ./commander-patch.js
const oldCommander = require( 'commander' );

function patchCommander( commander:any ){
    if( commander.hasOwnProperty( 'forwardSubcommands' ) ) return commander;
    commander.Command.prototype.forwardSubcommands = function(){
        var self = this;
        var listener = function( args: never[], unknown: string | string[] ){
            // Parse any so-far unknown options
            args = args || [];
            unknown = unknown || [];

            var parsed = self.parseOptions( unknown );
            if( parsed.args.length ) args = parsed.args.concat( args );
            unknown = parsed.unknown;

            // Output help if necessary
            if( unknown.includes( '--help' ) || unknown.includes( '-h' ) ){
                self.outputHelp();
                process.exit( 0 );
            }

            self.parseArgs( args, unknown );
        };

        if( this._args.length > 0 ){
            console.error( 'forwardSubcommands cannot be applied to command with explicit args' );
        }

        var parent = this.parent || this;
        var name = parent === this ? '*' : this._name;
        parent.on( 'command:' + name, listener );
        if( this._alias ) parent.on( 'command:' + this._alias, listener );
        return this;
    };

    return commander;
}

const commander = patchCommander( oldCommander );

module.exports = commander;