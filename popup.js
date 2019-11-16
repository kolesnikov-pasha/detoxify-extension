let storage = chrome.storage.local;

function update(checkbox) {
    storage.set({"turned_on": checkbox.checked.toString()})
    if (checkbox.checked) {
        document.getElementById("img_face").setAttribute("src", "happy.png");
    } else {
        document.getElementById("img_face").setAttribute("src", "unhappy.png");
    }
}

document.addEventListener('DOMContentLoaded', function() {
    let checkbox = document.getElementById('on_off');
    storage.get("turned_on", (items) => {
        if (items.turned_on !== "true" && items.turned_on !== "false") {
            storage.set({"turned_on": "true"});
        }
        if (items.turned_on === "true") {
            checkbox.checked = items.turned_on;
        }
        if (checkbox.checked) {
            document.getElementById("img_face").setAttribute("src", "happy.png");
        } else {
            document.getElementById("img_face").setAttribute("src", "unhappy.png");
        }
    });
    checkbox.addEventListener('click', () => update(checkbox), false);
}, false);
