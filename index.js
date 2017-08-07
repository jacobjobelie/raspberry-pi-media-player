const {
  downloadEntireVideo,
  record,
  getBuffers,
  concat,
  splitVideo,
  getVideoDuration,
} = require("opencv-youtube")
const exec = require("child_process").exec
const {
  flatten,
  flattenDeep,
  compact,
  shuffle,
  random,
  sample,
} = require("lodash")
const fs = require("fs")
const path = require("path")
const Q = require("bluebird")
const rimraf = require("rimraf")
const Queue = require("./lib/queue")
const queue = Queue()
const Player = require("./src/player")
const player = Player()
const Lib = require("./src/library")
const lib = Lib()
player.setLibrary(lib)
player.on("complete", file => {})
const YT_API = require("./youtube_api")
const YT_RELATED = Q.promisify(YT_API.related)
const SAVE_DIR = "videos"

const DEFAULT_OPTIONS = {
  itags: ["134"],
  excludeReferences: null,
  dissimilartyFudge: 0.4,
  maxReferences: 2,
  removeOriginalVideo: false,
  random: true,
  spreadReferences: true,
  saveDir: SAVE_DIR,
  //username: process.env.YT_USER,
  //password: process.env.YT_PASS,
}

const ID_LIST = ["0wp2qhoop9U", "bVXfkG7q_0s"]
const MAX_CACHE = 20
const CACHED_BUFFERS = []
const CACHED_FILES = []
const RELATED = {}

const getId = () => sample(ID_LIST)

const getRandomBuffers = count =>
  new Array(count)
    .fill(1)
    .map(
      (v, i) =>
        CACHED_BUFFERS[
          Math.floor(Math.random() * (CACHED_BUFFERS.length * 100)) %
            CACHED_BUFFERS.length
        ]
    )

const getRandomFile = () => sample(CACHED_FILES)

const concatBuffers = buffers => {
  const bufferLength = buffers.reduce(
    (sum, buffer) => (sum += buffer.byteLength),
    0
  )
  return Buffer.concat(buffers, bufferLength)
}

const getTsClip = options => {
  return record(options).then(function(results) {
    return results
  })
}
const getBufferClip = options => {
  return getBuffers(options).then(bufferObj => {
    const bufferLength = bufferObj.reduce(
      (sum, obj) => (sum += obj.buffer.byteLength),
      0
    )
    const Duration = bufferObj.reduce(
      (sum, obj) => (sum += obj.ref.durationSec),
      0
    )
    CACHED_BUFFERS.push(...bufferObj.map(b => b.buffer))
    const buff = concatBuffers(bufferObj.map(b => b.buffer))
    const ff = `videos/${Math.random().toFixed(3)}.mp4`
    fs.writeFileSync(ff, buff)
    return { src: ff, duration: Duration }
  })
}

const searchRelated = id => {
  return YT_RELATED(id, 50).then(results => {
    return results.items.map(obj => {
      return obj.id.videoId
    })
  })
}

const doClip = () => {
  const id = getId()

  searchRelated(id).then(ids => ID_LIST.push(sample(ids)))

  if (ID_LIST.length > MAX_CACHE) ID_LIST.shift()

  return getTsClip(
    Object.assign({}, DEFAULT_OPTIONS, {
      id: id,
    })
  ).then(obj => {
    const duration = obj.reduce((acc, v) => {
      return (acc += v.duration)
    }, 0)
    return concat(
      obj.map(o => o.file),
      null,
      process.env.SAVE_DIR_CONCAT
    ).then(file => {
      CACHED_FILES.push(file)
      setTimeout(() => {
        const f = getRandomFile()
        const pf = path.parse(f)
        const newf = path.join(
          pf.dir,
          `${pf.name}__${Math.random().toFixed(3)}${pf.ext}`
        )
        fs.rename(f, newf, (err, succ) => {})
        doClip()
      }, duration * 1000)
    })
  })
}

doClip()
