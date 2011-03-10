<?php
	require_once "functions.php";
	
	function css_editor($link) {
		$user_css = get_pref($link, "USER_STYLESHEET");
	?>
	<div id="infoBoxTitle"><?php echo __("Customize Theme") ?></div>
	<div class="infoBoxContents">
		<div id="mini-notice" style='display : none'>&nbsp;</div>

		<div class="dlgSec"><?php echo __('Custom CSS declarations') ?></div>

		<form id="prefs_css_form" onsubmit="return false;">

		<input type="hidden" name="op" value="prefs-save-css"/>

		<?php echo T_sprintf("You can override colors, fonts and layout of your currently selected theme with custom CSS declarations here. <a target=\"_blank\" href=\"%s\">This file</a> can be used as a baseline.", "tt-irc.css") ?>

		<p><textarea name="user_css" class="user-css"><?php echo $user_css ?></textarea>

		<div class="dlgButtons">
			<button type="submit" onclick="save_css()"><?php echo __('Save & Reload') ?></button>
			<button type="submit" onclick="show_prefs()"><?php echo __('Go back') ?></button></div>
		</div>

		</form>

	</div>
	<?php

	}

	function twitter_editor($link) {

		$is_registered = twitter_configured($link);

	?> <div id="infoBoxTitle"><?php echo __("Register with Twitter") ?></div>
	<div class="infoBoxContents">
		<div id="mini-notice" style='display : none'>&nbsp;</div>

		<div class="dlgSec"><?php echo __('Authentication') ?></div>

		<?php if (!$is_registered) {
			echo __("You'll need to register with Twitter.com before you'll be able to send tweets from Tiny Tiny IRC.");
		} else {
			echo __("You have been successfully registered with Twitter.com..");
		} ?><p>

		<div class="dlgButtons">
			<button onclick="window.location.href = 'twitter.php?op=register'">
				<?php echo __("Register with Twitter.com") ?></button>
			<button type="submit" onclick="show_prefs()"><?php echo __('Go back') ?></button></div>
		</div>

	</div>

	<?php
	}

	function print_servers($link, $id) {
		$result = db_query($link, "SELECT ttirc_servers.*,
				status,active_server
			FROM ttirc_servers,ttirc_connections
			WHERE connection_id = '$id' AND 
			connection_id = ttirc_connections.id AND
			owner_uid = " . $_SESSION["uid"]);

		$lnum = 1;

		while ($line = db_fetch_assoc($result)) {

			$row_class = ($lnum % 2) ? "odd" : "even";

			$id = $line['id'];

			if ($line['status'] != CS_DISCONNECTED && 
					$line['server'] . ':' . $line['port'] == $line['active_server']) {
				$connected = __("(connected)");
			} else {
				$connected = '';
			}			

			print "<li id='S-$id' class='$row_class' server_id='$id'>";
			print "<input type='checkbox' onchange='select_row(this)'
				row_id='S-$id'>&nbsp;";
			print $line['server'] . ":" . $line['port'] . " $connected";
			print "</li>";

			++$lnum;
		}
	}

	function notification_editor($link) {

		$notify_on = json_decode(get_pref($link, "NOTIFY_ON"));

		if (!is_array($notify_on)) $notify_on = array();

		$nev_checked = array();

		foreach ($notify_on as $no) {
			$nev_checked[$no] = "checked";
		}
	?> 

	<div id="infoBoxTitle"><?php echo __("Configure Notifications") ?></div>
	<div class="infoBoxContents">
		<div id="mini-notice" style='display : none'>&nbsp;</div>

		<?php echo T_sprintf("Desktop notifications are only shown for events happening in background channels or when your Tiny Tiny IRC window is unfocused.") ?>

		<p><div class="dlgSec"><?php echo __('Show notifications on:') ?></div>

		<form id="prefs_notify_form" onsubmit="return false;">

		<input type="hidden" name="op" value="prefs-save-notify"/>

		<div class="dlgSecCont">
			<input name="notify_event[]" <?php echo $nev_checked[1] ?> 
				id="n_highlight" type="checkbox" value="1">
				<label for="n_highlight"><?php echo __('Channel highlight') ?>
					</label>
			<br clear='left'/>

			<input name="notify_event[]" <?php echo $nev_checked[2] ?> 
				id="n_privmsg" type="checkbox" value="2">
				<label for="n_privmsg"><?php echo __('Private message') ?>
					</label>
			<br clear='left'/>

			<input name="notify_event[]" <?php echo $nev_checked[3] ?> 
				id="n_connstat" type="checkbox" value="3">
				<label for="n_connstat"><?php echo __('Connection status change') ?>
					</label>
			<br clear='left'/>

		</div>	

		</form>

		<div class="dlgButtons">
			<div style='float : left'>
				<button type="submit" onclick="notify_enable()"><?php echo __('Enable notifications') ?></button></div>

			<button type="submit" onclick="save_notifications()"><?php echo __('Save') ?></button>
			<button type="submit" onclick="show_prefs()"><?php echo __('Go back') ?></button></div>
		</div>

		</form>

	</div>
	<?php

	}

	function connection_editor($link, $id) {
		$result = db_query($link, "SELECT * FROM ttirc_connections
			WHERE id = '$id' AND owner_uid = " . $_SESSION["uid"]);

		$line = db_fetch_assoc($result);

		if (sql_bool_to_bool($line['auto_connect'])) {
			$auto_connect_checked = 'checked';
		} else {
			$auto_connect_checked = '';
		}

		if (sql_bool_to_bool($line['visible'])) {
			$visible_checked = 'checked';
		} else {
			$visible_checked = '';
		}

		if (sql_bool_to_bool($line['permanent'])) {
			$permanent_checked = 'checked';
		} else {
			$permanent_checked = '';
		}

	?>
	<div id="infoBoxTitle"><?php echo __("Edit Connection") ?></div>
	<div class="infoBoxContents">
		<div id="mini-notice" style='display : none'>&nbsp;</div>

		<div class="dlgSec"><?php echo __('Connection') ?></div>

		<form id="prefs_conn_form" onsubmit="return false;">

		<input type="hidden" name="connection_id" value="<?php echo $id ?>"/>
		<input type="hidden" name="op" value="prefs-conn-save"/>

		<div class="dlgSecCont">
			<label class='fixed'><?php echo __('Title:') ?></label>
			<input name="title" size="30" value="<?php echo $line['title'] ?>">
			<br clear='left'/>

			<label class='fixed'><?php echo __('Server password:') ?></label>
			<input name="server_password" size="30" type="password" 
				value="<?php echo $line['server_password'] ?>">
			<br clear='left'/>

			<label class="fixed"><?php echo __('Nickname:') ?></label>
			<input name="nick" size="30" value="<?php echo $line['nick'] ?>">
			<br clear='left'/>

			<label class='fixed'><?php echo __('Favorite channels:') ?></label>
			<input name="autojoin" size="30" value="<?php echo $line['autojoin'] ?>">
			<br clear='left'/>

			<label class='fixed'><?php echo __('Connect command:') ?></label>
			<input name="connect_cmd" size="30" value="<?php echo $line['connect_cmd'] ?>">
			<br clear='left'/>

			<label class='fixed'><?php echo __('Character set:') ?></label>

			<?php print_select('encoding', $line['encoding'], get_iconv_encodings()) ?>

			<br clear='left'/>

		</div>

		<div class="dlgSec">Options</div>

		<div class="dlgSecCont">
			<input name="visible" <?php echo $visible_checked ?> 
				id="pr_visible" type="checkbox" value="1">
				<label for="pr_visible"><?php echo __('Enable connection') ?>
					</label>
			<br clear='left'/>

			<input name="auto_connect" <?php echo $auto_connect_checked ?> 
				id="pr_auto_connect" type="checkbox" value="1">
				<label for="pr_auto_connect"><?php echo __('Automatically connect') ?>
					</label>
			<br clear='left'/>

			<input name="permanent" <?php echo $permanent_checked ?>
				id="pr_permanent" type="checkbox" value="1">
				<label for="pr_permanent"><?php echo __('Stay connected permanently') ?>
					</label>
			<br clear='left'/>

		</div>

		<button type="submit" style="display : none" onclick="save_conn()"></button>

		</form>

		<div class="dlgSec"><?php echo __('Servers') ?></div>

		<ul class="container" id="servers-list">
			<?php print_servers($link, $id); ?>
		</ul>

		<div class="dlgButtons">
			<div style='float : left'>
			<button onclick="create_server()"><?php echo __('Add server') ?></button>
			<button onclick="delete_server()"><?php echo __('Delete') ?></button>
			</div>
			<button type="submit" onclick="save_conn()"><?php echo __('Save') ?></button>
			<button type="submit" onclick="show_prefs()"><?php echo __('Go back') ?></button></div>
		</div>
	</div>

	<?php
	}

	function print_connections($link) {
		$result = db_query($link, "SELECT * FROM ttirc_connections
			WHERE owner_uid = " . $_SESSION["uid"]);

		$lnum = 1;

		while ($line = db_fetch_assoc($result)) {

			$row_class = ($lnum % 2) ? "odd" : "even";

			$id = $line['id'];

			if ($line["status"] != "0") {
				$connected = __("(active)");
			} else {
				$connected = "";
			}

			print "<li id='C-$id' class='$row_class' connection_id='$id'>";
			print "<input type='checkbox' onchange='select_row(this)'
				row_id='C-$id'>";
			print "&nbsp;<a href=\"#\" title=\"".__('Click to edit connection')."\"
				onclick=\"edit_connection($id)\">".
				$line['title']." $connected</a>";
			print "</li>";

			++$lnum;
		}
	}

	function main_prefs($link) {

	$_SESSION["prefs_cache"] = false;

	$result = db_query($link, "SELECT * FROM ttirc_users WHERE
		id = " . $_SESSION["uid"]);

	$realname = db_fetch_result($result, 0, "realname");
	$nick = db_fetch_result($result, 0, "nick");
	$email = db_fetch_result($result, 0, "email");
	$quit_message = db_fetch_result($result, 0, "quit_message");

	$highlight_on = get_pref($link, "HIGHLIGHT_ON");
?>

	<div id="infoBoxTitle"><?php echo __("Preferences") ?></div>
	<div class="infoBoxContents">

		<form id="prefs_form" onsubmit="return false;">

		<div id="mini-notice" style='display : none'>&nbsp;</div>

		<input type="hidden" name="op" value="prefs-save"/>

		<div class="dlgSec"><?php echo __('Personal data') ?></div>

		<div class="dlgSecCont">
			<label class="fixed"><?php echo __('Real name:') ?></label>
			<input name="realname" size="30" value="<?php echo $realname ?>">
			<br clear='left'/>

			<label class="fixed"><?php echo __('Nickname:') ?></label>
			<input name="nick" size="30" value="<?php echo $nick ?>">
			<br clear='left'/>

			<label class="fixed"><?php echo __('E-mail:') ?></label>
			<input name="email" size="30" value="<?php echo $email ?>">
			<br clear='left'/>

			<label class="fixed"><?php echo __('Quit message:') ?></label>
			<input name="quit_message" size="30" value="<?php echo $quit_message ?>">
			<br clear='left'/>

			<label class="fixed"><?php echo __('Highlight on:') ?></label>
			<input name="highlight_on" size="30" value="<?php echo $highlight_on ?>">
			<br clear='left'/>

			<label class="fixed"><?php echo __('Theme:') ?></label>
			<?php print_theme_select($link); ?>
			&nbsp;

			<a href="#" onclick="customize_css()">
				<?php echo __("Customize") ?></a>

			<br clear='left'/>

			<label class="fixed">&nbsp;</label>
			<a href="#" onclick="configure_notifications()"><?php echo __('Configure desktop notifications') ?></a>

			<?php if (CONSUMER_KEY != '') { ?>

			<br clear='left'/>

			<label class="fixed">&nbsp;</label>
			<a href="#" onclick="configure_twitter()"><?php echo __('Register with Twitter') ?></a>

			<?php } ?>

		</div>

		<div class="dlgSec"><?php echo __('Authentication') ?></div>

		<div class="dlgSecCont">
			<label class="fixed"><?php echo __('New password:') ?></label>
			<input name="new_password" type="password" size="30" value="">
			<br clear='left'/>

			<label class="fixed"><?php echo __('Confirm:') ?></label>
			<input name="confirm_password" type="password" size="30" value="">
		</div>

		</form>

		<div class="dlgSec"><?php echo __('Connections') ?></div>

		<ul class="container" id="connections-list">
			<?php print_connections($link) ?>
		</ul>

		<div class="dlgButtons">
			<div style='float : left'>
				<button onclick="create_connection()">
					<?php echo __('Create connection') ?></button>
				<button onclick="delete_connection()">
					<?php echo __('Delete') ?></button>
			</div>
			<button type="submit" onclick="save_prefs()">
				<?php echo __('Save') ?></button>
			<button onclick="close_infobox()"><?php echo __('Close') ?></button>
		</div>
	</div>

<?php } ?>
