
const URL = (process.env.BASE_URL ?? 'http://192.168.2.12');
const CONFIG = (process.env.CONFIG ?? '?var=framesize&val=9')
const PORT = Number(process.env.LISTEN_PORT ?? "9080");
const HOSTNAME  = process.env.LISTEN_HOSTNAME ?? "127.0.0.1";

let lastFrame = null;
async function updateFrame(img){
    lastFrame = img;
}

let exponentialBackOff = 1000;
let needConfig = true;
async function refresh(){
    try {
        if(needConfig){
            needConfig = false;
            console.log("Reconfigure espcam");
            await fetch(URL+'/control'+CONFIG, {
                method: 'GET'
            });        
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        const response = await fetch(URL+'/capture', {
            method: 'GET',
            headers: {
                'Content-Type': 'image/jpeg'
            }
        });
        if(!response.ok){
            throw new Error(`Failed to fetch image: ${response.status}`);       
        } else {
            exponentialBackOff = 1000;
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            updateFrame(buffer);
            setTimeout(refresh, 1000/30);
        }
    } catch(e){
        console.error('Failed to fetch image');
        exponentialBackOff = Math.min(exponentialBackOff * 2, 10000);
        needConfig = true;
        setTimeout(refresh, exponentialBackOff);
    }
}

const page = `
<!DOCTYPE html>
<html>
<head>
    <title>ESP32Cam Viewer</title>
    <style>
        body{
            margin:0;
            padding:0;
            background-color: black;
        }
        #viewer{
            width: 100%;
            height: 100%;
            object-fit: contain;
        }
        #container{
            width: 100vw;
            height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            position: fixed;
            top: 0;
            left: 0;
            margin:0;
            padding:0;
        }
    </style>
</head>
<body>
    <div id='container'>
        <img id='viewer' />
    </div>
    <script>

        async function refreshImage() {
            try{
                const response = await fetch('/image');
                const blob = await response.blob();
                if(window.lastUrl){
                    URL.revokeObjectURL(window.lastUrl);
                }
                window.lastUrl = URL.createObjectURL(blob);              
                const viewer = document.getElementById('viewer') ;
                viewer.src = window.lastUrl;
            } catch(e){
                console.error('Failed to fetch image', e);
            }
            setTimeout(refreshImage, 1000/30);
        }
        refreshImage();
    </script>
</body>
</html>
`;


const express = require('express');
const app = express();

app.get('/image', (req, res) => {
    const blob = lastFrame;
    if(blob){
        res.setHeader('Content-Type', 'image/jpeg');
        res.send(blob);
    } else {
        res.sendStatus(404);
    }

});

app.get('/', (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(page);
});


app.listen(PORT, HOSTNAME, () => {
    console.log(`Server listening at http://${HOSTNAME}:${PORT}`);
});

refresh();

