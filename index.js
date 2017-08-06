const { GetFacesFromClip, FacesFromVideo } = require("opencv-faces")
const {
  downloadEntireVideo,
  record,
  concat,
  splitVideo,
  getVideoDuration,
} = require("opencv-youtube")
const exec = require("child_process").exec
const { flatten, flattenDeep, compact, shuffle } = require("lodash")
const fs = require("fs")
const Q = require("bluebird")
const rimraf = require("rimraf")
const Queue = require("./lib/queue")
const queue = Queue()
const Player = require("./src/player")
const player = Player()
const Lib = require("./src/library")
const lib = Lib()
player.setLibrary(lib)
player.on("complete", file => {
  //fs.unlinkSync(file)
})

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

const ID_LIST = ["5tNNoKEJW5w", "z2G1Ht59cpM"]

const IDS = ["z2G1Ht59cpM"].map(id =>
  Object.assign({}, { id: id }, DEFAULT_OPTIONS)
)

const downloadVideo = opt => {
  return record(opt)
}

const addToQueue = promises => {
  queue.push(promises)
}

const EXCLUDE_REFERENCES = {}

const getId  = () => (ID_LIST[Math.floor(Math.random() * 100) % ID_LIST.length])

const cvVideo = opt => {
  return downloadVideo(opt)
    .then(function(results) {
      if (results.length) {
        const { id } = results[0].options
        EXCLUDE_REFERENCES[id] = EXCLUDE_REFERENCES[id] || []

        results.forEach(r => {
          EXCLUDE_REFERENCES[id].push(r.referenceIndex)
        })

        addToQueue([
          cvVideo(
            Object.assign({}, DEFAULT_OPTIONS, {
              id: getId(),
              excludeReferences: EXCLUDE_REFERENCES[id],
            })
          ),
        ])
      }

      return Q.map(
        results,
        result => {
          return GetFacesFromClip(result.file, {
            doBackgrounds: false,
            minSecondsBetweenScenes: 1,
            removeOriginalVideo: true,
            fps: 0.05, //half the fps,
            outputDir: "output_frames",
            outputImageHeight: "480",
            imageExt: "png",
            lookbackSecs: 1,
          })
        },
        {
          concurrency: 1,
        }
      )
    })
    .then(results => {
      const fResults = flatten(results)
      const ffResults = fResults.filter(
        obj => fs.statSync(obj.videoSrc).size > 200
      )

      if (ffResults.length) {
        return concat(
          compact(ffResults).map(s => s.videoSrc), null, SAVE_DIR
        ).then(concatVideo => {
          lib.push({
            src: concatVideo,
            duration: getVideoDuration(concatVideo),
          })
        })
      } else {
        if (fResults[0].faces.length) {
          console.log("****************")
          console.log(fResults[0].faces[0].videoPath)
          console.log("****************")
          lib.push({
            src: fResults[0].faces[0].videoPath,
            duration: getVideoDuration(
              fResults[0].faces[0].videoPath
            ),
          })
        }
      }

      /*fResults.forEach((obj, i) => {
        if (fs.statSync(obj.videoSrc).size < 200) {
          console.log("----------")
          console.log(fResults[i])
          console.log("----------")
          if (fResults[i].faces[0]) {
            lib.push({
              src: fResults[i].faces[0].videoPath,
              duration: getVideoDuration(
                fResults[i].faces[0].videoPath
              ),
            })
          }
        } else {
          lib.push({
            src: obj.videoSrc,
            duration: getVideoDuration(obj.videoSrc),
          })
        }
      })*/
      return results
      //return concat(compact(flatten(results).map(s => s.videoSrc)))
      /*return concat(compact(flatten(results).map(s => s.videoSrc)))
        .then((concatVideo) => {
          flatten(results).forEach(o => {
            fs.unlinkSync(o.customMedia.name)
            fs.unlinkSync(o.file)
            return concatVideo
          })
        })*/
    })
}

rimraf(SAVE_DIR, () => {
  try {
    fs.mkdirSync(SAVE_DIR)
  } catch (e) {}
  addToQueue([
    Q.map(
      IDS,
      result => {
        return cvVideo(result)
      },
      { concurrency: 1 }
    ),
  ])
  queue.start()
})

/*function download() {

    .then(results => {

      console.log(results);


      return Q.map(results, result => {
        return GetFacesFromClip(
          result, {
            doBackgrounds: false,
            minSecondsBetweenScenes: 1,
            fps: 0.05, //half the fps,
            outputDir: "output_frames",
            outputImageHeight: "480",
            imageExt: "png",
            lookbackSecs: 1
          }
        )
      }, {
        concurrency: 1
      })
    })
    .then(results => {

      console.log(results);

      results.forEach(scene => {})
    })
}*/
/*
function check() {
  splitVideo("gd.mp4")
    .then(videos => {
      return Q.map(videos, (video, i) => {
        return FacesFromVideo(video)
      }, { concurrency: 1 })
    })
}


download()
//check()*/
