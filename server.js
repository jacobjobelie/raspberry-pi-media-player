var express = require("express"),
  bodyParser = require("body-parser"),
  logger = require("morgan"),
  app = express(),
  template = require("jade").compileFile(
    __dirname + "/source/templates/homepage.jade"
  )

app.use(logger("dev"))
app.use(bodyParser.json())
app.use(express.static(__dirname + "/static"))

const MEDIA = require("./src/media")
const media = MEDIA()

var urlencodedParser = bodyParser.urlencoded({ extended: false })

app.get("/", function(req, res, next) {
  try {
    var html = template({ title: "Home" })
    res.send(html)
  } catch (e) {
    next(e)
  }
})

app.post("/add", urlencodedParser, function(req, res, next) {
  console.log(req.body)
  media.add(req.body.youtube)
  res.redirect(301, "/")
})

app.listen(process.env.PORT || 3000, function() {
  console.log(
    "Listening on http://localhost:" + (process.env.PORT || 3000)
  )
})
