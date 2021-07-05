// Websocket connection

class WebSocketMessages {
	constructor(options = {}) {
		this.host = window.wsServer;
		this.socket = null;
		this.connected = false;
		this.autoReconnect = true;

		if (typeof options.onMessageReceived === 'function') {
			this.onMessageReceived = options.onMessageReceived;
		}
		//this.init();
	}

	init() {
		if (this.socket) return;
		this.connect();

		this.socket.onopen = () => {
			//console.log('Connected to the websocket server');
			this.connected = true;
		}

		this.socket.onmessage = (e) => {
			var data = e.data;
			try {
				data = JSON.parse(e.data);
			}
			catch (ej) {}
			this.onMessageReceived(data);
		}

		this.socket.onclose = () => {
			//console.log('Disconnected from the websocket server');
			this.socket = null;
			this.connected = false;
			if (this.autoReconnect) setTimeout(this.init.bind(this), 1000);
		}

		this.socket.onerror = (e) => {
			try {
				this.socket.close();
			} catch (e) {}
			this.socket = null;
			if (this.autoReconnect) this.connect();
		}

		/*window.onbeforeunload = () => {
			this.close();
		};*/
	}

	connect() {
		if (this.socket) return;
		this.socket = new WebSocket('ws://'+this.host+'/');
		//this.socket = new WebSocket('wss://localhost:8443/');
	}

	send(data) {
		if (!this.connected) return;
		this.socket.send(JSON.stringify(data));
	}

	onMessageReceived(data) {};

	close() {
		if (!this.socket) return;
		this.autoReconnect = false;
		this.socket.close();
		this.socket = null;
	}
}

export {WebSocketMessages};
