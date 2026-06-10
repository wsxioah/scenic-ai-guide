const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION = '&copy; <a href="https://openstreetmap.org/">OSM</a>';

export interface MapSpot {
  id: number | string;
  name: string;
  lat: number;
  lng: number;
  category: string;
  icon: string;
}

export interface MapData {
  userLat: number;
  userLng: number;
  spots: MapSpot[];
  facilities: MapSpot[];
}

export function buildMapHtml(data: MapData): string {
  const spotsJson = JSON.stringify(data.spots);
  const facilitiesJson = JSON.stringify(data.facilities);

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css" />
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body,#map{width:100%;height:100%;overflow:hidden}
#map{background:#0a0a15}
.leaflet-tile{filter:invert(1) hue-rotate(180deg) saturate(0.3) brightness(0.6)!important}

.leaflet-control-zoom{display:none}
.leaflet-control-attribution{background:rgba(0,0,0,0.7)!important;color:#4a5568!important;font-size:9px!important;padding:2px 6px!important;border:none!important}
.leaflet-control-attribution a{color:#6b7280!important}

.pulse-dot{width:14px;height:14px;background:#00ff88;border-radius:50%;border:3px solid #00ff88;box-shadow:0 0 12px #00ff88;animation:pulse 1.8s infinite}
@keyframes pulse{0%{box-shadow:0 0 0 0 rgba(0,255,136,0.5)}70%{box-shadow:0 0 0 18px rgba(0,255,136,0)}100%{box-shadow:0 0 0 0 rgba(0,255,136,0)}}

.spot-marker{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:15px;border:2px solid rgba(255,255,255,0.3);box-shadow:0 2px 8px rgba(0,0,0,0.5)}
.spot-popup .leaflet-popup-content-wrapper{background:rgba(10,10,20,0.95);color:#e2e8f0;border:1px solid rgba(0,255,136,0.3);border-radius:8px;box-shadow:0 4px 20px rgba(0,0,0,0.6)}
.spot-popup .leaflet-popup-tip{background:rgba(10,10,20,0.95);border:1px solid rgba(0,255,136,0.3)}
.spot-popup .leaflet-popup-close-button{color:#6b7280!important;font-size:16px!important;top:6px!important;right:6px!important}

.popup-content{font-family:system-ui,-apple-system,sans-serif;min-width:140px}
.popup-name{font-size:14px;font-weight:700;color:#00ff88;margin-bottom:4px}
.popup-cat{font-size:11px;color:#9ca3af;margin-bottom:10px}
.popup-nav{display:inline-block;background:#00ff88;color:#0a0a15;padding:6px 16px;border-radius:4px;font-size:12px;font-weight:700;text-decoration:none;margin-top:4px}

#locate-btn{position:absolute;top:12px;right:12px;z-index:1000;width:38px;height:38px;background:rgba(10,10,20,0.85);border:1px solid rgba(0,255,136,0.3);border-radius:8px;color:#00ff88;font-size:18px;display:flex;align-items:center;justify-content:center;cursor:pointer}
#locate-btn:active{background:rgba(0,255,136,0.2)}

#status-bar{position:absolute;bottom:12px;left:12px;right:12px;z-index:1000;background:rgba(10,10,20,0.85);border:1px solid rgba(0,255,136,0.2);border-radius:8px;padding:8px 12px;color:#6b7280;font-size:10px;font-family:monospace;display:flex;justify-content:space-between}
</style>
</head>
<body>
<div id="map"></div>
<div id="locate-btn" onclick="goToMyLocation()">◎</div>
<div id="status-bar">
  <span id="coords">--</span>
  <span id="spot-count">⛰ 0</span>
</div>

<script src="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
var SPOTS = ${spotsJson};
var FACILITIES = ${facilitiesJson};
var USER_LAT = ${data.userLat};
var USER_LNG = ${data.userLng};

var map = L.map('map', {
  center: [USER_LAT, USER_LNG],
  zoom: 16,
  zoomControl: false,
  attributionControl: false,
  minZoom: 5,
  maxZoom: 20,
});

L.tileLayer('${TILE_URL}', {
  maxZoom: 19,
}).addTo(map);

L.control.attribution({position:'bottomleft'}).addTo(map);

var userIcon = L.divIcon({className:'pulse-dot',iconSize:[14,14],iconAnchor:[7,7]});
var userMarker = L.marker([USER_LAT, USER_LNG],{icon:userIcon,zIndexOffset:1000}).addTo(map);
map.setView([USER_LAT, USER_LNG], 16);

var headingCircle = null;
function updateHeading(h) {
  if (headingCircle) map.removeLayer(headingCircle);
  if (h == null) return;
  var r = h * Math.PI / 180;
  var latlngs = [[USER_LAT, USER_LNG],[USER_LAT+0.0003*Math.cos(r),USER_LNG+0.0003*Math.sin(r)]];
  headingCircle = L.polyline(latlngs,{color:'#00ff88',weight:2,opacity:0.7}).addTo(map);
}

var spotMarkers = [];
function addSpots() {
  spotMarkers.forEach(function(m){map.removeLayer(m);});
  spotMarkers = [];
  SPOTS.forEach(function(s){
    var catColors = {
      '自然景观':'#22c55e','人文历史':'#f59e0b','宗教文化':'#a855f7',
      '休闲娱乐':'#3b82f6','餐饮':'#ef4444','购物':'#f97316',
      '其他':'#6b7280'
    };
    var color = catColors[s.category] || '#6b7280';
    var icon = L.divIcon({
      className:'spot-marker',
      html:'<span>'+s.icon+'</span>',
      iconSize:[28,28],iconAnchor:[14,14],
      style:'background:'+color+';'
    });
    var popupHtml = '<div class="popup-content"><div class="popup-name">'+s.name+'</div><div class="popup-cat">'+s.category+'</div><a class="popup-nav" href="javascript:void(0)" onclick="navigateTo('+s.lat+','+s.lng+',\''+s.name+'\')">导航</a></div>';
    var m = L.marker([s.lat,s.lng],{icon:icon}).addTo(map);
    m.bindPopup(popupHtml,{className:'spot-popup',closeButton:true,offset:[0,-6]});
    spotMarkers.push(m);
  });
  document.getElementById('spot-count').textContent='⛰ '+SPOTS.length;
}

function addFacilities() {
  FACILITIES.forEach(function(f){
    var icon = L.divIcon({
      className:'spot-marker',
      html:'<span>'+f.icon+'</span>',
      iconSize:[26,26],iconAnchor:[13,13],
      style:'background:#f59e0b;'
    });
    var popupHtml = '<div class="popup-content"><div class="popup-name">'+f.name+'</div><div class="popup-cat">'+f.category+'</div><a class="popup-nav" href="javascript:void(0)" onclick="navigateTo('+f.lat+','+f.lng+',\''+f.name+'\')">导航</a></div>';
    var m = L.marker([f.lat,f.lng],{icon:icon}).addTo(map);
    m.bindPopup(popupHtml,{className:'spot-popup',closeButton:true,offset:[0,-6]});
    spotMarkers.push(m);
  });
}

function navigateTo(lat,lng,name) {
  if (window.ReactNativeWebView) {
    window.ReactNativeWebView.postMessage(JSON.stringify({type:'navigate',lat:lat,lng:lng,name:name}));
  }
}

function goToMyLocation() {
  map.setView([USER_LAT, USER_LNG], 17, {animate:true});
  if (window.ReactNativeWebView) {
    window.ReactNativeWebView.postMessage(JSON.stringify({type:'requestLocation'}));
  }
}

function onLocationUpdate(lat,lng,h) {
  USER_LAT = lat; USER_LNG = lng;
  userMarker.setLatLng([lat,lng]);
  document.getElementById('coords').textContent = lat.toFixed(5)+', '+lng.toFixed(5);
  updateHeading(h);
}

map.on('moveend', function(){
  var c = map.getCenter();
  document.getElementById('coords').textContent = c.lat.toFixed(5)+', '+c.lng.toFixed(5);
});

addSpots();
addFacilities();
document.getElementById('coords').textContent = USER_LAT.toFixed(5)+', '+USER_LNG.toFixed(5);

if (window.ReactNativeWebView) {
  window.ReactNativeWebView.postMessage(JSON.stringify({type:'mapReady'}));
}
</script>
</body>
</html>`;
}
