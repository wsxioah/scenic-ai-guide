/**
 * Voice recognition via Web Speech API (SpeechRecognition) in WebView.
 * This matches the reference Capacitor project approach.
 * Uses browser's built-in speech recognition - NO raw microphone access needed.
 */

const apiBase = 'http://10.223.11.225:8000';

type VoiceCallback = (text: string) => void;
type StateCallback = (state: string) => void;

let onResult: VoiceCallback | null = null;
let onState: StateCallback | null = null;

export function setVoiceCallbacks(r: VoiceCallback, s: StateCallback) {
  onResult = r;
  onState = s;
}

export function handleMessage(e: any) {
  try {
    const msg = JSON.parse(e.nativeEvent.data);
    switch (msg.type) {
      case 'result':
        onResult?.(msg.text);
        onState?.('idle');
        break;
      case 'state':
        onState?.(msg.state);
        break;
      case 'error':
        console.warn('VoiceRecorder error:', msg.error);
        onState?.('idle');
        break;
    }
  } catch {}
}

// RECORD_HTML now uses Web Speech API (SpeechRecognition) instead of getUserMedia.
// This is the same approach used by the reference Capacitor project.
export const RECORD_HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{height:100%;width:100%;overflow:hidden}
  body{
    display:flex;align-items:center;justify-content:center;
    background:#EFF6FF;font-family:-apple-system,BlinkMacSystemFont,sans-serif;
    -webkit-user-select:none;user-select:none;
  }
  #btn{
    width:100%;height:100%;display:flex;align-items:center;justify-content:center;
    font-size:15px;font-weight:600;color:#2563EB;
    background:#EFF6FF;border-radius:24px;
    cursor:pointer;user-select:none;
    transition:background 0.15s;
  }
  #btn:active{background:#DBEAFE}
  #btn.listening{background:#DBEAFE;color:#1D4ED8}
  #btn.error{background:#FEF3C7;color:#92400E;font-size:13px}
  #btn.nosupport{background:#FEF3C7;color:#92400E;font-size:12px}
</style>
</head>
<body>
<div id="btn">🎤 按住说话</div>
<script>
var recognition=null;
var listening=false;
var touchStartY=0;
var swiped=false;

function post(m){window.ReactNativeWebView.postMessage(JSON.stringify(m))}

var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if(!SpeechRecognition){
  document.getElementById('btn').className='nosupport';
  document.getElementById('btn').textContent='⚠ 浏览器不支持语音识别';
} else {
  recognition=new SpeechRecognition();
  recognition.lang='zh-CN';
  recognition.interimResults=true;
  recognition.continuous=false;

  recognition.onstart=function(){
    listening=true;
    document.getElementById('btn').className='listening';
    document.getElementById('btn').textContent='🔴 松手识别';
    post({type:'state',state:'listening'});
  };

  recognition.onresult=function(e){
    if(e.results.length>0){
      var last=e.results[e.results.length-1];
      if(last.isFinal){
        var text=last[0].transcript.trim();
        if(text){
          document.getElementById('btn').className='';
          document.getElementById('btn').textContent='🎤 按住说话';
          post({type:'result',text:text});
          listening=false;
          return;
        }
      }
    }
  };

  recognition.onerror=function(e){
    listening=false;
    document.getElementById('btn').className='';
    document.getElementById('btn').textContent='🎤 按住说话';
    post({type:'state',state:'idle'});
    // Show error briefly
    var b=document.getElementById('btn');
    if(e.error==='not-allowed'){
      b.className='error';b.textContent='⚠ 请允许语音权限';
    } else if(e.error==='no-speech'){
      b.className='error';b.textContent='⚠ 未检测到语音';
    } else if(e.error==='network'){
      b.className='error';b.textContent='⚠ 网络错误';
    } else {
      b.className='error';b.textContent='⚠ 识别失败';
    }
    setTimeout(function(){b.className='';b.textContent='🎤 按住说话'},2000);
  };

  recognition.onend=function(){
    listening=false;
    if(!swiped){
      document.getElementById('btn').className='';
      document.getElementById('btn').textContent='🎤 按住说话';
      post({type:'state',state:'idle'});
    }
  };
}

document.getElementById('btn').addEventListener('touchstart',function(e){
  if(listening||!recognition)return;
  touchStartY=e.touches[0].clientY;
  swiped=false;
  try{recognition.start()}catch(ex){}
  e.preventDefault();
},{passive:false});

document.getElementById('btn').addEventListener('touchmove',function(e){
  if(!listening)return;
  var dy=touchStartY-e.touches[0].clientY;
  if(dy>50){
    swiped=true;
    document.getElementById('btn').className='';
    document.getElementById('btn').textContent='⚠ 松手取消';
  }else if(dy<20){
    swiped=false;
    document.getElementById('btn').className='listening';
    document.getElementById('btn').textContent='🔴 松手识别';
  }
  e.preventDefault();
},{passive:false});

document.getElementById('btn').addEventListener('touchend',function(e){
  if(!listening)return;
  if(swiped){
    try{recognition.abort()}catch(ex){}
    swiped=false;
    document.getElementById('btn').className='';
    document.getElementById('btn').textContent='🎤 按住说话';
    post({type:'state',state:'idle'});
  }else{
    try{recognition.stop()}catch(ex){}
  }
  e.preventDefault();
});
</script>
</body>
</html>`;
