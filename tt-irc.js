var window_active = true;
var last_id = 0;
var last_old_id = 0;
var new_messages = 0;
var new_highlights = 0;
var delay = 1500;
var timeout_delay = 3000;
var twitter_timeout_delay = 60000*10;
var buffers = [];
var nicklists = [];
var li_classes = [];
var topics = [];
var active_nicks = [];
var conndata_last = [];
var last_update = false;
var input_cache = [];
var input_cache_offset = 0;
var highlight_on = [];
var notify_events = [];
var theme_images = [];
var update_delay_max = 0;
var theme = "";
var hide_join_part = false;
var startup_date;

var twitter_id = false;
var timeout_id = false;
var update_id = false;

var MSGT_PRIVMSG = 0;
var MSGT_COMMAND = 1;
var MSGT_BROADCAST = 2;
var MSGT_ACTION = 3;
var MSGT_TOPIC = 4;
var MSGT_PRIVATE_PRIVMSG = 5;
var MSGT_EVENT = 6;
var MSGT_NOTICE = 7;
var MSGT_SYSTEM = 8;

var CS_DISCONNECTED = 0;
var CS_CONNECTING = 1;
var CS_CONNECTED = 2;

var CT_CHANNEL = 0;
var CT_PRIVATE = 1;

var colormap = [ "#00CCCC", "#000000", "#0000CC", "#CC00CC", "#606060",
	"green", "#00CC00", "maroon", "navy", "olive", "purple",
	"red", "#909090", "teal", "#CCCC00" ]

var commands = [ "/join", "/part", "/nick", "/query", "/quote", "/msg",
	"/op", "/deop", "/voice", "/devoice", "/ping", "/notice", "/away",
	"/ctcp" ];

function create_tab_if_needed(chan, connection_id, tab_type) {
	try {
		var caption = chan;

		if (tab_type == "S") chan = "---";

		var tab_id = "tab-" + chan + ":" + connection_id;

		if (!tab_type) tab_type = "C";

		var tab_caption_id = "tab-" + connection_id;
		var tab_list_id = "tabs-" + connection_id;

		if (!$(tab_caption_id)) {

			var cimg = "<img class=\"conn-img\" "+
				"src=\"" + theme_images['srv_offline.png'] + "\" alt=\"\" " +
				"id=\"cimg-" + connection_id + "\">";

			var tab = "<li id=\"" + tab_caption_id + "\" " +
				"channel=\"" + chan + "\" " +
				"tab_type=\"" + tab_type + "\" " +
				"connection_id=\"" + connection_id + "\" " +
		  		"onclick=\"change_tab(this)\">" + cimg +
				"<div>" + caption + "</div></li>";

			tab += "<ul class=\"sub-tabs\" id=\"" + tab_list_id + "\"></ul>";

			console.log("creating tab+list: " + tab_id + " " + tab_type);

			$("tabs-list").innerHTML += tab;
		} else if (!$(tab_id) && tab_type != "S") {

			var img = "<img class=\"conn-img\" "+
				"src=\""+theme_images['close_tab.png']+"\" alt=\"[X]\" " +
				"title=\"" + __("Close this tab") + "\"" +
				"tab_id=\"" + tab_id + "\"" +
				"onclick=\"close_tab(this)\">";

			var tab = "<li id=\"" + tab_id + "\" " +
				"channel=\"" + chan + "\" " +
				"tab_type=\"" + tab_type + "\" " +
				"connection_id=\"" + connection_id + "\" " +
		  		"onclick=\"change_tab(this)\">" + img +
				"<div class=\"indented\">" +  caption + "</div></li>";

			console.log("creating tab: " + tab_id + " " + tab_type);

			$(tab_list_id).innerHTML += tab;

			sort_connection_tabs($(tab_list_id));

			var tab = $(tab_id);

			if (tab && tab_type == "C") change_tab(tab);
		}

		return tab_id;

	} catch (e) {
		exception_error("create_tab_if_needed", e);
	}
}

function show_nicklist(show) {
/*	try {
		console.log("show_nicklist: " + show);
		if (show) {
			Element.show("userlist");
			$("log-outer").style.right = ($("userlist").offsetWidth + 0) + "px";
			$("input").style.right = ($("userlist").offsetWidth + 0) + "px";

		} else {
			Element.hide("userlist");
			$("log-outer").style.right = "0px";
			$("input").style.right = "0px";

		}
	} catch (e) {
		exception_error("show_nicklist", e);
	} */
}

function init_second_stage(transport) {
	try {

		var params = _eval(transport.responseText);

		if (!handle_error(params, transport)) return false;

		if (!params || params.status != 1) {
			return fatal_error(14, __("The application failed to initialize."),
				transport.responseText);
		}

		last_old_id = params.max_id;

		theme_images = params.images;

		update_delay_max = params.update_delay_max;
		theme = params.theme;

		startup_date = new Date();

		Element.hide("overlay");

		$("input-prompt").value = "";
		$("input-prompt").focus();

		console.log("init_second_stage");

		document.onkeydown = hotkey_handler;

		enable_hotkeys();

		hide_spinner();

		update(true);

		twitter_id = window.setTimeout("twitter_update()", 10000);

	} catch (e) {
		exception_error("init_done", e);
	}
}

function init() {
	try {
		if (getURLParam('debug')) {
			Element.show("debug_output");
			console.log('debug mode activated');
		}

		show_spinner();

		new Ajax.Request("backend.php", {
		parameters: "?op=init",
		onComplete: function (transport) {
			init_second_stage(transport);
		} });

	} catch (e) {
		exception_error("init", e);
	}
}

function _eval(data, silent) {
	try {
		return eval("(" + data + ")");
	} catch (e) {
		if (!silent) exception_error("_eval", e, data);
	}
}

function handle_update(transport) {
	try {

		var rv = _eval(transport.responseText, true);

		if (!rv) {
			console.log("received null object from server, will try again.");
			return true;
		}

		if (!handle_error(rv, transport)) return false;

		var conn_data = rv[0];
		var lines = rv[1];
		var chandata = rv[2];
		var params = rv[3];

		if (params) {
			highlight_on = params.highlight_on;

			/* we can't rely on PHP mb_strtoupper() since it sucks cocks */

			for (var i = 0; i < highlight_on.length; i++) {
				highlight_on[i] = highlight_on[i].toUpperCase();
			}

			notify_events = params.notify_events;
			hide_join_part = params.hide_join_part;
		}

		last_update = new Date();

		handle_conn_data(conn_data);
		handle_chan_data(chandata);

		var prev_last_id = last_id;

		for (var i = 0; i < lines.length; i++) {

			if (last_id < lines[i].id) {

//				console.log("processing line ID " + lines[i].id);

				var chan = lines[i].channel;
				var connection_id = lines[i].connection_id;

				//lines[i].message += " [" + lines[i].id + "/" + last_id + "]";

				lines[i].ts = lines[i].ts.replace(/\-/g, '/');
				lines[i].ts = new Date(Date.parse(lines[i].ts));

				if (lines[i].message_type == MSGT_EVENT) {
					handle_event(li_classes[chan], connection_id, lines[i]);
				} else {
					push_message(connection_id, chan, lines[i], lines[i].message_type);
					if (!window_active) ++new_messages;
				}

				if (buffers[connection_id] && buffers[connection_id][chan]) {
					while (buffers[connection_id][chan].length > 100) {
						buffers[connection_id][chan].shift();
					}
				}
			}

			last_id = lines[i].id;
		}

		if (!get_selected_tab()) {
			change_tab(get_all_tabs()[0]);
		}

		if (prev_last_id != last_id)
			update_buffer();

		if (prev_last_id == last_id && update_delay_max == 0) {
			if (delay < 3000) delay += 500;
		} else {
			delay = 1500;
		}

	} catch (e) {
		exception_error("handle_update", e);
	}

	return true;
}

function timeout() {
	try {
		console.log("update timeout detected, retrying...");

		window.clearTimeout(update_id);
		update_id = window.setTimeout("update()", timeout_delay);

	} catch (e) {
		exception_error("timeout", e);
	}
}

function update(init) {
	try {
		var query = "?op=update&last_id=" + last_id;

		if (init) query += "&init=" + init;

//		console.log("request update..." + query + " last: " + last_update);

		timeout_id = window.setTimeout("timeout()",
			(update_delay_max * 1000) + 10000);

		new Ajax.Request("backend.php", {
		parameters: query,
		onComplete: function (transport) {
			window.clearTimeout(timeout_id);
			window.clearTimeout(update_id);
			if (!handle_update(transport)) return;

//			console.log("update done, next update in " + delay + " ms");

			update_id = window.setTimeout("update()", delay);
		} });

	} catch (e) {
		exception_error("update", e);
	}
}

function get_selected_tab() {
	try {
		var tabs = $("tabs-list").getElementsByTagName("li");

		for (var i = 0; i < tabs.length; i++) {
			if (tabs[i].className == "selected") {
				return tabs[i];
			}
		}

		return false;

	} catch (e) {
		exception_error("get_selected_tab", e);
	}
}

function get_all_tabs(connection_id) {
	try {
		var tabs;
		var rv = [];

		if (connection_id) {
			tabs = $("tabs-" + connection_id).getElementsByTagName("LI");
			rv.push($("tab-" + connection_id));
		} else {
			tabs = $("tabs-list").getElementsByTagName("li");
		}


		for (var i = 0; i < tabs.length; i++) {
			if (tabs[i].id && tabs[i].id.match("tab-")) {
				rv.push(tabs[i]);
			}
		}

		return rv;

	} catch (e) {
		exception_error("get_all_tabs", e);
	}
}

function update_buffer() {
	try {

		var tab = get_selected_tab();
		if (!tab) return;

		var channel = tab.getAttribute("channel");

		if (tab.getAttribute("tab_type") == "S") channel = "---";

		var connection_id = tab.getAttribute("connection_id");

		var test_height = $("log").scrollHeight - $("log").offsetHeight;
		var scroll_buffer = false;
		var line_id = 0;

		if (test_height - $("log").scrollTop < 50) scroll_buffer = true;

		if (buffers[connection_id]) {

			var buffer = buffers[connection_id][channel];

			if (buffer) {

				/* do we need to redraw everything? */

				var log_channel = $("log-list").getAttribute("channel");
				var log_connection = $("log-list").getAttribute("connection_id");
				var log_line_id = $("log-list").getAttribute("last_id");

				if (log_channel != channel || log_connection != connection_id) {
					var tmp = "";
					line_id = 0;
					for (var i = 0; i < buffer.length; i++) {
						tmp += buffer[i][1];
						line_id = buffer[i][0];
					}

					$("log-list").innerHTML = tmp;

				} else {

					line_id = parseInt(log_line_id);
					var tmp = "";

					for (var i = 0; i < buffer.length; i++) {
						var tmp_id = parseInt(buffer[i][0]);
						var force_display = buffer[i][2];

						if (tmp_id > line_id || force_display != undefined) {
							tmp += buffer[i][1];
							line_id = tmp_id;
							buffer[i][2] = undefined;
						}
					}

					$("log-list").innerHTML += tmp;

				}
				if (scroll_buffer) $("log").scrollTop = $("log").scrollHeight;
			} else {
				$("log-list").innerHTML = "";
			}
		} else {
			$("log-list").innerHTML = "";
		}

		$("log-list").setAttribute("last_id", line_id);
		$("log-list").setAttribute("channel", channel);
		$("log-list").setAttribute("connection_id", connection_id);

		//show_nicklist(get_selected_buffer() != "---");

		if (nicklists[connection_id]) {

			var nicklist = nicklists[connection_id][channel];

			if (nicklist) {

				$("userlist-list").innerHTML = "";

				for (var i = 0; i < nicklist.length; i++) {

					var row_class = (i % 2) ? "even" : "odd";

					var nick_image = "<img src=\""+theme_images['user_normal.png']+
						"\" alt=\"\">";

					var nick = nicklist[i];

					switch (nick.substr(0,1)) {
					case "@":
						nick_image = "<img src=\""+theme_images['user_op.png']+"\" alt=\"\">";
						nick = nick.substr(1);
						break;
					case "+":
						nick_image = "<img src=\""+theme_images['user_voice.png']+"\" alt=\"\">";
						nick = nick.substr(1);
						break;
					}

					var userhosts = conndata_last[connection_id]["userhosts"];
					var nick_ext_info = "";

					if (userhosts && userhosts[nick]) {
						nick_ext_info = userhosts[nick][0] + '@' +
							userhosts[nick][1] + " <" + userhosts[nick][3] + ">";

						if (userhosts[nick][6] != null) {
							var d = new Date();
							var ts = d.getTime()/1000;

							var delta = parseInt(ts - parseInt(userhosts[nick][6]));

							if (delta > 0) {
								nick_ext_info += "\n" +
									__("Last message: %d seconds ago.").replace("%d", delta);
							}
						}
					}

/*					if (nick == active_nicks[connection_id]) {
						nick = "<strong>" + nick + "</strong>";
					} */

					var tmp_html = "<li class=\""+row_class+"\" " +
						"title=\"" + nick_ext_info + "\"" +
					  	"nick=\"" + nick + "\" " +
						"onclick=\"query_user(this)\">" +
						nick_image + " " + nick + "</li>";

					$("userlist-list").innerHTML += tmp_html;
				}
			} else {
				$("userlist-list").innerHTML = "";
			}
		}

		if (topics[connection_id] && tab.getAttribute("tab_type") != "P") {
			var topic = topics[connection_id][channel];

			if (topic) {
				if ($("topic-input").title != topics[connection_id][channel][0]) {
					$("topic-input").value = topics[connection_id][channel][0];
				}

				$("topic-input").disabled = conndata_last[connection_id].status != "2";
			} else {

				if (tab.getAttribute("tab_type") != "S") {
					$("topic-input").value = "";
					$("topic-input").disabled = true;

				} else {
					if (conndata_last[connection_id].status == CS_CONNECTED) {
						$("topic-input").value = __("Connected to: ") +
							conndata_last[connection_id]["active_server"];
						$("topic-input").disabled = true;
					} else {
						$("topic-input").value = __("Disconnected.");
						$("topic-input").disabled = true;
					}
				}
			}
		} else if (tab.getAttribute("tab_type") == "S") {
			$("topic-input").value = __("Disconnected.");
			$("topic-input").disabled = true;
		} else {

			var nick = tab.getAttribute("channel");
			var userhosts = conndata_last[connection_id]["userhosts"];
			var nick_ext_info = "";

			if (userhosts && userhosts[nick]) {
				nick_ext_info = userhosts[nick][0] + '@' + userhosts[nick][1];
			}

			$("topic-input").value = __("Conversation with") + " " +
				tab.getAttribute("channel") + " (" + nick_ext_info + ")";
			$("topic-input").disabled = true;
		}

		if (conndata_last && conndata_last[connection_id]) {
			$("input-prompt").disabled = conndata_last[connection_id].status != 2;
		}

		$("topic-input").title = $("topic-input").value;

		$("nick").innerHTML = active_nicks[connection_id];

		if (conndata_last && conndata_last[connection_id]) {
			var nick = active_nicks[connection_id];

			if (nick && conndata_last[connection_id]["userhosts"][nick]) {


				if (conndata_last[connection_id]["userhosts"][nick][4] == true) {
					$("nick").className = "away";
				} else {
					$("nick").className = "";
				}
			}

		}

		switch (conndata_last[connection_id].status) {
			case "0":
				$('connect-btn').innerHTML = __("Connect");
				$('connect-btn').disabled = false;
				$('connect-btn').setAttribute("set_enabled", 1);
				break;
			case "1":
				$('connect-btn').innerHTML = __("Connecting...");
				$('connect-btn').disabled = false;
				$('connect-btn').setAttribute("set_enabled", 0);
				break;
			case "2":
				$('connect-btn').innerHTML = __("Disconnect");
				$('connect-btn').disabled = false;
				$('connect-btn').setAttribute("set_enabled", 0);
				break;
		}

		$('connect-btn').setAttribute("connection_id", connection_id);

		update_title();

	} catch (e) {
		exception_error("update_buffer", e);
	}
}

function change_topic(elem, evt) {
	try {

     var key;

		if(window.event)
			key = window.event.keyCode;     //IE
		else
			key = evt.which;     //firefox

		if (key == 13) {

			var tab = get_selected_tab();

			if (!tab) return;

			var channel = tab.getAttribute("channel");
			var connection_id = tab.getAttribute("connection_id")

			if (tab.getAttribute("tab_type") == "S") channel = "---";

			topics[connection_id][channel] = elem.value;

			var query = "?op=set-topic&topic=" + param_escape(elem.value) +
				"&chan=" + param_escape(channel) +
				"&connection=" + param_escape(connection_id) +
				"&last_id=" + last_id;

			console.log(query);

			show_spinner();

			new Ajax.Request("backend.php", {
			parameters: query,
			onComplete: function (transport) {
				hide_spinner();
				handle_update(transport);
			} });
		}

	} catch (e) {
		exception_error("change_topic", e);
	}
}

function send(elem, evt) {
	try {

     var key;

		if(window.event)
			key = window.event.keyCode;     //IE
		else
			key = evt.which;     //firefox

		if (key == 13) {

			var tab = get_selected_tab();

			if (!tab) return;

			var channel = tab.getAttribute("channel");

			if (tab.getAttribute("tab_type") == "S") channel = "---";

			var query = "?op=send&message=" + param_escape(elem.value) +
				"&chan=" + param_escape(channel) +
				"&connection=" + param_escape(tab.getAttribute("connection_id")) +
				"&last_id=" + last_id + "&tab_type=" + tab.getAttribute("tab_type");

			push_cache(elem.value);

			elem.value = '';

			console.log(query);

			show_spinner();

			set_window_active(true);

			new Ajax.Request("backend.php", {
			parameters: query,
			onComplete: function (transport) {
				hide_spinner();
				handle_update(transport);
			} });
		}

	} catch (e) {
		exception_error("send", e);
	}
}

function handle_error(obj, transport) {
	try {
		if (obj && obj.error) {
			return fatal_error(obj.error, obj.errormsg, transport.responseText);
		}
		return true;
	} catch (e) {
		exception_error("handle_error", e);
	}
}

function change_tab(elem) {
	try {

		if (!elem) return;

		var tabs = get_all_tabs();

		for (var i = 0; i < tabs.length; i++) {
			if (tabs[i].className == "selected") tabs[i].className = "";
		}

		elem.className = "selected";

		console.log("changing tab to " + elem.id);

		update_buffer();

		if (theme != "tablet")
			$("input-prompt").focus();

	} catch (e) {
		exception_error("change_tab", e);
	}
}

function toggle_connection(elem) {
	try {

//		elem.disabled = true;

		var query = "?op=toggle-connection&set_enabled=" +
			param_escape(elem.getAttribute("set_enabled")) +
			"&connection_id=" + param_escape(elem.getAttribute("connection_id"));

		console.log(query);

		show_spinner();

		new Ajax.Request("backend.php", {
		parameters: query,
		onComplete: function (transport) {
			hide_spinner();
		} });

	} catch (e) {
		exception_error("change_tab", e);
	}
}

function format_message(row_class, param, connection_id) {
	try {

		var is_hl = param.sender != conndata_last[connection_id].active_nick &&
			is_highlight(connection_id, param.message);

		var tmp;

		var color = "";

		if (param.sender_color) {
			color = "style=\"color : " + colormap[param.sender_color] + "\"";
		}

		var nick_ext_info = "";
		var userhosts = conndata_last[connection_id]["userhosts"];

		if (userhosts && userhosts[param.sender]) {
			nick_ext_info = userhosts[param.sender][0] + '@' +
				userhosts[param.sender][1] + " <" + userhosts[param.sender][3] + ">";
		}

		if (is_hl) {
			if (param.channel != "---" && param.id > last_old_id) {
				++new_highlights;
				var tab = find_tab(connection_id, param.channel);

				if (notify_events[1] && (tab != get_selected_tab() || !window_active)) {
					var msg = __("Received highlight on %c by %n: %s");

					msg = msg.replace("%c", param.channel);
					msg = msg.replace("%n", param.sender);
					msg = msg.replace("%s", param.message);

					notify(msg);
				}
			}
		}

		if (param.message_type == MSGT_ACTION) {

			if (is_hl) row_class += "HL";

			message = "* " + param.sender + " " + param.message;

			tmp = "<li class=\""+row_class+"\"><span class='timestamp'>" +
				make_timestamp(param.ts) + "</span> " +
				"<span class='action'>" + message + "</span>";

		} else if (param.message_type == MSGT_NOTICE) {

			var sender_class = '';

			if (param.incoming == true) {
				sender_class = 'pvt-sender';
			} else {
				sender_class = 'pvt-sender-out';
			}

			tmp = "<li class=\""+row_class+"\"><span class='timestamp'>" +
				make_timestamp(param.ts) +
				"</span> <span class='lt'>-</span><span title=\""+nick_ext_info+"\" " +
				"class='"+sender_class+"' "+color+">" +
				param.sender + "</span><span class='gt'>-</span> " +
				"<span class='message'>" +
				param.message + "</span>";

		} else if (param.sender != "---" && param.message_type != MSGT_SYSTEM) {

			if (is_hl) row_class += "HL";

			param.message = param.message.replace(/\(oo\)/g,
					"<img src='images/piggie_icon.png' alt='(oo)'>");

			param.message = param.message.replace(/(^| )_(.*?)_( |$)/g,
					"$1<span class=\"underline\">$2</span>$3");

//			param.message = param.message.replace(/(OO)/g,
//					"<img src='images/piggie.png' alt='(oo)'>");

			tmp = "<li class=\""+row_class+"\"><span class='timestamp'>" +
				make_timestamp(param.ts) +
				"</span> <span class='lt'>&lt;</span><span title=\""+nick_ext_info+"\" " +
				"class='sender' "+color+">" +
				param.sender + "</span><span class='gt'>&gt;</span> " +
				"<span class='message'>" +
				param.message + "</span>";
		} else {
			tmp = "<li class=\""+row_class+"\"><span class='timestamp'>" +
				make_timestamp(param.ts) + "</span> " +
				"<span class='sys-message'>" +
				param.message + "</span>";
		}

		return [param.id, tmp];

	} catch (e) {
		exception_error("format_message", e);
	}
}

function handle_conn_data(conndata) {
	try {
		if (conndata != "") {

			conndata_last = [];

			for (var i = 0; i < conndata.length; i++) {

				create_tab_if_needed(conndata[i].title, conndata[i].id, "S");
				conndata_last[conndata[i].id] = conndata[i];

				if (conndata[i].status == "2") {
					active_nicks[conndata[i].id] = conndata[i].active_nick;

					$("cimg-" + conndata[i].id).src = $("cimg-" + conndata[i].id).src.replace("offline", "online");

				} else {
					active_nicks[conndata[i].id] = [];
					nicklists[conndata[i].id] = [];

					$("cimg-" + conndata[i].id).src = $("cimg-" + conndata[i].id).src.replace("online", "offline");

				}
			}
		} else {
			conndata_last = [];
		}
	} catch (e) {
		exception_error("handle_conn_data", e);
	}
}

function handle_chan_data(chandata) {
	try {
		if (chandata != "") {
			for (var connection_id in chandata) {

				if (!nicklists[connection_id]) nicklists[connection_id] = [];
				if (!topics[connection_id]) topics[connection_id] = [];

				for (var chan in chandata[connection_id]) {

					var tab_type = "P";

					switch (parseInt(chandata[connection_id][chan].chan_type)) {
					case 0:
						tab_type = "C";
						break;
					case 1:
						tab_type = "P";
						break;
					}

					create_tab_if_needed(chan, connection_id, tab_type);

					nicklists[connection_id][chan] = chandata[connection_id][chan]["users"];

					if ((!topics[connection_id][chan] ||
							!topics[connection_id][chan][0]) &&
							chandata[connection_id][chan]["topic"][0] && tab_type == "C") {

						var line = new Object();

						line.message = __("Topic for %c is: %s").replace("%c", chan);
						line.message = line.message.replace("%s",
								rewrite_urls(chandata[connection_id][chan]["topic"][0]));
						line.message_type = MSGT_SYSTEM;
						line.ts = new Date();
						line.id = last_id;
						line.force_display = 1;

						push_message(connection_id, chan, line, MSGT_PRIVMSG);

						line.message = __("Topic for %c set by %n at %d").replace("%c", chan);
						line.message = line.message.replace("%n",
								rewrite_urls(chandata[connection_id][chan]["topic"][1]));
						line.message = line.message.replace("%d",
								rewrite_urls(chandata[connection_id][chan]["topic"][2]));
						line.message_type = MSGT_SYSTEM;
						line.ts = new Date();
						line.id = last_id;
						line.force_display = 1;

						push_message(connection_id, chan, line, MSGT_PRIVMSG);

						topics[connection_id][chan] = chandata[connection_id][chan]["topic"];

						update_buffer();

					} else {
						topics[connection_id][chan] = chandata[connection_id][chan]["topic"];
					}
				}
			}
		}

		cleanup_tabs(chandata);
		update_title(chandata);

	} catch (e) {
		exception_error("handle_chan_data", e);
	}
}

function update_title() {
	try {

		var tab = get_selected_tab();

		if (tab) {
			var title = __("Tiny Tiny IRC [%a @ %b / %c]");
			var connection_id = tab.getAttribute("connection_id");

			if (!window_active && new_messages) {
				if (new_highlights) {
					title = "[*"+new_messages+"] " + title;
				} else {
					title = "["+new_messages+"] " + title;
				}

				if (window.fluid) {
					if (new_highlights) {
						window.fluid.dockBadge = "* " + new_messages;
					} else {
						window.fluid.dockBadge = new_messages;
					}
				}
			} else {
				if (window.fluid) {
					window.fluid.dockBadge = "";
				}
			}


			if (conndata_last[connection_id]) {
				title = title.replace("%a", active_nicks[connection_id]);
				title = title.replace("%b", conndata_last[connection_id].title);
				title = title.replace("%c", tab.getAttribute("channel"));
				document.title = title;
			} else {
				document.title = __("Tiny Tiny IRC");
			}

		} else {
			document.title = __("Tiny Tiny IRC");
		}

	} catch (e) {
		exception_error("update_title", e);
	}
}

function send_command(command) {
	try {

		var tab = get_selected_tab();

		if (tab) {

			var channel = tab.getAttribute("channel");

			if (tab.getAttribute("tab_type") == "S") channel = "---";

			var query = "?op=send&message=" + param_escape(command) +
				"&channel=" + param_escape(channel) +
				"&connection=" + param_escape(tab.getAttribute("connection_id")) +
				"&last_id=" + last_id;

			console.log(query);

			show_spinner();

			new Ajax.Request("backend.php", {
			parameters: query,
			onComplete: function (transport) {
				hide_spinner();
				handle_update(transport);
			} });
		}

	} catch (e) {
		exception_error("send_command", e);
	}
}

function change_nick() {
	try {
		var nick = prompt("Enter new nickname:");

		if (nick) send_command("/nick " + nick);

	} catch (e) {
		exception_error("change_nick", e);
	}
}

function join_channel() {
	try {
		var channel = prompt("Channel to join:");

		if (channel) send_command("/join " + channel);

	} catch (e) {
		exception_error("join_channel", e);
	}
}

function handle_action(elem) {
	try {
		console.log("action: " + elem[elem.selectedIndex].value);

		elem.selectedIndex = 0;
	} catch (e) {
		exception_error("handle_action", e);
	}
}

function cleanup_tabs(chandata) {
	try {
		var tabs = get_all_tabs();

		for (var i = 0; i < tabs.length; i++) {
			var chan = tabs[i].getAttribute("channel");
			var connection_id = tabs[i].getAttribute("connection_id");

			if (tabs[i].getAttribute("tab_type") == "S") {
				if (conndata_last && !conndata_last[connection_id]) {

					console.log("removing unnecessary S-tab: " + tabs[i].id);

					var tab_list = $("tabs-" + connection_id);

					$("tabs-list").removeChild(tabs[i]);
					$("tabs-list").removeChild(tab_list);
				}
			}

			if (tabs[i].getAttribute("tab_type") != "S") {
				if (!chandata[connection_id] ||
						(chandata[connection_id] && !chandata[connection_id][chan])) {

					console.log("removing unnecessary C/P-tab: " + tabs[i].id);

					var tab_list = $("tabs-" + connection_id);

					if (tab_list) tab_list.removeChild(tabs[i]);

				}
			}
		}
	} catch (e) {
		exception_error("cleanup_tabs", e);
	}

}

function close_tab(elem) {
	try {

		if (!elem) return;

		var tab_id = elem.getAttribute("tab_id");
		var tab = $(tab_id);

		if (tab && confirm(__("Close this tab?"))) {

			var query = "?op=part-channel" +
				"&chan=" + param_escape(tab.getAttribute("channel")) +
				"&connection=" + param_escape(tab.getAttribute("connection_id")) +
				"&last_id=" + last_id;

			console.log(query);

			show_spinner();

			new Ajax.Request("backend.php", {
			parameters: query,
			onComplete: function (transport) {
				handle_update(transport);
				hide_spinner();
			} });
		}

	} catch (e) {
		exception_error("change_tab", e);
	}
}

function query_user(elem) {
	try {

		if (!elem) return;

		var tab = get_selected_tab();
		var nick = elem.getAttribute("nick");
		var pr = __("Start conversation with %s?").replace("%s", nick);

		if (tab && confirm(pr)) {

			var query = "?op=query-user&nick=" + param_escape(nick) +
				"&connection=" + param_escape(tab.getAttribute("connection_id")) +
				"&last_id=" + last_id;

			console.log(query);

			show_spinner();

			new Ajax.Request("backend.php", {
			parameters: query,
			onComplete: function (transport) {
				handle_update(transport);
				hide_spinner();
			} });

		}

	} catch (e) {
		exception_error("query_user", e);
	}
}

function handle_event(li_class, connection_id, line) {
	try {
		var params = line.message.split(":", 3);

		console.log("handle_event " + params[0]);

		switch (params[0]) {
		case "TOPIC":
			var topic = line.message.replace("TOPIC:", "");

			line.message = __("%u has changed the topic to: %s").replace("%u", line.sender);
			line.message = line.message.replace("%s", topic);
			line.sender = "---";

			push_message(connection_id, line.channel, line, MSGT_PRIVMSG);

			break;
		case "MODE":
			var mode = params[1];
			var subject = params[2];

			var msg_type;

			if (mode) {
				line.message = __("%u has changed mode [%m] on %s").replace("%u",
						line.sender);
				line.message = line.message.replace("%m", mode);
				line.message = line.message.replace("%s", subject);
				line.sender = "---";

				msg_type = MSGT_PRIVMSG;
			} else {
				line.sender = "---";

				line.message = __("%u has changed mode [%m]").replace("%u",
						line.channel);
				line.message = line.message.replace("%m", subject);

				msg_type = MSGT_BROADCAST;
			}

			push_message(connection_id, line.channel, line, msg_type);

			break;
		case "KICK":
			var nick = params[1];
			var message = params[2];

			line.message = __("%u has been kicked from %c by %n (%m)").replace("%u", nick);
			line.message = line.message.replace("%c", line.channel);
			line.message = line.message.replace("%n", line.sender);
			line.message = line.message.replace("%m", message);
			line.sender = "---";

			push_message(connection_id, line.channel, line, MSGT_PRIVMSG);

			break;

		case "PART":
			var nick = params[1];
			var message = params[2];

			line.message = __("%u has left %c (%m)").replace("%u", nick);
			line.message = line.message.replace("%c", line.channel);
			line.message = line.message.replace("%m", message);

			push_message(connection_id, line.channel, line, MSGT_PRIVMSG, hide_join_part);

			break;
		case "JOIN":
			var nick = params[1];
			var host = params[2];

			line.message = __("%u (%h) has joined %c").replace("%u", nick);
			line.message = line.message.replace("%c", line.channel);
			line.message = line.message.replace("%h", host);
			line.message_type = MSGT_SYSTEM;

			push_message(connection_id, line.channel, line, MSGT_PRIVMSG, hide_join_part);

			break;
		case "QUIT":
			var quit_msg = line.message.replace("QUIT:", "");

			line.message = __("%u has quit IRC (%s)").replace("%u", line.sender);
			line.message = line.message.replace("%s", quit_msg);
			line.message_type = MSGT_SYSTEM;

			push_message(connection_id, line.channel, line, MSGT_PRIVMSG, hide_join_part);
			break;
		case "DISCONNECT":
			line.message = __("Connection terminated.");

			if (last_id > last_old_id && notify_events[3])
				notify("Disconnected from server.");

			push_message(connection_id, '---', line);
			break;
		case "REQUEST_CONNECTION":
			line.message = __("Requesting connection...");

			push_message(connection_id, '---', line);
			break;
		case "CONNECTING":
			var server = params[1];
			var port = params[2];

			line.message = __("Connecting to %s:%d...").replace("%s", server);
			line.message = line.message.replace("%d", port);

			push_message(connection_id, '---', line);
			break;
		case "PING_REPLY":
			var args = params[1];

			line.message = __("Ping reply from %u: %d second(s).").replace("%u",
					line.sender);
			line.message = line.message.replace("%d", args);
			line.message_type = MSGT_SYSTEM;

			var tab = get_selected_tab();

			if (!tab) get_all_tabs()[0];

			if (tab) {
				var chan = tab.getAttribute("channel");
				line.channel = chan;
			}

			push_message(connection_id, line.channel, line);
			break;
		case "NOTICE":
			var message = params[1];
			var tab = get_selected_tab();

			line.message = message;
			line.message_type = MSGT_NOTICE;

			if (line.channel != "---")
				push_message(connection_id, line.sender, line);
			else
				push_message(connection_id, line.channel, line);

			break;

		case "CTCP":
			var command = params[1];
			var args = params[2];

			line.message = __("Received CTCP %c (%a) from %u").replace("%c", command);
			line.message = line.message.replace("%a", args);
			line.message = line.message.replace("%u", line.sender);
			line.message_type = MSGT_SYSTEM;

			push_message(connection_id, '---', line);
			break;

		case "CTCP_REPLY":
			var command = params[1];
			var args = params[2];

			line.message = __("CTCP %c reply from %u: %a").replace("%c", command);
			line.message = line.message.replace("%a", args);
			line.message = line.message.replace("%u", line.sender);
			line.message_type = MSGT_SYSTEM;

			push_message(connection_id, line.channel, line);
			break;


		case "PING":
			var args = params[1];

			line.message = __("Received ping (%s) from %u").replace("%s", args);
			line.message = line.message.replace("%u", line.sender);
			line.message_type = MSGT_SYSTEM;

			push_message(connection_id, '---', line, MSGT_BROADCAST);
			break;
		case "CONNECT":
			line.message = __("Connection established.");

			if (last_id > last_old_id && notify_events[3])
				notify("Connected to server.");

			push_message(connection_id, '---', line);
			break;
		case "UNKNOWN_CMD":
			line.message = __("Unknown command: /%s.").replace("%s", params[1]);
			push_message(connection_id, "---", line, MSGT_PRIVMSG);
			break;
		case "NICK":
			var new_nick = params[1];

			if (buffers[connection_id] && buffers[connection_id][line.sender]) {
				buffers[connection_id][new_nick] = buffers[connection_id][line.sender];
			}

			line.message = __("%u is now known as %n").replace("%u", line.sender);
			line.message = line.message.replace("%n", new_nick);
			line.message_type = MSGT_SYSTEM;

			push_message(connection_id, line.channel, line, MSGT_PRIVMSG, hide_join_part);

			break;
		case "TWITTER_MSG":
			var params = line.message.split(":", 3);

			var id = params[1];
			var name = params[2];
			var message = line.message.replace(/^TWITTER_MSG:.*?:.*?:/, "");

			var link = "http://twitter.com/" + name + "/statuses/" + id;

			message = "<span class=\"twitter-msg\">" + message + "</span>";

			line.message = __("%s (via %l)").replace("%s", message);
			line.message = line.message.replace("%l",
				"<a target=\"blank\" href=\""+link+"\">Twitter</a>");

			if (!window_active) ++new_messages;

			push_message(connection_id, '---', line, MSGT_BROADCAST);
			break;

		}

	} catch (e) {
		exception_error("handle_event", e);
	}
}

function toggle_li_class(channel) {
	if (!li_classes[channel]) {
		li_classes[channel] = "odd";
	} else {
		if (li_classes[channel] == "odd") {
			li_classes[channel] = "even";
		} else {
			li_classes[channel] = "odd";
		}
	}
}

function push_message(connection_id, channel, message, message_type, no_tab_hl) {
	try {
		if (no_tab_hl == undefined) no_tab_hl = false;

		if (!message_type) message_type = MSGT_PRIVMSG;

		if (!buffers[connection_id]) buffers[connection_id] = [];
		if (!buffers[connection_id][channel]) buffers[connection_id][channel] = [];

		if (message_type != MSGT_BROADCAST) {
			toggle_li_class(channel);

			var tmp_html = format_message(li_classes[channel], message, connection_id);

			tmp_html.push(message.force_display);

			buffers[connection_id][channel].push(tmp_html);

			var tab = find_tab(connection_id, channel);

			if (tab && notify_events[2] && (get_selected_tab() != tab || !window_active)) {
				if (tab.getAttribute("tab_type") == "P" && message.id > last_old_id) {
					var msg = __("Received new private message from %n: %s");

					msg = msg.replace("%n", message.sender);
					msg = msg.replace("%s", message.message);

					notify(msg);

				}
			}

			if (!no_tab_hl && message.ts > startup_date)
				highlight_tab_if_needed(connection_id, channel, message);

		} else {
			var tabs = get_all_tabs(connection_id);

			for (var i = 0; i < tabs.length; i++) {
				var chan = tabs[i].getAttribute("channel");

				if (!buffers[connection_id][chan]) buffers[connection_id][chan] = [];

				if (tabs[i].getAttribute("tab_type") == "C") {
					toggle_li_class(chan);
					var tmp_html = format_message(li_classes[chan], message, connection_id);

					tmp_html.push(message.force_display);

					buffers[connection_id][chan].push(tmp_html);

//					highlight_tab_if_needed(connection_id,
//						tabs[i].getAttribute("channel"), message);
				}
			}
		}

	} catch (e) {
		exception_error("push_message", e);
	}
}

function set_window_active(active) {
	try {
		console.log("set_window_active: " + active);

		window_active = active;

		if (active) {
			new_messages = 0;
			new_highlights = 0;

			$("log").scrollTop = $("log").scrollHeight;

			if (theme != "tablet")
				$("input-prompt").focus();
		}

		window.setTimeout("update_title()", 100);
	} catch (e) {
		exception_error("window_active", e);
	}
}

var _tooltip_elem;

function show_thumbnail(img) {
	try {
		if (_tooltip_elem && !Element.visible("preview-shadow")) {

			hide_spinner();

			var elem = _tooltip_elem;

			var xy = Element.cumulativeOffset(elem);

			xy[1] -= $("log-list").scrollTop;
			xy[1] -= $("log").scrollTop;

			var scaled_height = img.height;

			if (img.height > 250 && img.height > img.width) {
				scaled_height = 250;
			} else if (img.width > 250) {
				scaled_height *= (250 / img.width);
			}

			scaled_height = parseInt(scaled_height);

			//console.log("SH:" + scaled_height);

			if (xy[1] + scaled_height >= $("log").offsetHeight - 50) {
				xy[1] -= 10;
				xy[1] -= scaled_height;
			} else {
				xy[1] += Element.getHeight(elem);
				xy[1] += 10;
			}

			console.log(xy[1]);

			$("image-tooltip").style.left = xy[0] + "px";
			$("image-tooltip").style.top = xy[1] + "px";

			Effect.Appear($("image-tooltip"));
		} else {
			hide_spinner();
		}

	} catch (e) {
		exception_error("show_thumbnail", e);
	}
}

function resize_preview() {

	try {
		var vp = document.viewport.getDimensions();
		var img = $$("#image-preview img")[0];

		var max_width = vp.width/1.5;
		var max_height = vp.height/1.5;

		if (img.width > max_width) {
			img.height *= (max_width / img.width);
			img.width = max_width;
		}

		if (img.height > max_height) {
			img.width *= (max_height / img.height);
			img.height = max_height;
		}

		var dp = $("preview-shadow").getDimensions();

		$("preview-shadow").setStyle({
			left: (vp.width/2 - dp.width/2) + "px",
			top: (vp.height/2 - dp.height/2) + "px",
			width: dp.width,
			height: dp.height,
		});

	} catch (e) {
		exception_error("resize_preview", e);
	}
}

function show_preview(img) {
	try {
		hide_spinner();

		Element.show("preview-shadow");

		window.setTimeout("resize_preview()", 1);

	} catch (e) {
		exception_error("show_preview", e);
	}
}

function m_c(elem) {
	try {

		if (!elem.href.toLowerCase().match("(jpg|gif|png|bmp)$"))
			return true;

		window.clearTimeout(elem.getAttribute("timeout"));
		Element.hide("image-tooltip");

		show_spinner();

		$("image-preview").innerHTML = "<img onload=\"show_preview(this)\" " +
			"src=\"" + elem.href + "\"/>";

		return false;

	} catch (e) {
		exception_error("m_i", e);
	}
}

function m_i(elem) {
	try {

		if (!elem.href.toLowerCase().match("(jpg|gif|png|bmp)$") ||
				Element.visible("preview-shadow"))
			return;

		var timeout = window.setTimeout(function() {

			show_spinner();

			$("image-tooltip").innerHTML = "<img onload=\"show_thumbnail(this)\" " +
				"src=\"" + elem.href + "\"/>";

			_tooltip_elem = elem;

			}, 250);

		elem.setAttribute("timeout", timeout);

	} catch (e) {
		exception_error("m_i", e);
	}
}

function m_o(elem) {
	try {
		hide_spinner();

		window.clearTimeout(elem.getAttribute("timeout"));

		Element.hide("image-tooltip");

	} catch (e) {
		exception_error("m_o", e);
	}
}

function hotkey_handler(e) {

	try {

		var keycode;
		var shift_key = false;

		var cmdline = $('cmdline');
		var feedlist = $('feedList');

		try {
			shift_key = e.shiftKey;
		} catch (e) {

		}

		if (window.event) {
			keycode = window.event.keyCode;
		} else if (e) {
			keycode = e.which;
		}

		var keychar = String.fromCharCode(keycode);

		if (keycode == 27) { // escape
			close_infobox();
			Element.hide("preview-shadow");
		}

		if (!hotkeys_enabled) {
			console.log("hotkeys disabled");
			return;
		}

		if (keycode == 38 && e.ctrlKey) {
			console.log("moving up...");

			var tabs = get_all_tabs();
			var tab = get_selected_tab();

			if (tab) {
				for (var i = 0; i < tabs.length; i++) {
					if (tabs[i] == tab) {
						change_tab(tabs[i-1]);
						return false;
					}
				}
			}

			return false;
		}

		if (keycode == 40 && e.ctrlKey) {
			console.log("moving down...");

			var tabs = get_all_tabs();
			var tab = get_selected_tab();

			if (tab) {
				for (var i = 0; i < tabs.length; i++) {
					if (tabs[i] == tab) {
						change_tab(tabs[i+1]);
						return false;
					}
				}
			}

			return false;
		}

		if (keycode == 38) {
			var elem = $("input-prompt");

			if (input_cache_offset > -input_cache.length)
				--input_cache_offset;

			var real_offset = input_cache.length + input_cache_offset;

			if (input_cache[real_offset]) {
				elem.value = input_cache[real_offset];
				elem.setSelectionRange(elem.value.length, elem.value.length);
			}

//			console.log(input_cache_offset + " " + real_offset);

			return false;
		}

		if (keycode == 40) {
			var elem = $("input-prompt");

			if (input_cache_offset < -1) {
			  	++input_cache_offset;

				var real_offset = input_cache.length + input_cache_offset;

//				console.log(input_cache_offset + " " + real_offset);

				if (input_cache[real_offset]) {
					elem.value = input_cache[real_offset];
					elem.setSelectionRange(elem.value.length, elem.value.length);
					return false;
				}

			} else {
				elem.value = '';
				input_cache_offset = 0;
				return false;
			}

		}

		if (keycode == 9) {
			var tab = get_selected_tab();

			var elem = $("input-prompt");
			var str = elem.value;
			var comp_str = str;

			elem.focus();

			if (str.length == 0) return false;

			if (str.lastIndexOf(" ") != -1) {
				comp_str = str.substring(str.lastIndexOf(" ")+1);
			}

//			console.log("COMP STR [" + comp_str + "]");

			if (tab) {

				var nicks = get_nick_list(tab.getAttribute("connection_id"),
							tab.getAttribute("channel"));

				var r = new RegExp(comp_str + "$");

				for (var i = 0; i < nicks.length; i++) {
					if (nicks[i].toLowerCase().match("^" + comp_str.toLowerCase())) {

						if (str == comp_str) {
							str = str.replace(r, nicks[i] + ": ");
						} else {
							str = str.replace(r, nicks[i]);
						}

						elem.value = str;
						return false;
					}
				}

				for (var i = 0; i < commands.length; i++) {
					if (commands[i].match("^" + comp_str.toLowerCase())) {

						str = str.replace(r, commands[i] + " ");
						elem.value = str;

						return false;
					}
				}

			}

			return false;
		}

		//console.log(keychar + " " + keycode + " " + e.ctrlKey);

		//if (!e.ctrlKey) $("input-prompt").focus();

		return true;

	} catch (e) {
		exception_error("hotkey_handler", e);
	}
}

function push_cache(line) {
	try {
//		line = line.trim();

		input_cache_offset = 0;

		if (line.length == 0) return;

		for (var i = 0; i < input_cache.length; i++) {
			if (input_cache[i] == line) return;
		}

		input_cache.push(line);

		while (input_cache.length > 100)
			input_cache.shift();

	} catch (e) {
		exception_error("push_cache", e);
	}
}

function get_nick_list(connection_id, channel) {
	try {
		var rv = [];

		if (nicklists[connection_id]) {

			var nicklist = nicklists[connection_id][channel];

			if (nicklist) {

				for (var i = 0; i < nicklist.length; i++) {

					var nick = nicklist[i];

					switch (nick.substr(0,1)) {
					case "@":
						nick = nick.substr(1);
						break;
					case "+":
						nick = nick.substr(1);
						break;
					}

					rv.push(nick);
				}
			}
		}

		return rv;

	} catch (e) {
		exception_error("get_nick_list", e);
	}
}

function is_highlight(connection_id, message) {
	try {
		message = message.toUpperCase();

		if (message.message_type == MSGT_SYSTEM)
			return false;

		if (message.id <= last_old_id)
			return false;

		if (typeof active_nicks[connection_id] == 'string' &&
				message.match(active_nicks[connection_id].toUpperCase()))
			return true;

		for (var i = 0; i < highlight_on.length; i++) {
			if (highlight_on[i].length > 0 && message.match(highlight_on[i]))
				return true;
		}

		return false;

	} catch (e) {
		exception_error("is_highlight", e);
	}
}

function highlight_tab_if_needed(connection_id, channel, message) {
	try {
		var tab = find_tab(connection_id, channel);

		console.log("highlight_tab_if_needed " + connection_id + " " + channel);

		//if (message.id <= last_old_id) return;

		if (tab && tab != get_selected_tab()) {

		  if (tab.getAttribute("tab_type") != "S" &&
				  is_highlight(connection_id, message.message)) {

				tab.className = "highlight";

				++new_highlights;

			} else {
				if (tab.className != "highlight") tab.className = "attention";
			}
		}

	} catch (e) {
		exception_error("highlight_tab_if_needed", e);
	}
}

function find_tab(connection_id, channel) {
	try {
		var tabs;

//		console.log("find_tab : " + connection_id + ";" + channel);

		if (channel == "---") {
			return $("tab-" + connection_id);
		} else {
			if (connection_id) {
				tabs = $("tabs-" + connection_id).getElementsByTagName("LI");
			} else {
				tabs = $("tabs-list").getElementsByTagName("li");
			}

			for (var i = 0; i < tabs.length; i++) {
				if (tabs[i].id && tabs[i].id.match("tab-")) {
					if (tabs[i].getAttribute("channel") == channel) {
						return tabs[i];
					}
				}
			}
		}

		return false;

	} catch (e) {
		exception_error("find_tab", e);
	}
}

function tweet_selection() {
	try {
		var sel = window.getSelection();

		show_spinner();

		new Ajax.Request("backend.php", {
		parameters: "?op=tweet-dlg&text=" + param_escape(sel),
		onComplete: function (transport) {
			infobox_callback2(transport);
			hide_spinner();
		} });

	} catch (e) {
		exception_error("tweet_selection", e);
	}
}

function tweet_update_counter(textarea) {
	try {
		$("tweet-dlg-counter").value = 140 - textarea.value.length;
	} catch (e) {
		exception_error("tweet_update_counter", e);
	}
}

function tweet_selection_do() {
	try {
		var query = Form.serialize("new_tweet_form");
		var text = document.forms['new_tweet_form'].text.value.strip();

		if (text.length > 140) {
			alert(__("Your message is too long."));
			return;
		}

		if (text.length == 0) {
			alert(__("Your message is too short."));
			return;
		}

		show_spinner();

		new Ajax.Request("backend.php", {
		parameters: query,
		onComplete: function (transport) {
			close_infobox();
			hide_spinner();
		} });

	} catch (e) {
		exception_error("tweet_selection", e);
	}
}

function twitter_update() {
	try {
		console.log('in twitter_update...');

		var tab = get_selected_tab();

		if (tab) {
			var connection_id = tab.getAttribute('connection_id');
			var query = "?op=twitter-update&connection=" + connection_id;

			new Ajax.Request("backend.php", {
				parameters: query,
				onComplete: function (transport) {

			} });
		}

		twitter_id = window.setTimeout("twitter_update()", twitter_timeout_delay);

	} catch (e) {
		exception_error("twitter_update", e);
	}
}
