var window_active = true;
var last_id = 0;
var last_old_id = 0;
var new_messages = 0;
var new_highlights = 0;
var delay = 1500;
var timeout_delay = 3000;
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
var id_history = [];
var uniqid;
var emoticons_map = false;
var autocomplete = [];
var autocompleter = false;
var topic_autocompleter = false;

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

var initial = true;

var colormap = [ "#00CCCC", "#000000", "#0000CC", "#CC00CC", "#606060",
	"green", "#00CC00", "maroon", "navy", "olive", "purple",
	"red", "#909090", "teal", "#CCCC00" ]

var commands = [ "/join", "/part", "/nick", "/query", "/quote", "/msg",
	"/op", "/deop", "/voice", "/devoice", "/ping", "/notice", "/away",
	"/ctcp", "/clear" ];

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

function toggle_sidebar() {
try {
		if (Element.visible('sidebar-inner')) {
			Element.hide("sidebar-inner");
			$("log").setStyle({
				right : "5px",
			});

			$("sidebar").setStyle({
				width : "5px",
			});

			$("topic").setStyle({
				right : "5px",
			});

			$("input").setStyle({
				right : "5px",
			});

		} else {
			Element.show("sidebar-inner");

			$("log").setStyle({
				right : "155px",
			});

			$("sidebar").setStyle({
				width : "155px",
			});

			$("topic").setStyle({
				right : "155px",
			});

			$("input").setStyle({
				right : "155px",
			});

		}
	} catch (e) {
		exception_error("toggle_sidebar", e);
	}
}

function init_second_stage(transport) {
	try {

		var params = JSON.parse(transport.responseText);

		if (!handle_error(params, transport)) return false;

		if (!params || params.status != 1) {
			return fatal_error(14, __("The application failed to initialize."),
				transport.responseText);
		}

		last_old_id = params.max_id;
		theme_images = params.images;
		update_delay_max = params.update_delay_max;
		theme = params.theme;
		uniqid = params.uniqid;
		emoticons_map = params.emoticons;

		startup_date = new Date();

		Element.hide("overlay");

		$("input-prompt").value = "";
		$("input-prompt").focus();

		if (navigator.appName.indexOf("Microsoft Internet") == -1) {
			autocompleter = new Autocompleter.Local("input-prompt",
				"input-suggest", autocomplete, {tokens: ' ',
					choices : 5,
					afterUpdateElement: function(element) { element.value += " " ; },
					onShow: function(element, update) { Element.show(update); return true; } });

			topic_autocompleter = new Autocompleter.Local("topic-input-real",
				"topic-suggest", autocomplete, {tokens: ' ',
					choices : 5,
					afterUpdateElement: function(element) { element.value += " " ; },
					onShow: function(element, update) { Element.show(update); return true; } });

		}

		console.log("init_second_stage");

		document.onkeydown = hotkey_handler;

		enable_hotkeys();

		hide_spinner();

		update(true);

		window.setTimeout("title_timeout()", 1000);

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
		parameters: "op=init",
		onComplete: function (transport) {
			init_second_stage(transport);
		} });

	} catch (e) {
		exception_error("init", e);
	}
}

function handle_update(transport) {
	try {
		var rv = false;

		try {
			rv = JSON.parse(transport.responseText);
		} catch (e) {
			console.log(e);
		}

		if (!rv) {
			console.log("received null object from server, will try again.");
			Element.show("net-alert");
			return true;
		} else {
			Element.hide("net-alert");
		}

		if (!handle_error(rv, transport)) return false;

		var conn_data = rv[0];
		var lines = rv[1];
		var chandata = rv[2];
		var params = rv[3];

		if (params && !params.duplicate) {
			highlight_on = params.highlight_on;

			/* we can't rely on PHP mb_strtoupper() since it sucks cocks */

			for (var i = 0; i < highlight_on.length; i++) {
				highlight_on[i] = highlight_on[i].toUpperCase();
			}

			notify_events = params.notify_events;
			hide_join_part = params.hide_join_part;
			uniqid = params.uniqid;
		}

		last_update = new Date();

		handle_conn_data(conn_data);
		handle_chan_data(chandata);

		if (initial) {
			var c = hash_get();

			if (c) {
				c = c.split(",");

				if (c.size() == 2) {
					var tab = find_tab(c[0], c[1]);

					if (tab) change_tab(tab);
				}
			}

			initial = false;
		}

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

		var tabs = get_all_tabs();

		for (i = 0; i < tabs.length; i++) {
			var tab_type = tabs[i].getAttribute("tab_type");

			if (tab_type == "P") {
				var cid = tabs[i].getAttribute("connection_id");
				var chan = tabs[i].getAttribute("channel");

				if (conndata_last[cid] != undefined &&
						conndata_last[cid]["userhosts"][chan] != undefined) {

					tabs[i].addClassName("online");
					tabs[i].removeClassName("offline");

				} else {
					tabs[i].addClassName("offline");
					tabs[i].removeClassName("online");
				}

			}
		}

		if (prev_last_id == last_id && update_delay_max == 0) {
			if (delay < 3000) delay += 500;
		} else {
			delay = 1500;
		}

	} catch (e) {
		exception_error("handle_update", e);
	}

	apply_anim_classes();

	return true;
}

function apply_anim_classes() {
	try {
		if (Math.random() > 0.25) return;

		var elems = Math.random() > 0.1 ? $$("span.anim") : $$("img.anim");

		if (elems.size() > 0) {

			if (elems.size() > 3)
				elems = elems.slice(elems.size()-3, elems.size());

			var index = parseInt(Math.random()*elems.size());

			var e = elems[index];

			if (e && !e.hasClassName("applied")) {
				e.addClassName("applied");

				window.setTimeout(function() {
					e.removeClassName("applied")
				}, 6000);

			}
		}

	} catch (e) {
		exception_error("apply_anim_classes", e);
	}
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
		var query = "op=update&last_id=" + last_id + "&uniqid=" + uniqid;

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
			if (tabs[i].hasClassName("selected")) {
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

function update_buffer(force_redraw) {
	try {

		var tab = get_selected_tab();
		if (!tab) return;

		var channel = tab.getAttribute("channel");

		if (tab.getAttribute("tab_type") == "S") channel = "---";

		var connection_id = tab.getAttribute("connection_id");

		var test_height = $("log").scrollHeight - $("log").offsetHeight;
		var scroll_buffer = false;
		var line_id = 0;

		if (test_height - $("log").scrollTop < 300) scroll_buffer = true;

		if (autocompleter) {
			autocomplete = [];

			for (key in emoticons_map) {
				autocomplete.push(key);
			}

			/* if (nicklists[connection_id][channel]) {
				for (var i = 0; i < nicklists[connection_id][channel].length; i++) {
					autocomplete.push(nicklists[connection_id][channel][i].replace(/^[\@\+]/, ""));
				}
			} */

			for (var i = 0; i < commands.length; i++) {
				autocomplete.push(commands[i]);
			}

			autocompleter.options.array = autocomplete;
			topic_autocompleter.options.array = autocomplete;
		}

		if (buffers[connection_id]) {

			var buffer = buffers[connection_id][channel];

			if (buffer) {

				/* do we need to redraw everything? */

				var log_channel = $("log-list").getAttribute("channel");
				var log_connection = $("log-list").getAttribute("connection_id");
				var log_line_id = $("log-list").getAttribute("last_id");

				if (log_channel != channel || log_connection != connection_id || force_redraw) {
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

				if (scroll_buffer) window.setTimeout(function() {
					$("log").scrollTop = $("log").scrollHeight;
				}, 100);

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
			var nicklist;

			if (tab.getAttribute("tab_type") == "P") {
				for (var i in nicklists[connection_id]) {
					if (typeof nicklists[connection_id][i] != 'function') {
						var tmp = nicklists[connection_id][i];
						if (tmp) {
							if (tmp.nickIndexOf(tab.getAttribute("channel")) != -1) {
								nicklist = [
									'@' + active_nicks[connection_id],
									tab.getAttribute("channel") ].sort();
								break;
							}
						}
					}
				};

				if (!nicklist && active_nicks[connection_id]) {
					nicklist = [ '@' + active_nicks[connection_id] ];
				}
			} else {
				nicklist = nicklists[connection_id][channel];
			}

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

		$("topic-input").title = "";


		if (topics[connection_id] && tab.getAttribute("tab_type") != "P") {
			var topic = topics[connection_id][channel];

			if (topic) {
				if ($("topic-input").title != topics[connection_id][channel][0]) {
					$("topic-input").innerHTML = rewrite_emoticons(topics[connection_id][channel][0]);
					$("topic-input").title = topics[connection_id][channel][0];
				}

				$("topic-input").disabled = conndata_last[connection_id].status != "2";
			} else {

				if (tab.getAttribute("tab_type") != "S") {
					$("topic-input").innerHTML = "";
					$("topic-input").disabled = true;

				} else {
					if (conndata_last[connection_id].status == CS_CONNECTED) {
						$("topic-input").innerHTML = __("Connected to: ") +
							conndata_last[connection_id]["active_server"];
						$("topic-input").disabled = true;
					} else {
						$("topic-input").innerHTML = __("Disconnected.");
						$("topic-input").disabled = true;
					}
				}
			}
		} else if (tab.getAttribute("tab_type") == "S") {
			$("topic-input").innerHTML = __("Disconnected.");
			$("topic-input").disabled = true;
		} else {

			var nick = tab.getAttribute("channel");
			var userhosts = conndata_last[connection_id]["userhosts"];
			var nick_ext_info = "";

			if (userhosts && userhosts[nick]) {
				nick_ext_info = userhosts[nick][0] + '@' + userhosts[nick][1];
			}

			$("topic-input").innerHTML = __("Conversation with") + " " +
				tab.getAttribute("channel") + " (" + nick_ext_info + ")";
			$("topic-input").disabled = true;
		}

		if (conndata_last && conndata_last[connection_id]) {
			$("input-prompt").disabled = conndata_last[connection_id].status != 2;
		}

		if ($("topic-input").disabled) {
			$("topic-input").addClassName("disabled");
		} else {
			$("topic-input").removeClassName("disabled");
		}

		$("nick").innerHTML = active_nicks[connection_id];

		if (conndata_last && conndata_last[connection_id]) {
			var nick = active_nicks[connection_id];

			if (nick && conndata_last[connection_id]["userhosts"][nick]) {


				if (conndata_last[connection_id]["userhosts"][nick][4] == true) {
					$("nick").addClassName("away");
				} else {
					$("nick").removeClassName("away");
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

function hide_topic_input() {
	try {
		Element.hide("topic-input-real");
		Element.show("topic-input");

	} catch (e) {
		exception_error("hide_topic_input", e);
	}
}

function prepare_change_topic(elem) {
	try {
		var tab = get_selected_tab();
		if (!tab || elem.disabled) return;

		Element.hide("topic-input");
		Element.show("topic-input-real");

		$("topic-input-real").value = $("topic-input").title;
		$("topic-input-real").focus();

	} catch (e) {
		exception_error("change_topic", e);
	}
}

function change_topic_real(elem, evt) {
	try {
      var key;

		if (window.event)
			key = window.event.keyCode;     //IE
		else
			key = evt.which;     //firefox

		if (key == 13 && !Element.visible("topic-suggest")) {
			var tab = get_selected_tab();

			if (!tab || elem.disabled) return;

			var topic = elem.value;

			var channel = tab.getAttribute("channel");
			var connection_id = tab.getAttribute("connection_id")

			if (tab.getAttribute("tab_type") == "S") channel = "---";

			topics[connection_id][channel] = topic;

			var query = "op=set-topic&topic=" + param_escape(topic) +
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
				elem.blur();
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

		if (key == 13 && !Element.visible("input-suggest")) {

			var tab = get_selected_tab();

			if (!tab) return;

			var channel = tab.getAttribute("channel");

			if (tab.getAttribute("tab_type") == "S") channel = "---";

			if (elem.value.trim() == "/clear") {
				buffers[tab.getAttribute("connection_id")][channel] = [];
				update_buffer(true);
			} else {
				var query = "op=send&message=" + param_escape(elem.value) +
					"&chan=" + param_escape(channel) +
					"&connection=" + param_escape(tab.getAttribute("connection_id")) +
					"&last_id=" + last_id + "&tab_type=" + tab.getAttribute("tab_type");

				show_spinner();

				new Ajax.Request("backend.php", {
				parameters: query,
				onComplete: function (transport) {
					hide_spinner();
					handle_update(transport);
				} });
			}

			push_cache(elem.value);
			elem.value = '';
			console.log(query);

			set_window_active(true);

			window.setTimeout(function() {
				elem.value = '';
			}, 5);

			return false;
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
			tabs[i].removeClassName("selected");
		}

		elem.addClassName("selected");

		elem.removeClassName("attention");
		elem.removeClassName("highlight");

		console.log("changing tab to " + elem.id);

		if (!initial) {
			hash_set(elem.getAttribute("connection_id") + "," +
				elem.getAttribute("channel").replace("#", "#"));
		}

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

		var query = "op=toggle-connection&set_enabled=" +
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
			is_highlight(connection_id, param);

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
					var msg = __("(%c) %n: %s");

					msg = msg.replace("%c", param.channel);
					msg = msg.replace("%n", param.sender);
					msg = msg.replace("%s", param.message);

					if (param.sender && param.channel &&
							param.sender != active_nicks[connection_id]) {

						notify(msg);
					}
				}
			}
		}

		if (param.message_type == MSGT_ACTION) {

			if (is_hl) row_class += "HL";

			if (emoticons_map && param.message) {
				param.message = rewrite_emoticons(param.message);
			}

			message = "* " + param.sender + " " + param.message;

			tmp = "<li id=\""+param.id+"\" class=\""+row_class+"\"><span class='timestamp'>" +
				make_timestamp(param.ts) + "</span> " +
				"<span class='action'>" + message + "</span>";

		} else if (param.message_type == MSGT_NOTICE) {

			var sender_class = '';

			if (param.incoming == true) {
				sender_class = 'pvt-sender';
			} else {
				sender_class = 'pvt-sender-out';
			}

			if (emoticons_map && param.message) {
				param.message = rewrite_emoticons(param.message);
			}

			tmp = "<li cid=\""+param.id+"\" class=\""+row_class+"\">"+
				"<span class='timestamp'>" +
				make_timestamp(param.ts) +
				"</span> <span class='lt'>-</span><span title=\""+nick_ext_info+"\" " +
				"class='"+sender_class+"' "+color+">" +
				param.sender + "</span><span class='gt'>-</span> " +
				"<span class='message'>" +
				param.message + "</span>";

		} else if (param.sender != "---" && param.message_type != MSGT_SYSTEM) {

			if (is_hl) row_class += "HL";

//			param.message = param.message.replace(/\(oo\)/g,
//					"<img src='images/piggie_icon.png' height='16px' alt='(oo)'>");

			param.message = param.message.replace(/(^| )_(.*?)_( |$)/g,
					"$1<span class=\"underline\">$2</span>$3");

			if (emoticons_map && param.message) {
				param.message = rewrite_emoticons(param.message);
			}

//			param.message = param.message.replace(/(OO)/g,
//					"<img src='images/piggie.png' alt='(oo)'>");

			tmp = "<li id=\""+param.id+"\" "+
				"class=\""+row_class+"\"><span class='timestamp'>" +
				make_timestamp(param.ts) +
				"</span> <span class='lt'>&lt;</span><span title=\""+nick_ext_info+"\" " +
				"class='sender' "+color+">" +
				param.sender + "</span><span class='gt'>&gt;</span> " +
				"<span class='message'>" +
				param.message + "</span>";
		} else {

			if (emoticons_map && param.message) {
				param.message = rewrite_emoticons(param.message);
			}

			tmp = "<li id=\""+param.id+"\" "+
				"class=\""+row_class+"\"><span class='timestamp'>" +
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
			if (conndata.duplicate) return;

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
			if (chandata.duplicate) return;

			for (var connection_id in chandata) {

				if (!conndata_last[connection_id]) continue;

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

				if ($("favicon").href.indexOf("active") == -1)
					$("favicon").href = $("favicon").href.replace("favicon",
							"favicon_active");

			} else {
				if (window.fluid) {
					window.fluid.dockBadge = "";
				}

				$("favicon").href = $("favicon").href.replace("favicon_active",
						"favicon");

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

			var query = "op=send&message=" + param_escape(command) +
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

			var query = "op=part-channel" +
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

			var query = "op=query-user&nick=" + param_escape(nick) +
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
		if (!line.message) return;

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

			push_message(connection_id, line.channel, line, msg_type, hide_join_part);

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
		if (!conndata_last[connection_id]) return;

		if (no_tab_hl == undefined) no_tab_hl = false;

		if (!message_type) message_type = MSGT_PRIVMSG;

		if (!buffers[connection_id]) buffers[connection_id] = [];
		if (!buffers[connection_id][channel]) buffers[connection_id][channel] = [];

		if (id_history.indexOf(message.id) != -1 && !message.force_display)
			return; // dupe

		id_history.push(message.id);

		while (id_history.length > 20)
			id_history.shift();

		if (message_type != MSGT_BROADCAST) {
			toggle_li_class(channel);

			var tmp_html = format_message(li_classes[channel], message, connection_id);

			tmp_html.push(message.force_display);

			buffers[connection_id][channel].push(tmp_html);

			var tab = find_tab(connection_id, channel);

			if (!no_tab_hl && tab && (get_selected_tab() != tab || !window_active)) {
				if (notify_events[2] && tab.getAttribute("tab_type") == "P" && message.id > last_old_id) {
					var msg = __("%n: %s");

					msg = msg.replace("%n", message.sender);
					msg = msg.replace("%s", message.message);

					if (message.sender && message.sender != active_nicks[connection_id]) {
						notify(msg);
					}

				}

				if (message_type == MSGT_PRIVMSG && !no_tab_hl && notify_events[4] && tab.getAttribute("tab_type") == "C" && message.id > last_old_id) {
					var msg = __("(%c) %n: %s");

					msg = msg.replace("%n", message.sender);
					msg = msg.replace("%s", message.message);
					msg = msg.replace("%c", message.channel);

					if (message.sender && message.channel &&
							message.sender != active_nicks[connection_id]) {

						notify(msg);
					}
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

			while (notifications.length > 0) {
				notifications.pop().cancel();
			}

			window.setTimeout(function() {
				$("log").scrollTop = $("log").scrollHeight;
			}, 100);

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
		if (_tooltip_elem && !Element.visible("image-preview")) {

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

		var dp = $("image-preview").getDimensions();

		$("image-preview").setStyle({
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

		Element.show("image-preview");

		window.setTimeout("resize_preview()", 1);

	} catch (e) {
		exception_error("show_preview", e);
	}
}

function m_c(elem) {
	try {
		if (navigator.userAgent && navigator.userAgent.match("MSIE"))
			return true;

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

		if (navigator.userAgent && navigator.userAgent.match("MSIE"))
			return;

		if (!elem.href.toLowerCase().match("(jpg|gif|png|bmp)$") ||
				Element.visible("image-preview"))
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
			Element.hide("image-preview");
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

		if (keycode == 76 && e.ctrlKey) {

			var tab = get_selected_tab();

			if (tab) {
				var channel = tab.getAttribute("channel");
				if (tab.getAttribute("tab_type") == "S") channel = "---";

				buffers[tab.getAttribute("connection_id")][channel] = [];
				update_buffer(true);

				return false;
			}
		}

		if (keycode == 9) {
			/* var tab = get_selected_tab();

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

				for (var k in emoticons_map) {
					if (k.match("^" + comp_str)) {

						str = str.replace(r, k) + " ";
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

			} */

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
		var message_text = message.message.toUpperCase();

		if (message.message_type == MSGT_SYSTEM)
			return false;

		if (message.id <= last_old_id)
			return false;

		if (message_text.match(":\/\/"))
			return false;

		if (typeof active_nicks[connection_id] == 'string' &&
				message_text.match(active_nicks[connection_id].toUpperCase()))
			return true;

		for (var i = 0; i < highlight_on.length; i++) {
			if (highlight_on[i].length > 0 && message_text.match(highlight_on[i]))
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
				  is_highlight(connection_id, message)) {

				tab.addClassName("highlight");

				++new_highlights;

			} else {
				if (!tab.hasClassName("highlight")) tab.addClassName("attention");
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
		parameters: "op=tweet-dlg&text=" + param_escape(sel),
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

function title_timeout() {
	try {
		update_title();
		window.setTimeout('title_timeout()', 2000);
	} catch (e) {
		exception_error("title_timeout", e);
	}
}

function inject_text(str) {
	try {
		$("input-prompt").value += " " + str + " ";
		$("input-prompt").focus();

	} catch (e) {
		exception_error("inject_text", e);
	}
}

function rewrite_emoticons(str) {
	try {
		if (emoticons_map && get_cookie('ttirc_emoticons') != "false") {
			for (key in emoticons_map) {
				str = str.replace(
						new RegExp(RegExp.escape(key), "g"),
					"<img title=\""+key+"\" class=\"anim\" src=\"emoticons/"+emoticons_map[key][0]+"\" "+
					" height=\""+emoticons_map[key][1]+"\">");
			}
		}

		str = str.replace(/\(тм\)|\(tm\)/g, "&trade;");
		str = str.replace(/\(р\)|\(r\)/g, "&reg;");
		str = str.replace(/\(ц\)|\(с\)|\(c\)/g, "&copy;");

		str = str.replace(/(=\)|(=\()|8\)|8\()|[-T]_[-T]/g,
				"<span class='anim'>$&</span>");

		return str;

	} catch (e) {
		exception_error("rewrite_emoticons", e);
	}
}

function hash_get() {
	try {
		return decodeURIComponent(window.location.hash.substring(1));
	} catch (e) {
		exception_error("hash_get", e);
	}
}
function hash_set(value) {
	try {
		window.location.hash = param_escape(value);
	} catch (e) {
		exception_error("hash_set", e);
	}
}
