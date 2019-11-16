var buttonEnabled = false;

function setButtonAttrs(button) {
    if (buttonEnabled) {
        button.innerText = "TURN ON";
        button.setAttribute("class", "button_enabled");
        buttonEnabled = false;
    } else {
        button.innerText = "TURN OFF";
        button.setAttribute("class", "button_disabled");
        buttonEnabled = true;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    var turnOnButton = document.getElementById('turnOnButton');
    turnOnButton.addEventListener('click', function() {
        setButtonAttrs(turnOnButton);
    }, false);
}, false);