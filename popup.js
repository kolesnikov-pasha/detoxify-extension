function update(checkbox) {
    console.log(checkbox.checked);
    storage.setItem("turned_on", checkbox.checked.toString());
    if (checkbox.checked) {
        document.getElementById("img_face").setAttribute("src", "happy.png");
    } else {
        document.getElementById("img_face").setAttribute("src", "unhappy.png");
    }
}

let storage = window.localStorage;
document.addEventListener('DOMContentLoaded', function() {
    let checkbox = document.getElementById('on_off');
    if (storage.getItem("turned_on") !== "true" && storage.getItem("turned_on") !== "false") {
        storage.setItem("turned_on", "true");
    }
    checkbox.checked = (storage.getItem("turned_on") === "true");
    if (checkbox.checked) {
        document.getElementById("img_face").setAttribute("src", "happy.png");
    } else {
        document.getElementById("img_face").setAttribute("src", "unhappy.png");
    }
    checkbox.addEventListener('click', () => update(checkbox), false);
}, false);