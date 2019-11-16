import axios from 'axios'

export let sendText = (text, onResult) => {
    const url = '0:88/detoxify';
    axios.post(url, {
        params: {
            text: text
        }
    })
    .then(data => onResult(data))
    .catch(err => {
        console.log(err);
        onResult(text + "detoxify error");
    })
};

export let sendImage = (image, onResult) => {
    const url = '0:88/detoxify';
    axios.post(url, {
        params: {
            image: image
        }
    })
    .then(data => onResult(data))
    .catch(err => {
        console.log(err);
        onResult(text + "detoxify error");
    })
};

