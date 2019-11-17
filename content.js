let storage = chrome.storage.local;

function init() {
    if (document.body && document.head) {
        installBackendApi();
        patchXhr();
    } else {
        requestIdleCallback(init);
    }
}

function installBackendApi() {
    document.addEventListener("detoxifyTweetRequest", event => {
        let request = event.detail;

        detoxifyText(request.tweetText, backendResponse => {
            let response = {tweetId: request.tweetId};

            if ("text" in backendResponse) {
                response.tweetText = backendResponse.text;
            }

            document.dispatchEvent(new CustomEvent("detoxifyTweetResponse", {detail: response}));
        });
    });
}

function detoxifyText(text, callback) {
    let xhr = new XMLHttpRequest();

    xhr.onreadystatechange = () => {
        if (xhr.readyState == XMLHttpRequest.DONE && xhr.status == 200) {
            let response = JSON.parse(xhr.responseText);
            callback(response);
        }
    };

    xhr.open("POST", "http://10.100.54.178:8080/detoxify", true);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.send(JSON.stringify({"text": text}));
}

function patchXhr() {
    let shellcode = document.createElement("script");
    shellcode.type = "text/javascript";

    shellcode.innerHTML = `
        const TWITTER_HOOK_PREFIX = "https://api.twitter.com/2/timeline/";

        let nextTweetId = 0;
        let tweetIdToText = {};
        let tweetIdToElement = {};

        let observer;

        function isDigit(c) {
            return "0" <= c && c <= "9";
        }

        function hookProperty(obj, key, get_fun, set_fun) {
            let value;

            Object.defineProperty(
                obj, key,
                {
                    enumerable: true,
                    configurable: true,

                    get() {
                        return get_fun.call(this, value);
                    },

                    set(newValue) {
                        value = set_fun.call(this, newValue);
                    }
                }
            );
        }

        function makeComplexPlaceholder(text, placeholder) {
            let retText = "";
            let retPlaceholder = "";

            let words = text.split(" ");
            let wordIndex = 0;

            for (; wordIndex < words.length; wordIndex++) {
                let word = words[wordIndex];

                if (word[0] != "@") {
                    break;
                }

                retPlaceholder += word + " ";
            }

            retPlaceholder += placeholder + " ";

            for (; wordIndex < words.length; wordIndex++) {
                let word = words[wordIndex];

                if (word.startsWith("http://") || word.startsWith("https://")) {
                    retPlaceholder += word + " ";
                } else {
                    retText += word + " ";
                }
            }

            return [
                retText.substr(0, retText.length - 1),
                retPlaceholder.substr(0, retPlaceholder.length - 1)
            ];
        }

        function makePlaceholder(seed) {
            return "\u2800" + seed.toString();
        }

        function walkTweets(tree) {
            if (typeof tree != "object" || tree == null) {
                return;
            }

            let isStatus = location.href.includes("/status/");

            for (let key in tree) {
                if (key == "full_text") {
                    let placeholder = makePlaceholder(nextTweetId);

                    if (isStatus) {
                        console.log(tree[key]);

                        for (let i = 0; i < tree[key].length; i++) {
                            console.log(tree[key].charCodeAt(i));
                        }

                        let [text, complexPlaceholder] =
                            makeComplexPlaceholder(tree[key], placeholder);

                        if (text.length > 0) {
                            tweetIdToText[nextTweetId] = text;
                            tree[key] = complexPlaceholder;
                        }
                    } else {
                        tweetIdToText[nextTweetId] = tree[key];
                        tree[key] = placeholder;
                    }

                    nextTweetId++;
                } else {
                    walkTweets(tree[key]);
                }
            }
        }

        function loadTweetElements() {
            let spans = document.getElementsByTagName("span");

            for (let span of spans) {
                let idStr = span.innerText.trim();
                let fhtagnStart = idStr.indexOf("\u2800");

                if (fhtagnStart < 0) {
                    continue;
                }

                let fhtagnEnd = fhtagnStart + 1;

                while (fhtagnEnd < idStr.length && isDigit(idStr[fhtagnEnd])) {
                    fhtagnEnd++;
                }

                let id = parseInt(idStr.slice(fhtagnStart + 1, fhtagnEnd));

                span.innerText = "⌛️";

                tweetIdToElement[id] = span;

                document.dispatchEvent(new CustomEvent(
                    "detoxifyTweetRequest",
                    {detail: {tweetId: id, tweetText: tweetIdToText[id]}}
                ));
            }
        }

        (function() {
            let xhr = XMLHttpRequest.prototype;

            let xhrOpen = xhr.open;

            xhr.open = function(method, url) {
                this.__detoxify__url = url;
                console.log(url);
                return xhrOpen.apply(this, arguments);
            };

            let xhrGetResponseText = xhr.__lookupGetter__("responseText");

            // hookProperty(
            //     xhr, "responseText",

            //     function(value) {
            //         if (value == undefined) {
            //             return xhrGetResponseText.call(this);
            //         } else {
            //             return value;
            //         }
            //     },

            //     function(newValue) { return newValue; }
            // );

            Object.defineProperty(xhr, "responseText", {
                enumerable: true,
                configurable: true,

                get() {
                    if (typeof this.__contentScript__responseText != "undefined") {
                        return this.__contentScript__responseText;
                    }

                    return xhrGetResponseText.call(this);
                },

                set(newResponseText) {
                    this.__contentScript__responseText = newResponseText;
                }
            });

            let xhrSetOnreadystatechange = xhr.__lookupSetter__("onreadystatechange");

            hookProperty(
                xhr, "onreadystatechange",

                function(callback) { return callback; },

                function(callback) {
                    let newCallback = function() {
                        if (
                            (this.responseType == "" || this.responseType == "text") &&
                            this.__detoxify__url.startsWith(TWITTER_HOOK_PREFIX)
                        ) {
                            let response;

                            try {
                                response = JSON.parse(xhrGetResponseText.call(this));
                            } catch (exc) {
                                console.log("detoxify: JSON syntax error");
                            }

                            if (response != undefined) {
                                walkTweets(response);
                                this.responseText = JSON.stringify(response);
                            }
                        }

                        let ret = callback.apply(this, arguments);

                        return ret;
                    };

                    xhrSetOnreadystatechange.call(this, newCallback);

                    return newCallback;
                }
            );

            document.addEventListener("detoxifyTweetResponse", event => {
                let response = event.detail;
                let id = response.tweetId;
                let element = tweetIdToElement[id];
                let text = response.tweetText || tweetIdToText[id];

                if (response.tweetText !== undefined) {
                    element.style.background = "#A1FFA5";
                    element.style.opacity = 0.5;
                }

                [_, element.innerText] =
                    makeComplexPlaceholder(element.innerText, text);
            });

            observer = new MutationObserver((mutations, observer) => {
                loadTweetElements();
            });

            observer.observe(document.body, {
                attributes: true,
                childList: true,
                subtree: true,
                characterData: true
            });
        })();
    `;

    document.head.prepend(shellcode);
}

storage.get("turned_on", (items) => {
    if (items.turned_on === "true") {
        requestIdleCallback(init);
    }
})

