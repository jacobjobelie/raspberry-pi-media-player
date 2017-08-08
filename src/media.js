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
const Queue = require("./queue")
const queue = Queue()
const Player = require("./player")
const player = Player()
const Lib = require("./library")
const lib = Lib()
player.setLibrary(lib)
player.on("complete", file => {})
const YT_API = require("./youtube_api")
const YT_RELATED = Q.promisify(YT_API.related)
const YT_PLAYLIST = Q.promisify(YT_API.getPlayListsItemsById)
const SAVE_DIR = "videos"

module.exports = () => {
  const DEFAULT_OPTIONS = {
    itags: ["134"],
    excludeReferences: null,
    dissimilartyFudge: 0.4,
    maxReferences: 3,
    removeOriginalVideo: false,
    random: true,
    spreadReferences: true,
    saveDir: SAVE_DIR,
    //username: process.env.YT_USER,
    //password: process.env.YT_PASS,
  }
  let _started = false
  let ID_LIST = []
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
            Math.floor(
              Math.random() * (CACHED_BUFFERS.length * 100)
            ) % CACHED_BUFFERS.length
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
  const playlistItems = id => {
    return YT_PLAYLIST(id, 50).then(results => {
      return results.items.map(obj => {
        return obj.contentDetails.videoId
      })
    })
  }

  const doClip = () => {
    _started = true
    const id = getId()

    console.log("-------------")
    console.log(id)
    console.log("-------------")

    return getTsClip(
      Object.assign({}, DEFAULT_OPTIONS, {
        id: id,
      })
    ).then(obj => {
      const duration = obj.reduce((acc, v) => {
        return (acc += v.duration)
      }, 0)
      return concat(
        obj.map(o => `${path.join(o.mp4File)}`),
        `${Math.random().toFixed(5)}.mp4`,
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

  rimraf(process.env.SAVE_DIR_CONCAT, () => {
    try {
      fs.mkdirSync(process.env.SAVE_DIR_CONCAT)
    } catch (e) {}
  })

  const extractVideoID = url => {
    var regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#\&\?]*).*/
    var match = url.match(regExp)
    if (match && match[7].length == 11) {
      return match[7]
    }
    return null
  }

  const extractPlaylistID = url => {
    var regExp = /^.*(youtu.be\/|list=)([^#\&\?]*).*/
    var match = url.match(regExp)
    if (match && match[2].length) {
      return match[2]
    }
  }

  function add(url) {
    const id = extractVideoID(url)
    if (id) {
      compact(ID_LIST.unshift(id))
      if (!_started) {
        doClip()
      }
      searchRelated(id).then(ids => (ID_LIST = [...ID_LIST, ...ids]))
    } else {
      const pid = extractPlaylistID(url)
      playlistItems(pid).then(ids => {
        ID_LIST = [...ids, ...ID_LIST]
        if (!_started) {
          doClip()
        }
      })
    }
  }

  return {
    add: add,
  }
}
