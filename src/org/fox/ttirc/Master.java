package org.fox.ttirc;

import java.lang.Thread.State;
import java.sql.*;
import java.util.*;
import java.util.prefs.Preferences;

public class Master {

	protected Connection conn;
	protected Preferences prefs;
	protected boolean active;
	protected Hashtable connections;
		
	/**
	 * @param args
	 */
	public static void main(String[] args) {
		Master m = new Master();
		
		m.Run();				
	}
	
	public Master() {
		this.prefs = Preferences.userNodeForPackage(getClass());
		this.active = true;
		this.connections = new Hashtable<Integer, ConnectionHandler>(10,10);
		
		/*System.out.println("Initializing prefs...");
		
		prefs.put("DB_HOST", "naboo.lan");
		prefs.put("DB_USER", "fox");
		prefs.put("DB_PASS", "xxx");
		prefs.put("DB_NAME", "fox");		
		prefs.put("DB_PORT", "5432");*/
		
		try {
			Class.forName("org.postgresql.Driver");
		} catch (ClassNotFoundException e) {
			System.out.println("error: JDBC driver for PostgreSQL not found.");
			e.printStackTrace();
			System.exit(1);			
		}
				
		String DB_HOST = prefs.get("DB_HOST", "localhost");
		String DB_USER = prefs.get("DB_USER", "user");
		String DB_PASS = prefs.get("DB_PASS", "pass");
		String DB_NAME = prefs.get("DB_NAME", "user");
		String DB_PORT = prefs.get("DB_PORT", "5432");
		
		String jdbcUrl = "jdbc:postgresql://" + DB_HOST + ":" + DB_PORT + 
			"/" + DB_NAME;
		
		System.out.println("JDBC URL: " + jdbcUrl);
		
		try {
			this.conn = DriverManager.getConnection(jdbcUrl, DB_USER, DB_PASS);
		} catch (SQLException e) {
			System.out.println("error: Couldn't connect to database.");
			e.printStackTrace();
			System.exit(1);
		}
		
		System.out.println("Database connection established.");

		try {
			Cleanup();
		} catch (SQLException e) {
			e.printStackTrace();
			System.exit(1);
		}
	}
	
	public void Cleanup() throws SQLException {
		
		Statement st = conn.createStatement();
		
		st.execute("UPDATE ttirc_connections SET status = " +
				String.valueOf(Constants.CS_DISCONNECTED) + ", userhosts = ''");

      	st.execute("UPDATE ttirc_channels SET nicklist = ''");

      	st.execute("UPDATE ttirc_system SET value = 'false' WHERE " +
      		"key = 'MASTER_RUNNING'");
	
	}
	
	public void UpdateHeartbeat() throws SQLException {
		Statement st = conn.createStatement();
		
		st.execute("UPDATE ttirc_system SET value = 'true' WHERE key = 'MASTER_RUNNING'");
		st.execute("UPDATE ttirc_system SET value = NOW() WHERE key = 'MASTER_HEARTBEAT'");	
	}

	public void CheckConnections() throws SQLException {
		Statement st = conn.createStatement();
		
	    st.execute("SELECT ttirc_connections.id " +
	    		"FROM ttirc_connections, ttirc_users " +
	    		"WHERE owner_uid = ttirc_users.id AND " +
	    		"visible = true AND " +
	    		"(heartbeat > NOW() - INTERVAL '5 minutes' OR " +
	    		"permanent = true) AND " +
	    		"enabled = true");
	
	    ResultSet rs = st.getResultSet();
	    
	    while (rs.next()) {
	    	int connectionId = rs.getInt(1);
	    	
	    	if (!connections.containsKey(connectionId)) {
	    	  	System.out.println("Spawning connection " + connectionId);
	    	   	ConnectionHandler ch = new ConnectionHandler(connectionId, this);
	    	   	connections.put(connectionId, ch);
	    	   	ch.start();
	    	} else {
	    		ConnectionHandler ch = (ConnectionHandler) connections.get(connectionId);
	    		//System.out.println("Conn state: " + ch.getState());
	    		if (ch.getState() == State.TERMINATED) {
	    			System.out.println("Connection " + connectionId + " terminated.");
	    			connections.remove(connectionId);
	    			CleanupConnection(connectionId);
	    		}
	    	}
	    }
	}
	
	public String GetNick(int connectionId) throws SQLException {
		PreparedStatement ps = conn.prepareStatement("SELECT active_nick FROM " +
				"ttirc_connections WHERE id = ?");
		
		ps.setInt(1, connectionId);
		ps.execute();
		
		ResultSet rs = ps.getResultSet();
		
		if (rs.next()) {
			return rs.getString(1);			
		} else {
			return "?UNKNOWN?";
		}
	}
	
	public void PushMessage(int connectionId, String channel, String message, 
			boolean incoming, int messageType, 
			String fromNick) throws SQLException {
	
		String nick;
		
		if (channel.equals("---")) {
			nick = "---";
		} else {
			nick = GetNick(connectionId);
		}
		
		if (fromNick.length() != 0) nick = fromNick;

		//push_message($link, $conn, "---", "DISCONNECT", true, MSGT_EVENT);
		
		PreparedStatement ps = conn.prepareStatement("INSERT INTO ttirc_messages " +
				"(incoming, connection_id, channel, sender, message, message_type) " +
				" VALUES (?, ?, ?, ?, ?, ?)");
				
		ps.setBoolean(1, incoming);
		ps.setInt(2, connectionId);
		ps.setString(3, channel);
		ps.setString(4, nick);
		ps.setString(5, message);
		ps.setInt(6, messageType);
		
		ps.execute();
	}
	
	public void CleanupConnection(int connectionId) throws SQLException {
		Statement st = conn.createStatement();
		
		st.execute("UPDATE ttirc_connections SET status = " + 
				Constants.CS_DISCONNECTED + " WHERE id = " + connectionId);

		st.execute("UPDATE ttirc_channels SET nicklist = '' " +
				"WHERE connection_id = " + connectionId);
		
		PushMessage(connectionId, "---", "DISCONNECT", true, Constants.MSGT_EVENT, "");
	}
	
	public void Run() {
		while (active) {
			
			System.out.println("Master::Run()");
			
			try {
	
				UpdateHeartbeat();
				CheckConnections();				
				
			} catch (SQLException e) {
				e.printStackTrace();
			}
			
			try {
				Thread.sleep(1000);
			} catch (InterruptedException e) {
				//		
			}
		}
		
		try {
			Cleanup();
		} catch (SQLException e) {
			e.printStackTrace();			
		}
	}
	
	public void finalize() throws Throwable {
		Cleanup();		
	}

}
