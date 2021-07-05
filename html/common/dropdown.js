$(document).ready(function() {
        "use strict"; // Start of use strict
  
        $('.show-sidebar').on('click', function() {
          $('#sidebar').toggleClass('collapse-sidebar');
          $('#layout-admin').toggleClass('collapse-sidebar');
        });
        $('li a.has-sub').on('click', function() {
          // For toggle its own li
          $(this).toggleClass('open-dropdown');
          $(this).parent().find('.sub-nav').slideToggle("slow");

          // For other li
          $(this).parent().siblings().children('a.has-sub').removeClass('open-dropdown');
          $(this).parent().siblings().children('ul.sub-nav').slideUp("slow");
        });
          $("#record-logout a").click(function(event){
            localStorage.removeItem('username');
            localStorage.removeItem('usertoken');
            window.location.href = '/';
          });
  });