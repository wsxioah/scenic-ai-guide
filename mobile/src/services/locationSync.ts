// Shared real-time location state between MapScreen and SearchScreen
// Avoids stale navigation params and module-level variable issues

let _userLoc: { lat: number; lng: number } | null = null;
let _mockLoc = false;
let _routeNav: { start: { lat: number; lng: number; name: string }; end: { lat: number; lng: number; name: string } } | null = null;

export function setLiveUserLoc(loc: { lat: number; lng: number } | null) { _userLoc = loc; }
export function setLiveMockLoc(v: boolean) { _mockLoc = v; }
export function getLiveLocation() {
  return { userLoc: _userLoc, mockLoc: _mockLoc };
}

export function setPendingRouteNav(data: typeof _routeNav) { _routeNav = data; }
export function consumePendingRouteNav() {
  const d = _routeNav;
  _routeNav = null;
  return d;
}

let _focusPlace: { lat: number; lng: number; name: string } | null = null;
export function setFocusPlace(p: typeof _focusPlace) { _focusPlace = p; }
export function consumeFocusPlace() {
  const p = _focusPlace;
  _focusPlace = null;
  return p;
}
