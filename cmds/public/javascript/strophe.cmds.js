(function(Strophe,$) {
	var DiscoNode = Strophe.Disco.DiscoNode;
	var noop = Strophe.Disco.noop;

	CommandNode = function(cfg) {
		$.extend(this,cfg);
	};
	CommandNode.prototype = new DiscoNode();
	CommandNode.prototype.send = function() {
		var iq = $iq({});
	};

	CommandNode.prototype.callback = function(onSucces,onError) {
		this.onSuccess({});
	};
	// our hook
	CommandNode.prototype.addContent = function(req,res) {
		this.req = req;
		this.res = res;
		this.callback.call(this,this.onSuccess.bind(this), this.onError.bind(this));
	};
	CommandNode.prototype.onError = function() {
		res.attrs({status: 'error'});
	};

	CommandNode.prototype.onSuccess = function(obj) {
		var res = this.res, item = this.item;
		res.attrs({status: 'completed'});
		if($.isArray(obj)) {
			$.each(obj, function(i,entry) { res.c(item).t(entry).up(); });
		}
	};

	var GetUrls = new CommandNode({
		root: 'urls',
		item: 'url',
		node: 'getUrls', 
		name: 'Retrieve Urls'
	});

	var SetUrls = new CommandNode({
		root: 'urls',
		item: 'url',
		node: 'setUrls', 
		name: 'Sets Urls'
	});

	function create(node, cb) {
		var cmd, callback = cb || noop;
		if (node === 'getUrls') {
			return new CommandNode({
				item: 'url',
				node: 'getUrls', 
				name: 'Retrieve Urls',
				callback: callback
			});
		} else if (node === 'setUrls') {
			return new CommandNode({
				item: 'url',
				node: 'setUrls', 
				name: 'Sets Urls',
				callback: callback
			});
		}
		throw 'Strophe.Commands has no implementation for: ' + node;
	}


	Strophe.Commands = {
		create: create,
		CommandNode: CommandNode
	};

})(Strophe,jQuery);


(function(Strophe,$) {
	var CMDS = "http://jabber.org/protocol/commands";
	var CommandNode = Strophe.Commands.CommandNode;
	var noop = Strophe.Disco.noop;
	function reply(iq) {
		var node = $('command',iq).attr('node'), nodeImpl;
		var n = $.grep(this.cmds.items, function(n) { return n.node == node; });
		if(n.length === 0) { nodeImpl = new DiscoNodeNotFound();  }
		else {
			nodeImpl = $.isPlainObject(n[0]) ? new CommandNode(n[0]) : n[0]; 
		}
		this._conn.send(nodeImpl.reply(iq));
		return true;
	}

	function request(conn, jid, node, args) {
		var iq = $iq({to: jid, type: 'set'}), data, onSucces, onError;
		iq.c('command', { xmlns: CMDS, node: node, action: 'execute'});
		data = $.grep($.makeArray(args), function(arg) { $.isArray(arg); });
	}

	var cmds = {
		_conn: null,
		init: function(conn) {
			this._conn = conn;
			this.cmds = conn.disco.features[CMDS] = { items: [] };
		}, 
		statusChanged: function(status,condition) {
			if (status === Strophe.Status.CONNECTED) {
				this._conn.addHandler(reply.bind(this), CMDS, 'iq', 'set');
			}
		},
		add: function(item) {
			if(!item.node) { throw 'command needs a node'; }
			if(!item.jid) { item.jid = this._conn.jid; }
			this.cmds.items.push(item);
		},
		execute: function(jid, node) {
			var iq = $iq({to: jid, type: 'set'});
			iq.c('command', { xmlns: CMDS, node: node, action: 'execute'});
			this._conn.sendIQ(iq, noop);

			//request(this._conn, jid, node, arguments);
		}
	};

	Strophe.addConnectionPlugin('cmds', cmds);
	Strophe.addNamespace('COMMANDS', CMDS);
})(Strophe,jQuery);
