let data = JSON.parse("{}");
let storage = chrome.storage.local;

let sendText = (text, onResult) => {
    const url = 'http://10.100.54.178:8080/detoxify';
    xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.send(JSON.stringify({"text": text}));
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4 && xhr.status === 200) {
            console.log(xhr);
            onResult(xhr.responseText);
        }
        if (xhr.readyState === 4 && xhr.status !== 200) {
            console.log(xhr.status + ': ' + xhr.statusText + ' error');
        }
    };
};

function updateElement(id) {
    let text = data[id].text;
    let spans = document.getElementsByTagName("span");
    for (let i = 0; i < spans.length; i++) {
        let item = spans.item(i);
        if (text.includes(item.innerText) && (item.innerText.length / text.length > 0.8)) {
            if (data[id].has_result) {
                let result = data[id].response;
                if (Object.keys(result).indexOf("text") >= 0) {
                    item.innerText = result.text;
                }
            } else {
                sendText(item.innerText, result => {
                    data[id].has_result = true;
                    data[id].response = JSON.parse(result);
                    if (Object.keys(data[id].response).indexOf("text") >= 0) {
                        item.innerText = data[id].response.text;
                        item.setAttribute("class", "my_span " + item.getAttribute("class"));
                    }
                });
            }
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
                if (Object.keys(data).indexOf(key) >= 0) {
                    continue;
                }
                data[key] = {text: processText(tweets[key].full_text), has_result: false, response: ""};
            }
            divs.item(i).remove();
        }
    }
    storage.get("turned_on", (items) => {
        if (items.turned_on === "true") {
            console.log("start updating");
            for (let key in data) {
                updateElement(key);
            }    
        }    
    });
}

const DETOXIFIED_ATTRIBUTE_NAME = "is-detoxified";

document.addEventListener("onResponseInterception", () => {
    scrapeData();
});
document.addEventListener("DOMContentLoaded", () => {
    let css = '.my_span { background: #A1FFA5; opacity: 0.5; }',
        head = document.head || document.getElementsByTagName('head')[0],
        style = document.createElement('style');

    head.appendChild(style);

    style.type = 'text/css';
    if (style.styleSheet){
        // This is required for IE8 and below.
        style.styleSheet.cssText = css;
    } else {
        style.appendChild(document.createTextNode(css));
    }
    checkForDOM();
});
