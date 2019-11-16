let data = JSON.parse("{}");

let sendText = (text, onResult) => {
    const url = 'http://0.0.0.0:8080/detoxify';
    console.log(url);
    xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    xhr.send(JSON.stringify({"text": text}));
    xhr.onreadystatechange = function() {
        console.log("onreadystatechange");
        if (xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
            onResult(xhr.responseText);
        }
        if (xhr.readyState === XMLHttpRequest.DONE && xhr.status !== 200) {
            console.log(xhr.status + ': ' + xhr.statusText);
            setTimeout(onResult("detoxify error"), 500);
        }
    };
};

function updateElement(id, text) {
    let spans = document.getElementsByTagName("span");
    for (let i = 0; i < spans.length; i++) {
        let item = spans.item(i);
        if (text.includes(item.innerText) && (item.innerText.length / text.length > 0.8)) {
            sendText(item.innerText, data => {
                if (data === "") {
                    return;
                }
                if (item.hasAttribute(DETOXIFIED_ATTRIBUTE_NAME)) {
                    return;
                }
                if (data !== "") {
                    item.innerText = data;
                    item.setAttribute(DETOXIFIED_ATTRIBUTE_NAME, id);
                }
            });
        }
    }
}

function interceptData() {
    const xhrOverrideScript = document.createElement('script');
    xhrOverrideScript.type = 'text/javascript';
    xhrOverrideScript.innerHTML = `
(function() {
    var XHR = XMLHttpRequest.prototype;
    var send = XHR.send;
    var open = XHR.open;
    XHR.open = function(method, url) {
        this.url = url;
        return open.apply(this, arguments);
    }
    XHR.send = function() {
        this.addEventListener('load', function() {
            if (this.url.includes('https://api.twitter.com/2/timeline')) {
                var dataDOMElement = document.createElement('div');
                dataDOMElement.id = '__interceptedData';
                dataDOMElement.innerText = this.response;
                dataDOMElement.style.height = 0;
                dataDOMElement.style.overflow = 'hidden';
                document.body.appendChild(dataDOMElement);
            }               
        });
        let event = new Event("onResponseInterception", {});
        document.dispatchEvent(event);
        return send.apply(this, arguments);
    };
})();
    `;
    document.head.prepend(xhrOverrideScript);
}

function processText(text) {
    let words = text.split(" ");
    console.log(text);
    text = "";
    let isStart = true;
    for (let word of words) {
        if (word.slice(0, 1) === "@" && isStart) {
            isStart = true;
        } else {
            if (word.slice(0, 4) === "http") {
                isStart = false;
                continue;
            }
            if (isStart) {
                text = word;
            } else {
                text += ' ' + word;
            }
            isStart = false;
        }
    }
    console.log(text);
    return text;
}

function checkForDOM() {
    if (document.body && document.head) {
        interceptData();
    } else {
        requestIdleCallback(checkForDOM);
    }
}

function scrapeData() {
    let divs = document.getElementsByTagName("div");
    for (let i = 0; i < divs.length; i++) {
        if (divs.item(i).getAttribute("id") === "__interceptedData") {
            const response = JSON.parse(divs.item(i).innerHTML);
            let tweets = response.globalObjects.tweets;
            for (let key in tweets) {
                data[key] = processText(tweets[key].full_text);
            }
            divs.item(i).remove();
        }
    }
    for (let key in data) {
        updateElement(key, data[key]);
    }
}

const DETOXIFIED_ATTRIBUTE_NAME = "is-detoxified";

document.addEventListener("onResponseInterception", () => {
    scrapeData();
    //console.log("onResponseInterception");
});
document.addEventListener("DOMContentLoaded", checkForDOM);
