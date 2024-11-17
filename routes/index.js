var express = require('express');
var router = express.Router();
const userModel = require("./users");
const postModel = require("./post");
const storyModel = require("./story");
const passport = require("passport");
const localStrategy = require("passport-local");
const upload = require("./multer");

passport.use(new localStrategy(userModel.authenticate()));

router.get('/', function(req, res, next) {
  res.render('index', { footer: false });
});

router.get('/login', function(req, res, next) {
  res.render('login', { footer: false });
});

router.get('/feed', isLoggedIn, async function(req, res, next) {
  let user = await userModel
    .findOne({ username: req.session.passport.user })
    .populate("posts");

  const posts = await postModel.find().populate("user");
  let stories = await storyModel.find({ user: { $ne: user._id } })

  var uniq = {};
  var filtered = stories.filter(item => {
    if(!uniq[item.user.id]){
      uniq[item.user.id] = " ";
      return true;
    }
    else return false;
  })

  res.render('feed', { footer: true ,user, posts, stories: filtered});
});

router.get('/profile', isLoggedIn, async function(req, res, next) {
  const user = await userModel.findOne({username: req.session.passport.user}).populate("posts");
  res.render('profile', { footer: true, user });
});

router.get('/search', isLoggedIn, async function(req, res, next) {
  let user = await userModel.findOne({username: req.session.passport.user});
  res.render('search', { footer: true, user });
});

router.get('/like/post/:id', isLoggedIn, async function(req, res, next) {
  const user = await userModel.findOne({username: req.session.passport.user});
  const post = await postModel.findOne({_id: req.params.id});

  if(post.likes.indexOf(user._id) === -1){
    post.likes.push(user._id);
  }
  else{
    post.likes.splice(post.likes.indexOf(user._id), 1);
  }
  await post.save();
  res.redirect("/feed");
});

router.post(
  "/post",
  isLoggedIn,
  upload.single("image"),
  async function (req, res) {
    const user = await userModel.findOne({
      username: req.session.passport.user,
    });

    if (req.body.category === "post") {
      const post = await postModel.create({
        user: user._id,
        caption: req.body.caption,
        picture: req.file.filename,
      });
      user.posts.push(post._id);
    } else if (req.body.category === "story") {
      let story = await storyModel.create({
        story: req.file.filename,
        user: user._id,
      });
      user.stories.push(story._id);
    } else {
      res.send("tez mat chalo");
    }

    await user.save();
    res.redirect("/feed");
  }
);


router.get('/edit', isLoggedIn, async function(req, res, next) {
  const user = await userModel.findOne({username: req.session.passport.user});
  res.render('edit', { footer: false, user });
});

router.get('/upload', isLoggedIn, function(req, res, next) {
  res.render("upload", { footer: false});
});

router.get('/username/:username', isLoggedIn, async function(req, res, next) {
  const regex = new RegExp(`^${req.params.username}`, 'i');
  const users = await userModel.find({username: regex}); 
  res.json(users);
});

router.post("/register", function (req, res, next) {
  const user = new userModel({
    username: req.body.username,
    email: req.body.email,
    name: req.body.name,
  });

  userModel.register(user, req.body.password)
  .then(function () {
    passport.authenticate("local")(req, res, function () {
      res.redirect("/profile");
    });
  });
});

router.post('/login', passport.authenticate("local", {
  successRedirect: "/profile",
  failureRedirect: "/login"
}), function(req, res, next) { });

router.get('/logout', function(req, res, next) {
  req.logout(function(err){
    if(err) {return next(err);}
    res.redirect("/");
  })
});

function isLoggedIn(req, res, next){
  if(req.isAuthenticated()) return next();
  res.redirect("/login");
}

router.post("/update", upload.single('image'), async function(req, res, next){
  const user = await userModel.findOneAndUpdate(
    {username: req.session.passport.user},
    {username: req.body.username, name: req.body.name, bio: req.body.bio},
    {new: true}
  );

  if(req.file){
    user.profileImage = req.file.filename;
  }
  await user.save();
  res.redirect("/profile");
});

router.post('/upload', isLoggedIn, upload.single('image'), async function(req, res, next) {
  const user = await userModel.findOne({username: req.session.passport.user});
  const post = await postModel.create({
    picture: req.file.filename,
    user: user._id,
    caption: req.body.caption
  })

  user.posts.push(post._id);
  await user.save();
  res.redirect("/feed");
});

module.exports = router;
