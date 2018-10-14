const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const shortid = require('shortid');
const moment = require('moment');

const cors = require('cors');

const mongoose = require('mongoose');
mongoose.connect(process.env.MLAB_URI);
var Schema = mongoose.Schema;


var userSchema = new Schema({
  username: String,
  _id: {
    'type': String,
    'default': shortid.generate
  }
});

var exercise = new Schema({
  userId: String,
  description: String,
  duration: Number,
  date: Date
});

var User = mongoose.model('User',userSchema);
var Exercise = mongoose.model('Exercise', exercise);

app.use(cors());

app.use(bodyParser.urlencoded({extended: false}));
//app.use(bodyParser.json());


app.use(express.static('public'));
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


// Not found middleware
// app.use((req, res, next) => {
//   return next({status: 404, message: 'not found'})
// });

// // Error Handling middleware
// app.use((err, req, res, next) => {
//   let errCode, errMessage

//   if (err.errors) {
//     // mongoose validation error
//     errCode = 400 // bad request
//     const keys = Object.keys(err.errors)
//     // report the first validation error
//     errMessage = err.errors[keys[0]].message
//   } else {
//     // generic or custom error
//     errCode = err.status || 500
//     errMessage = err.message || 'Internal Server Error'
//   }
//   res.status(errCode).type('txt')
//     .send(errMessage)
// });



app.post('/api/exercise/new-user',function(req,res){
  var isAvailable = true;
  User.find({username:req.body.username},function(err,data){
    if (err) res.send('failed');
    else if (data.length==0) {
      var user = new User({username:req.body.username});
      user.save(function(err,data){
      if (err) console.log('error in save data');
      else {
        res.json({"username":req.body.username,"_id":data._id});
      } 
      });
    } else res.send('username already taken');
  });
});


app.post('/api/exercise/add',function(req,res) {
  User.find({_id:req.body.userId},function(err,data){
    if (err) res.send('failed');
    else if (data.length == 0) res.send('unknown _id');
    else {
      if (req.body.duration=="") res.send('Path `duration` is required.'); 
      else if (req.body.description=="") res.send('Path `description` is required.');
      else {
        var exercise = new Exercise({userId:req.body.userId,description:req.body.description,duration:req.body.duration,date:(req.body.date==""?new Date():new Date(req.body.date))});
        exercise.save(function(err,data){
          if (err) console.log('error in save data');
          else {
            res.json({"userId":data.userId,"description":data.description,"duration":data.duration,"date":data.date});
          }
        });
      }
    }
  });
});

app.get('/api/exercise/users',function(req,res){
  User.find({},function(err,data){
    var array = [];
    for (var i=0;i<data.length;i++) {
      array.push({"username":data[i].username,"_id":data[i]._id});
    }
    res.json(array);
  });
});

app.get('/api/exercise/log',function(req,res){
  if(!req.query.userId) res.send('unknown userId');
  else {
    User.find({_id: req.query.userId},function(err,data){
      if (data.length == 0) res.send('unknown userId');
      else {
        var userName = data[0].username;
        Exercise.find({userId:req.query.userId},function(err,data){
          var array = [];
          for (var i=0;i<data.length;i++){
            array.push(data[i]);
          }
          var isFrom = false;
          var isTo = false;
          var fromFilter;
          var toFilter;
          if (req.query.from) {
            isFrom = true;
            fromFilter = function(e){
              if (e.date < new Date(req.query.from)) return false;
              else return true;
            };
          }
          if (req.query.to) {
            isTo = true;
            toFilter = function(e){
              if (e.date > new Date(req.query.to)) return false;
              else return true;
            };
          }
          if (isFrom) {
            array = array.filer(fromFilter);
          }
          if (isTo) {
            array = array.filter(toFilter);
          }
          if (req.query.limit) {
            if (array.length > req.query.limit) array.length = req.query.limit;
          }
          res.json({"_id":req.query.userId,"username":userName,"count":array.length,"log":array});
        });
      }
    });
  }
});


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
});
