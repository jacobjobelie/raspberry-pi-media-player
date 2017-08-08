require("dotenv").config()
var YouTube = require("youtube-node")
var youTube = new YouTube()
youTube.setKey(process.env.YT)

const API = {
  related: youTube.related,
  getPlayListsItemsById: youTube.getPlayListsItemsById,
}

module.exports = API
