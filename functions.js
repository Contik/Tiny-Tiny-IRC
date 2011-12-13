var hotkeys_enabled = false;
var spinner_refs = 0;
var notifications = [];

/* add method to remove element from array */

Array.prototype.remove = function(s) {
	for (var i=0; i < this.length; i++) {
		if (s == this[i]) this.splice(i, 1);
	}
}

/* create console.log if it doesn't exist */

if (!window.console) console = {};
console.log = console.log || function(msg) { debug(msg); };
console.warn = console.warn || function(msg) { debug(msg); };
console.error = console.error || function(msg) { debug(msg); };

function exception_error(location, e, ext_info) {
	var msg = format_exception_error(location, e);

	if (!ext_info) ext_info = false;

	disable_hotkeys();

	try {

		var ebc = $("xebContent");

		if (ebc) {

			Element.show("dialog_overlay");
			Element.show("errorBoxShadow");

			if (ext_info) {
				if (ext_info.responseText) {
					ext_info = ext_info.responseText;
				}
			}

			ebc.innerHTML =
				"<div><b>Error message:</b></div>" +
				"<pre>" + msg + "</pre>";

			if (ext_info) {
				ebc.innerHTML += "<div><b>Additional information:</b></div>" +
				"<textarea readonly=\"1\">" + ext_info + "</textarea>";
			}

			ebc.innerHTML += "<div><b>Stack trace:</b></div>" +
				"<textarea readonly=\"1\">" + e.stack + "</textarea>";

		} else {
			alert(msg);
		}

	} catch (e) {
		alert(msg);

	}

}

function format_exception_error(location, e) {
	var msg;

	if (e.fileName) {
		var base_fname = e.fileName.substring(e.fileName.lastIndexOf("/") + 1);

		msg = "Exception: " + e.name + ", " + e.message +
			"\nFunction: " + location + "()" +
			"\nLocation: " + base_fname + ":" + e.lineNumber;

	} else if (e.description) {
		msg = "Exception: " + e.description + "\nFunction: " + location + "()";
	} else {
		msg = "Exception: " + e + "\nFunction: " + location + "()";
	}

	console.error("EXCEPTION: " + msg);

	return msg;
}


function disable_hotkeys() {
	hotkeys_enabled = false;
}

function enable_hotkeys() {
	hotkeys_enabled = true;
}

function param_escape(arg) {
	if (typeof encodeURIComponent != 'undefined')
		return encodeURIComponent(arg);
	else
		return escape(arg);
}

function param_unescape(arg) {
	if (typeof decodeURIComponent != 'undefined')
		return decodeURIComponent(arg);
	else
		return unescape(arg);
}

var debug_last_class = "even";

function toggle_debug() {
	if (Element.visible('debug_output')) {
		Element.hide('debug_output');
	} else {
		Element.show('debug_output');
	}
}

function getURLParam(param){
	return String(window.location.href).parseQuery()[param];
}

function leading_zero(p) {
	var s = String(p);
	if (s.length == 1) s = "0" + s;
	return s;
}

function closeErrorBox() {

	if (Element.visible("errorBoxShadow")) {
		Element.hide("dialog_overlay");
		Element.hide("errorBoxShadow");

		enable_hotkeys();
	}

	return false;
}


function closeInfoBox(cleanup) {

	try {
		enable_hotkeys();

		if (Element.visible("infoBoxShadow")) {
			Element.hide("dialog_overlay");
			Element.hide("infoBoxShadow");

			if (cleanup) $("infoBoxShadow").innerHTML = "&nbsp;";
		}
	} catch (e) {
		exception_error("closeInfoBox", e);
	}

	return false;
}

function fatal_error(code, msg, ext_info) {
	try {

		if (!ext_info) ext_info = "N/A";

		if (code == 6) {
			window.location.href = "index.php";
		} else if (code == 5) {
			window.location.href = "update.php";
		} else {

			if (msg == "") msg = "Unknown error";

			var ebc = $("xebContent");

			if (ebc) {

				Element.show("dialog_overlay");
				Element.show("errorBoxShadow");

				if (ext_info) {
					if (ext_info.responseText) {
						ext_info = ext_info.responseText;
					}
				}

				ebc.innerHTML =
					"<div><b>Error message:</b></div>" +
					"<pre>" + msg + " (" + code + ")" + "</pre>" +
					"<div><b>Additional information:</b></div>" +
					"<textarea readonly=\"1\">" + ext_info + "</textarea>";
			}
		}

	} catch (e) {
		exception_error("fatal_error", e);
	}
}

function infobox_callback2(transport) {
	try {
		var box = $('infoBox');

		Element.show("dialog_overlay");

		if (box) {
			box.innerHTML=transport.responseText;
			Element.show("infoBoxShadow");
		}

		disable_hotkeys();
	} catch (e) {
		exception_error("infobox_callback2", e);
	}
}

function close_infobox(cleanup) {

	try {
		enable_hotkeys();

		if (Element.visible("infoBoxShadow")) {
			Element.hide("dialog_overlay");
			Element.hide("infoBoxShadow");

			if (cleanup) $("infoBoxShadow").innerHTML = "&nbsp;";
		}
	} catch (e) {
		exception_error("closeInfoBox", e);
	}

	return false;
}

function show_spinner() {
	try {
		Element.show($("spinner"));
		++spinner_refs;

	} catch (e) {
		exception_error("show_spinner", e);
	}
}

function hide_spinner() {
	try {

		if (spinner_refs > 0) spinner_refs--;

		if (!spinner_refs)
			Element.hide($("spinner"));

	} catch (e) {
		exception_error("hide_spinner", e);
	}
}

function sort_connection_tabs(node) {

	try {
		var list = node.getElementsByTagName("li");

		for (i = 0; i < list.length; i++) {

			for (j = i+1; j < list.length; j++) {

				if (list[i].getAttribute("channel") > list[j].getAttribute("channel")) {
					tempnode_i = list[i].cloneNode(true);
					tempnode_j = list[j].cloneNode(true);
					node.replaceChild(tempnode_i, list[j]);
					node.replaceChild(tempnode_j, list[i]);
				}
			}
		}

	} catch (e) {
		exception_error("sort_connection_tabs", e);
	}
}

function mini_error(msg) {
	try {

		var elem = $("mini-notice");

		if (elem) {
			if (msg) {
				elem.innerHTML = msg;
				Element.show(elem);
				new Effect.Highlight(elem);
			} else {
				Element.hide(elem);
			}
		}

	} catch (e) {
		exception_error("show_mini_error");
	}
}

function set_cookie(name, value, lifetime, path, domain, secure) {

	var d = false;

	if (lifetime) {
		d = new Date();
		d.setTime(d.getTime() + (lifetime * 1000));
	}

	console.log("setCookie: " + name + " => " + value + ": " + d);

	int_set_cookie(name, value, d, path, domain, secure);

}

function int_set_cookie(name, value, expires, path, domain, secure) {
	document.cookie= name + "=" + escape(value) +
		((expires) ? "; expires=" + expires.toGMTString() : "") +
		((path) ? "; path=" + path : "") +
		((domain) ? "; domain=" + domain : "") +
		((secure) ? "; secure" : "");
}

function del_cookie(name, path, domain) {
	if (getCookie(name)) {
		document.cookie = name + "=" +
		((path) ? ";path=" + path : "") +
		((domain) ? ";domain=" + domain : "" ) +
		";expires=Thu, 01-Jan-1970 00:00:01 GMT";
	}
}


function get_cookie(name) {

	var dc = document.cookie;
	var prefix = name + "=";
	var begin = dc.indexOf("; " + prefix);
	if (begin == -1) {
	    begin = dc.indexOf(prefix);
	    if (begin != 0) return null;
	}
	else {
	    begin += 2;
	}
	var end = document.cookie.indexOf(";", begin);
	if (end == -1) {
	    end = dc.length;
	}
	return unescape(dc.substring(begin + prefix.length, end));
}


function make_timestamp(d) {

	if (!d) d = new Date();

  	return leading_zero(d.getHours()) + ":" + leading_zero(d.getMinutes()) +
			":" + leading_zero(d.getSeconds());
}

function rewrite_urls(s) {
	try {

		return s.replace(/(([a-z]+):\/\/[^ ]+)/ig,
			"<a target=\"_blank\" onclick=\"return m_c(this)\" onmouseover=\"m_i(this)\" onmouseout=\"m_o(this)\" href=\"$1\">$1</a>");

	} catch (e) {
		exception_error("rewrite_urls", e);
	}
}

function notify_enable() {
	try {
		if (window.webkitNotifications) {
			if (window.webkitNotifications.checkPermission() != 0) {
				window.webkitNotifications.requestPermission();
			} else {
				mini_error("Desktop notifications are already enabled.");
			}
		}

	} catch (e) {
		exception_error("notify_enable", e);

	}
}


function notify(msg) {
	try {
		if (window.webkitNotifications &&
				window.webkitNotifications.checkPermission() == 0) {

			var notification = webkitNotifications.createHTMLNotification(
				"backend.php?op=notify&msg=" + param_escape(msg));

			notifications.push(notification);

			setTimeout(function() {
					notification.cancel();
					notifications.remove(notification);
					}, 10000);

			notification.show();

			if (notifications.length > 3) {
				var notification = notifications.shift();
				notification.cancel();
			}
		}
	} catch (e) {
		exception_error("notify", e);
	}
}

