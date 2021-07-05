$(document).ready(function() {

    $('#user-login').click(function() {
		let username = document.querySelector('#page-username').value.toLowerCase();	
		let password = document.querySelector('#page-password').value;
		let formData = new FormData();
				formData.append('username', username);
				formData.append('password', password);
		
		let response = await fetch(apiServer+'users/login', {method: 'post', body: formData});
        $.ajax({
            type: "POST",
            url: 'admin/login.php',
            data: {
                username: $("#username").val(),
                password: $("#password").val()
            },
            success: function(data)
            {
                if (data === 'Correct') {
                    window.location.replace('admin/admin.php');
                }
                else {
                    alert(data);
                }
            }
        });

    });

});