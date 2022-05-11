$(document).ready(function () {

  // Form submittion with new message in field with id 'm'
  $('form').submit(function () {
    var messageToSend = $('#m').val();

    $('#m').val('');

    return false; // prevent form submit from refreshing page
  });

  let socket = io();

  socket.on('user', (data) => {
    $('#num-users').text(`${data.currentUsers} users online`);
    
    let message = (data.connected) ?
    'has joined the chat.' :
    'has left the chat.';

    message = `${data.name} ${(message)}`;

    $('#messages').append($('<li>').html(`<br> ${message} </br>`));
  });

});
