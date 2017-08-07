var spawn = require("cross-spawn")

module.exports = () => {
  let _lib

  let _events = {
    complete: [],
  }

  let _process = null
  let _timeout = null
  let _playing = false
  let _currentFile = ""

  function on(str, cb) {
    _events[str] = _events[str] || []
    _events[str].push(cb)
  }

  function setLibrary(lib) {
    _lib = lib
    _lib.on("new", obj => {
      if (!_playing) {
        play(obj)
      }
    })
  }

  function play(obj) {
    if (!obj) return
    _playing = true
    clearTimeout(_timeout)
    if (_process) {
      _process.kill()
    }
    console.log("%%%%%%%%%%%%%%%%%%%%%%");
    console.log(obj);
    console.log(obj.duration * 1000);
    console.log("%%%%%%%%%%%%%%%%%%%%%%");
    _currentFile = obj.src

    _process = spawn(`ffplay`, [_currentFile])
    const stderr = _process.stderr.toString("utf-8")
    const stdout = _process.stdout.toString("utf-8")

    _timeout = setTimeout(function() {
      _process.kill()
      _events["complete"].forEach(cb => cb(_currentFile))
      play(_lib.getNext())
    }, obj.duration * 1000)
  }

  return {
    setLibrary: setLibrary,
    play: play,
    on: on,
  }
}
