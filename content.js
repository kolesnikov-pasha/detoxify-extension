function updateElement(id, text) {
    let spans = document.getElementsByTagName("span");
    spans.forEach((item) => {
        if (item.hasAttribute(DETOXIFIED_ATTRIBUTE_NAME)) {
            return;
        }

    })
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
    requestIdleCallback(scrapeData);
}

function checkForDOM() {
    if (document.body && document.head) {
        interceptData();
    } else {
        requestIdleCallback(checkForDOM);
    }
}

function scrapeData() {
    const responseContainingElement = document.getElementById('__interceptedData');
    const result = {};
    if (responseContainingElement) {
        const response = JSON.parse(responseContainingElement.innerHTML);
        console.log(response);
        console.log(response.globalObjects.tweets);
        let tweets = response.globalObjects.tweets;
        for (let key in tweets) {
            updateElement(key, tweets[key].full_text);
        }
    } else {
        requestIdleCallback(scrapeData);
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
