//import {sendText} from './api'

let data = {};

let sendText = (text, onResult) => {
    const url = 'http://0.0.0.0:8888/detoxify?params=' + JSON.stringify({'text': text});
    console.log(url);
    xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    xhr.send();
    if (xhr.status !== 200) {
        console.log(xhr.status + ': ' + xhr.statusText);
        onResult("detoxify error");
    } else {
        onResult(xhr.responseText);
    }
};

function updateElement(id, text) {
    let words = text.split(" ");
    console.log(text);
    text = "";
    let isStart = true;
    for (let word of words) {
        if (word.slice(0, 1) === "@" && isStart) {
            isStart = true;
        } else {
            if (isStart) {
                text = word;
            } else {
                text += ' ' + word;
            }
            isStart = false;
        }
    }
    console.log(text);
    let spans = document.getElementsByTagName("span");
    for (let i = 0; i < spans.length; i++) {
        let item = spans.item(i);
        if (text === item.innerText) {
            sendText(item.innerText, data => {
                item.innerText = data;
                item.setAttribute(DETOXIFIED_ATTRIBUTE_NAME, id);
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
        return send.apply(this, arguments);
    };
})();
    `;
    document.head.prepend(xhrOverrideScript);
    scrapeData();
    setInterval(scrapeData, 1000);
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
                data[key] = tweets[key].full_text;
                updateElement(key, tweets[key].full_text);
            }
        }
    }
}

const DETOXIFIED_ATTRIBUTE_NAME = "is-detoxified";

function getTwits() {

}

function onLoad() {
    //dfs(document.body)
    let elements = document.getElementsByClassName("css-901oao css-16my406 r-1qd0xha r-ad9z0x r-bcqeeo r-qvutc0");
    for (let i = 0; i < elements.length; i++) {
        let el = elements[i];
        if (elements[i].getAttribute(DETOXIFIED_ATTRIBUTE_NAME) != null) {
            continue;
        }
        if (elements[i].getAttribute("data-testid") !== "tweet") {
            continue;
        }
        if (elements[i].childNodes === null) {
            continue;
        }
        if (elements[i].childNodes.length < 2) {
            continue;
        }
        let textGroup = elements[i].childNodes.item(1);
        if (textGroup === null) {
            continue;
        }
        if (textGroup.childNodes.length < 3) {
            continue;
        }
        textGroup.childNodes.forEach((el) => {
            if (el !== null) {
                console.log("detoxify");
                el.setAttribute(DETOXIFIED_ATTRIBUTE_NAME, "true");
                el.innerText = "😽";
            }
        });
    }
}
/* dkfjhsdkfj */
document.addEventListener("DOMContentLoaded", checkForDOM);
