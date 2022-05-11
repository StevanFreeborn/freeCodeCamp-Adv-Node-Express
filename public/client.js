$(document).ready(function () {

  // Form submittion with new message in field with id 'm'
  $('form').submit(function () {
    var messageToSend = $('#m').val();

    $('#m').val('');

    return false; // prevent form submit from refreshing page
  });

  let socket = io('https://freecodecampadvnodeexpress.herokuapp.com:3000');

  socket.on('user count', (data) => {
    console.log(data);
  });

});
