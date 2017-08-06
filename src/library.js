module.exports = () => {
  let _lib = []
  let _current;
  let _events = {
    new: [],
  }

  function on(str, cb) {
    _events[str] = _events[str] || []
    _events[str].push(cb)
  }

  function play(obj) {}

  function push(obj = {}) {
    if(!obj.duration) return
    _lib.push(obj)
    _events["new"].forEach(cb => cb(obj))
    console.log("&&&&&&&&&&&&&&&&&&&");
    console.log(_lib);
    console.log("&&&&&&&&&&&&&&&&&&&");
  }

  function unshift(obj = {}) {
    _lib.unshift(obj)
  }

  function getNext() {
    if(!_lib.length) return _current
    _current = _lib.shift()
    return _current
  }

  return {
    on: on,
    getNext: getNext,
    push: push,
    unshift: unshift,
  }
}
