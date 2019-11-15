import axios from 'axios'

let sendText = text => {
    const url = '0:88/detoxify_text';
    axios.get(url, {
        params: {
            text: text
        }
    })
    .then(data => return data)
    .catch(err => console.log(err))
}

let sendImage = image => {
    const url = '0:88/detoxify_image';
    axios.get(url, {
        params: {
            image: image
        }
    })
    .then(data => return data)
    .catch(err => console.log(err))
}

