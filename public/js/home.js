console.log('LOADED');

(function($) {
  $('#main_form').submit(function(event) {
    console.log('submitted');
    event.preventDefault();
    var form = $(this);
    $.ajax({
      type: form.attr('method'),
      url: form.attr('action'),
      data: form.serialize(),
      success: function(msg) {
        console.log(msg);
      }
    });

  });
})(jQuery);
