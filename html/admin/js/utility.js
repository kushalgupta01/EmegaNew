$(document).ready(function(){
	var username = localStorage.getItem('username');
	$('.loggedInUser').text(username);
	getShortName(username);
	
	$("#example1").DataTable();
	
	// $('.treeview-menu li a').click(function(e) {

            // $('.treeview-menu li.active').removeClass('active');

            // var $parent = $(this).parent();
            // $parent.addClass('active');
			
			 // var $superparent = $($parent).parent();
            // $superparent.addClass('menu-open');
     // });
});

		function showDiv(elem){
		if(elem.value == 0) {
			document.getElementById('photo_div').style.display = "none";
			document.getElementById('icon_div').style.display = "none";
		}
		if(elem.value == 1) {
			document.getElementById('photo_div').style.display = "block";
			document.getElementById('photo_div_existing').style.display = "block";
			document.getElementById('icon_div').style.display = "none";
		}
		if(elem.value == 2) {
			document.getElementById('photo_div').style.display = "none";
			document.getElementById('photo_div_existing').style.display = "none";
			document.getElementById('icon_div').style.display = "block";
		}
	}
	function showContentInputArea(elem){
	   if(elem.value == 'Full Width Page Layout') {
			document.getElementById('showPageContent').style.display = "block";
	   } else {
			document.getElementById('showPageContent').style.display = "none";
	   }
	}

	function appLogout(){
	localStorage.clear();
	window.location.href = '/login.html';
	}
	
	 // short name from Full name
 function getShortName(fullName) { 
  $('.profile-title').removeClass('singleChar');
    if(fullName != null && fullName != undefined){
    let firstLettersArray = fullName.split(' ').filter(m=>m!='').map(n => n[0]);
    let finalString="AP";
    if(firstLettersArray.length > 2){
        finalString = firstLettersArray[0]+firstLettersArray[1];
    }else{
      finalString = firstLettersArray+" ";
	  $('.profile-title').addClass('singleChar');
    }
    $('.profile-title').text(finalString);
  }
  }

