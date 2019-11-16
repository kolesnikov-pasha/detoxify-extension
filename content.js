function init() {
    if (document.body && document.head) {
        patchXhr();
    } else {
        requestIdleCallback(init);
    }
}

function patchXhr() {
    let shellcode = document.createElement("script");
    shellcode.type = "text/javascript";

    shellcode.innerHTML = `
        const TWITTER_HOOK_PREFIX = "https://api.twitter.com/2/timeline/profile/";

        let nextTweetId = 0;
        let idToText = {};
        let idToElement = {};

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

        function detoxifyText(text, ) {
            let xhr = new XMLHttpRequest();

            xhr.onreadystatechange = () => {
                if (xhr.readyState == XMLHttpRequest.DONE && xhr.status == 200) {
                    let response = JSON.parse(xhr.responseText);

                }
            };
        }

        function walkTweets(tree, ids) {
            if (typeof tree != "object") {
                return;
            }

            for (let key in tree) {
                if (key == "full_text") {
                    ids.push(nextTweetId);
                    idToText[nextTweetId] = tree[key];
                    tree[key] = "__detoxify__" + nextTweetId.toString();
                    nextTweetId++;
                } else {
                    walkTweets(tree[key]);
                }
            }
        }

        (function() {
            let xhr = XMLHttpRequest.prototype;

            let xhrOpen = xhr.open;

            xhr.open = function(method, url) {
                this.__detoxify__url = url;
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

            //     // newValue => newValue,
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

                        return callback.apply(this, arguments);
                    };

                    xhrSetOnreadystatechange.call(this, newCallback);

                    return newCallback;
                }
            );
        })();
    `;

    document.head.prepend(shellcode);
}

requestIdleCallback(init);
