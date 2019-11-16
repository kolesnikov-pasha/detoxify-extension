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

    xhr.open("POST", "http://127.0.0.1:8080/detoxify", true);
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

        function makePlaceholder(seed) {
            return "\u2800" + seed.toString();
        }

        function walkTweets(tree) {
            if (typeof tree != "object") {
                return;
            }

            if ("id_str" in tree) {
                console.log(tree["id_str"]);
            }

            for (let key in tree) {
                if (key == "full_text") {
                    try {
                        decodeURIComponent(encodeURIComponent(tree[key]));
                    } catch (exc) {
                        console.log(tree[key]);
                    }

                    tweetIdToText[nextTweetId] = tree[key];

                    let isStatus = location.href.includes("/status/");

                    let username = tree[key].trim().match(/@[a-zA-Z0-9_]+/);

                    if (username == null || !isStatus) {
                        tree[key] = makePlaceholder(nextTweetId);
                    } else {
                        tree[key] = username + " " + makePlaceholder(nextTweetId);
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
                let fhtagnIndex = idStr.indexOf("\u2800");

                if (fhtagnIndex < 0) {
                    continue;
                }

                let id = parseInt(idStr.substr(fhtagnIndex + 1));

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

                if ("tweetText" in response) {
                    tweetIdToElement[id].innerText = response.tweetText;
                } else {
                    tweetIdToElement[id].innerText = tweetIdToText[id];
                }
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

requestIdleCallback(init);
