require("dotenv").config()
var watch = require("watch")
var spawn = require("cross-spawn")
const exec = require("child_process").exec
var _process
function play(file) {
  if (_process) {
    _process.kill()
  }
  //_process = spawn(`ffplay`, [file])
  _process = exec(`${process.env.PLAYER_TARGET} ${file}`)
  const stderr = _process.stderr.toString("utf-8")
  const stdout = _process.stdout.toString("utf-8")
}

watch.createMonitor(
  __dirname + "/"+process.env.SAVE_DIR_CONCAT,
  { interval: 0.01, filter: file => file.indexOf(".mp4") > -1 },
  function(monitor) {
    monitor.on("created", function(f, stat) {
      // Handle new files
      console.log(f)
      play(f)
    })
    monitor.on("changed", function(f, curr, prev) {
      // Handle file changes
    })
    monitor.on("removed", function(f, stat) {
      // Handle removed files
    })
  }
)
