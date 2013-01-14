function show_users() {
	try {
		show_spinner();

		new Ajax.Request("backend.php", {
		parameters: "op=users",
		onComplete: function (transport) {
			infobox_callback2(transport);
			hide_spinner();
		} });

	} catch (e) {
		exception_error("show_users", e);
	}
}

function create_user() {
	try {
		var login = prompt(__("Login for a new user:"));

		if (login) {

			show_spinner();

			new Ajax.Request("backend.php", {
			parameters: "op=create-user&login=" + 
				param_escape(login),
			onComplete: function (transport) {
				var obj = JSON.parse(transport.responseText);

				var message = obj[0];
				var data = obj[1];

				mini_error(message);

				$("users-list").innerHTML = data;
				hide_spinner();
			} });


		}
	} catch (e) {
		exception_error("create_user", e);
	}
}

function delete_user() {
	try {
		var rows = get_selected_rows($("users-list"));

		if (rows.length > 0) {
			if (confirm(__("Delete selected users?"))) {

				var ids = [];

				for (var i = 0; i < rows.length; i++) {
					ids.push(rows[i].getAttribute("user_id"));
				}

				var query = "op=delete-user&ids=" + param_escape(ids.toString());

				console.log(query);

				show_spinner();

				new Ajax.Request("backend.php", {
				parameters: query, 
				onComplete: function (transport) {
					$("users-list").innerHTML = transport.responseText;
					hide_spinner();
				} });

			}
		} else {
			alert(__("Please select some users to delete."));
		}


	} catch (e) {
		exception_error("delete_user", e);
	}
}

function reset_user() {
	try {
		var rows = get_selected_rows($("users-list"));

		if (rows.length == 1) {
			if (confirm(__("Reset password of selected user?"))) {

				var id = rows[0].getAttribute("user_id");

				var query = "op=reset-password&id=" + param_escape(id);

				console.log(query);

				show_spinner();

				new Ajax.Request("backend.php", {
				parameters: query, 
				onComplete: function (transport) {
					var obj = JSON.parse(transport.responseText);
					mini_error(obj.message);
					hide_spinner();
				} });

			}
		} else {
			alert(__("Please select one user to reset password."));
		}


	} catch (e) {
		exception_error("delete_user", e);
	}
}

function edit_user(id) {
	try {
		mini_error("Function not implemented");

	} catch (e) {
		exception_error("edit_user", e);
	}
}
