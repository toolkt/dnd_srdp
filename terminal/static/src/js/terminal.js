// Copyright 2018-2019 Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
odoo.define('terminal.Terminal', function (require) {
    'use strict';

    var core = require('web.core');
    var rpc = require('web.rpc');
    var session = require('web.session');
    var Widget = require('web.Widget');
    var WebClient = require('web.WebClient');
    var DebugManager = require('web.DebugManager');
    var Class = require('web.Class');


    var ParameterReader = Class.extend({
        INPUT_GROUP_DELIMETERS: ['"', "'"],

        _regexSanitize: null,

        init: function () {
            this._regexSanitize = new RegExp("'", 'g');
        },

        parse: function (strParams) {
            var scmd = strParams.split(' ');
            scmd = _.filter(scmd, function (item) {
                return item;
            });

            var c_group = [false, false];
            var mdeli = '';
            var params = [];
            for (var i in scmd) {
                var startChar = scmd[i].charAt(0);
                var endChar = scmd[i].charAt(scmd[i].length-1);
                if (c_group[0] === false &&
                    this.INPUT_GROUP_DELIMETERS.indexOf(startChar) !== -1) {
                    c_group[0] = i;
                    mdeli = startChar;
                }
                if (c_group[0] !== false && endChar === mdeli) {
                    c_group[1] = i;
                }

                if (c_group[0] !== false && c_group[1] !== false) {
                    scmd[c_group[0]] = scmd[c_group[0]].slice(1);
                    scmd[c_group[1]] = scmd[c_group[1]].slice(
                        0, scmd[c_group[1]].length-1);
                    params.push(this._sanitizeString(
                        _.clone(scmd).splice(
                            c_group[0], c_group[1]-c_group[0]+1).join(' ')));
                    c_group[0] = false;
                    c_group[1] = false;
                } else if (c_group[0] === false && c_group[1] === false) {
                    params.push(this._sanitizeString(scmd[i]));
                }
            }

            return params;
        },

        _sanitizeString: function (str) {
            return str.replace(this._regexSanitize, '"');
        },
    });

    var ParameterChecker = Class.extend({
        _validators: {},

        init: function () {
            this._validators.s = this._validateString;
            this._validators.i = this._validateInt;
        },

        validate: function (args, params) {
            var curParamIndex = 0;
            for (var i=0; i < args.length; ++i) {
                var carg = args[i];
                var optional = false;
                if (carg === '?') {
                    optional = true;
                    carg = args[++i];
                }

                var isInvalidNO = !optional && curParamIndex >= params.length;
                var isInvalidO = curParamIndex < params.length &&
                    !this._validators[carg](params[curParamIndex]);
                if (isInvalidNO || isInvalidO) {
                    return false;
                }

                ++curParamIndex;
            }

            return !curParamIndex || params.length <= curParamIndex;
        },

        _validateString: function (param) {
            return Number(param) !== parseInt(param, 10);
        },
        _validateInt: function (param) {
            return Number(param) === parseInt(param, 10);
        },
    });

    var Terminal = Widget.extend({
        events: {
            "keydown #terminal_input": "_onInputKeyDown",
            "click #terminal_button": "_processInputCommand",
            "click #terminal_screen": "_preventLostInputFocus",
            "click .o_terminal_cmd": "_onClickTerminalCommand",
        },
        VERSION: '0.2.2',

        _registeredCmds: {},
        _inputHistory: [],
        _searchCommandIter: 0,
        _searchCommandQuery: '',
        _searchHistoryIter: 0,

        _active_widget: null,
        _active_action: null,
        _parameterChecker: null,
        _parameterReader: null,

        /* INITIALIZE */
        init: function () {
            this._super.apply(this, arguments);

            this._parameterChecker = new ParameterChecker();
            this._parameterReader = new ParameterReader();
        },

        start: function () {
            this._super.apply(this, arguments);

            this.$input = this.$el.find('#terminal_input');
            this.$term = this.$el.find('#terminal_screen');
            this.$button = this.$el.find('#terminal_button');

            core.bus.on('keydown', this, this._onCoreKeyDown);
            core.bus.on('click', this, this._onCoreClick);

            this.clean();
            this.cleanInput();

            this._printWelcomeMessage();
            this.print('');
        },

        /* PRINT */
        print: function (msg, enl) {
            this.$term.append("<span>");
            this.$term.append(msg);
            this.$term.append("</span>" + (enl?' ':'<br/>'));
            this.$term[0].scrollTop = this.$term[0].scrollHeight;
        },

        eprint: function (msg, enl) {
            this.print(document.createTextNode(msg), enl);
        },

        /* BASIC FUNCTIONS */
        clean: function () {
            this.$term.html('');
        },

        cleanInput: function () {
            this.$input.val('');
        },

        registerCommand: function (cmd, cmdDef) {
            this._registeredCmds[cmd] = _.extend({
                definition: 'Undefined command',
                callback: this._fallbackExecuteCommand,
                detail: "This command hasn't a properly detailed information",
                syntaxis: 'Unknown',
                args: '',
            }, cmdDef);
        },

        executeCommand: function (cmd) {
            var self = this;
            var scmd = this._parameterReader.parse(cmd);
            if (Object.prototype.hasOwnProperty.call(this._registeredCmds,
                scmd[0])) {
                var cmdDef = this._registeredCmds[scmd[0]];
                var params = scmd.slice(1);
                if (this._parameterChecker.validate(cmdDef.args, params)) {
                    cmdDef.callback.bind(this)(params).fail(function (emsg) {
                        var errorMessage = self._getCommandErrorMessage(emsg);
                        self.eprint(_.template("[!] Error executing " +
                            "'<%= cmd %>': <%= error %>")({
                            cmd:cmd,
                            error:errorMessage,
                        }));
                        return false;
                    });
                } else {
                    this.print(_.template("<span class='o_terminal_click " +
                        "o_terminal_cmd' data-cmd='help <%= cmd %>'>[!] " +
                        "Invalid command parameters!</span>")({cmd:scmd[0]}));
                    return false;
                }
            } else {
                this._callAlias(scmd[0], scmd.slice(1));
            }

            return true;
        },

        /* VISIBILIY */
        do_show: function () {
            this.$el.animate({top: '0'});
            this.$input.focus();
        },

        do_hide: function () {
            this.$el.animate({top: '-100%'});
        },

        do_toggle: function () {
            if (this.$el.css('top') === '0px') {
                this.do_hide();
            } else {
                this.do_show();
            }
        },

        /* GENERAL */
        setActiveWidget: function (widget) {
            this._active_widget = widget;
        },

        setActiveAction: function (action) {
            this._active_action = action;
        },


        /* PRIVATE METHODS*/
        _getCommandErrorMessage: function (emsg) {
            // Odoo Error
            if (typeof emsg === 'object' &&
                Object.prototype.hasOwnProperty.call(emsg, 'data')) {
                return emsg.data.name;
            }
            // Generic Error
            return emsg || "undefined error";
        },

        _printWelcomeMessage: function () {
            this.print(_.template("<strong class='o_terminal_title'>Odoo "+
                "Terminal v<%= ver %></strong>")({ver:this.VERSION}));
        },

        _doSearchCommand: function () {
            var self = this;
            var matchCmds = _.filter(
                _.keys(this._registeredCmds).sort(), function (item) {
                    return item.indexOf(self._searchCommandQuery) === 0;
                });

            if (!matchCmds.length) {
                this._searchCommandIter = 0;
                return false;
            } else if (this._searchCommandIter >= matchCmds.length) {
                this._searchCommandIter = 0;
            }
            return matchCmds[this._searchCommandIter++];
        },

        _processInputCommand: function () {
            var cmd = this.$input.val();
            if (cmd) {
                var self = this;
                self.$input.append(
                    _.template("<option><%= cmd %></option>")({cmd:cmd}));
                self.eprint(_.template("> <%= cmd %>")({cmd:cmd}));
                this._inputHistory.push(cmd);
                this.cleanInput();
                this.executeCommand(cmd);
            }
            this._preventLostInputFocus();
        },

        _callAlias: function (alias, params) {
            var self = this;
            return rpc.query({
                method: 'search_read',
                domain: [['name', '=', alias]],
                model: 'terminal.alias',
                fields: ['command'],
                kwargs: {context: session.user_context},
            }).then(function (results) {
                if (results.length) {
                    var cmd = results[0].command;
                    for (var i in params) {
                        cmd = cmd.replace('$'+(Number(i)+1), params[i]);
                    }
                    self.executeCommand(cmd);
                } else {
                    self.print(
                        _.template("[!] '<%= cmd %>' command not found")(
                            {cmd:alias}));
                }
            });
        },

        _fallbackExecuteCommand: function () {
            var defer = $.Deferred(function (d) {
                d.reject("Invalid command definition!");
            });
            return $.when(defer);
        },

        /* HANDLE EVENTS */
        _preventLostInputFocus: function () {
            this.$input.focus();
        },

        _onClickTerminalCommand: function (ev) {
            if (Object.prototype.hasOwnProperty.call(ev.target.dataset,
                'cmd')) {
                var cmd = ev.target.dataset.cmd;
                this.eprint(_.template("> <%= cmd %>")({cmd:cmd}));
                this.executeCommand(cmd);
            }
        },

        _onInputKeyDown: function (ev) {
            if (ev.keyCode === 13) {
                // Press Enter
                this._processInputCommand();
                this._searchHistoryIter = this._inputHistory.length;
            } else if (ev.keyCode === 38) {
                // Press Up
                if (this._searchHistoryIter > 0) {
                    --this._searchHistoryIter;
                    this.$input.val(
                        this._inputHistory[this._searchHistoryIter]);
                }
            } else if (ev.keyCode === 40) {
                // Press Down
                if (this._searchHistoryIter < this._inputHistory.length-1) {
                    ++this._searchHistoryIter;
                    this.$input.val(
                        this._inputHistory[this._searchHistoryIter]);
                } else {
                    this._searchHistoryIter = this._inputHistory.length;
                    this.cleanInput();
                }
            }

            if (ev.keyCode === 9) {
                // Press Tab
                if (this.$input.val()) {
                    if (!this._searchCommandQuery) {
                        this._searchCommandQuery = this.$input.val();
                    }
                    var found_cmd = this._doSearchCommand();
                    if (found_cmd) {
                        this.$input.val(found_cmd + ' ');
                    }
                }
                ev.preventDefault();
            } else {
                this._searchCommandIter = 0;
                this._searchCommandQuery = false;
            }
        },

        _onCoreClick: function (ev) {
            // Auto-Hide
            if (!this.$el[0].contains(ev.target)) {
                this.do_hide();
            }
        },
        _onCoreKeyDown: function (ev) {
            if (ev.ctrlKey && ev.keyCode === 49) {
                // Press Ctrl + 1
                this.do_toggle();
            }
        },
    });

    /* Instantiate Terminal */
    WebClient.include({
        terminal: null,

        show_application: function () {
            this.terminal = new Terminal(this);
            this.terminal.setElement(this.$el.parents().find('#terminal'));
            this.terminal.start();
            core.bus.on('toggle_terminal', this, function () {
                this.terminal.do_toggle();
            });

            return this._super.apply(this, arguments);
        },

        current_action_updated: function (action, controller) {
            this._super.apply(this, arguments);
            if (this.terminal) {
                this.terminal.setActiveWidget(controller && controller.widget);
                this.terminal.setActiveAction(action);
            }
        },
    });

    /* Debug Menu Entry Action */
    DebugManager.include({
        toggle_terminal: function () {
            // HOT-FIX: Prevent hide terminal
            // dispatched by an "outside click event"
            _.defer(function () {
                core.bus.trigger_up('toggle_terminal');
            });
        },
    });

    return {
        'terminal': Terminal,
        'parameterReader': ParameterReader,
        'parameterChecker': ParameterChecker,
    };
});
