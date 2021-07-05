// Notification bar

class NotificationBar {
	constructor(options = {}) {
		this.initialised = false;
		this.timer = null;
		this.visible = false;
		this.els = {
			main: null,
			notification: null,
			recordNavButtons: null,
		};
		this.options = options;
		this.position = options.positionFixed ? 'fixed' : 'relative';
		this.CLASS_NOTIFICATION = 'notification';
		document.addEventListener('DOMContentLoaded', this.initialise.bind(this), {once: true});
	};

	initialise() {
		if (this.initialised) return;
		this.initialised = true;
		this.els.main = document.getElementById('main') || document.getElementById('home') || document.getElementById('location-management');
		this.els.notification = document.getElementById('notification');
		this.els.recordNavButtons = document.getElementById('record-nav-buttons');

		var stylesheet = document.styleSheets[document.styleSheets.length - 1];
		stylesheet.insertRule(`#notification {
			flex: 0 0 auto;
			position: ${this.position};
			box-sizing: border-box;
			font-size: 16px;
			background-color: #bcddff;
			border-top: 1px solid #555;
			padding: 4px 35px 4px 8px;
			width: 100%;
			height: 80px;
			opacity: 0;
			overflow-y: auto;
			transition: opacity 400ms;
			z-index: 100;
		}`);
		stylesheet.insertRule(`#notification.show {
			opacity: 1;
		}`);
		stylesheet.insertRule(`#notification.hide {
			display: none;
		}`);

		if (this.options.positionFixed) {
			stylesheet.insertRule(`#notification {
				position: fixed;
				bottom: 0;
			}`);
		}

		document.querySelector('#notification .close').addEventListener('click', this.hide.bind(this), false);
		this.hide();
	}

	show(text, options = {}) {
		options = Object.assign({background: null, hide: 4000}, options.constructor === Object ? options : {});

		if (options.dontOverlap && this.visible) return;

		// Show notification
		this.visible = true;
		this.els.notification.className = options.background || '';
		this.els.notification.querySelector('.content').textContent = text;
		this.els.notification.classList.remove('hide');
		setTimeout(() => {
			this.els.notification.classList.add('show');
			this.els.main.classList.add(this.CLASS_NOTIFICATION);
		}, 5);

		// Raise the navigation buttons
		if (this.els.recordNavButtons) this.els.recordNavButtons.classList.add(this.CLASS_NOTIFICATION);

		// Hide the notification
		if (options.hide && !isNaN(options.hide)) {
			if (this.timer) clearInterval(this.timer);
			this.timer = setTimeout(this.hide.bind(this), options.hide);
		}
	};

	hide() {
		if (this.timer) clearInterval(this.timer);
		this.timer = null;
		this.visible = false;

		this.els.main.classList.remove(this.CLASS_NOTIFICATION);
		this.els.notification.classList.remove('show');
		this.els.notification.classList.add('hide');
		if (this.els.recordNavButtons) this.els.recordNavButtons.classList.remove(this.CLASS_NOTIFICATION);
	}
}

export {NotificationBar};
