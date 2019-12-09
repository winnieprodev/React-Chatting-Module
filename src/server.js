// /server.js
const express = require('express');
const path = require('path');
const app = require('express')();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
var bodyParser = require('body-parser');
const multer = require('multer');
const storage = multer.diskStorage({
  destination: "./uploads/files/",
  filename: function(req, file, cb){
     cb(null,"FILE-" + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({storage:storage});
var db = new sqlite3.Database('charting.db');
// we will use port 8000 for our app
server.listen(8000, () => console.log('connected to port 8000!'));

db.serialize(function(){
    db.run('CREATE TABLE IF NOT EXISTS usergroup(name TEXT,users TEXT,created TEXT)');
    db.run("CREATE TABLE IF NOT EXISTS users(name TEXT,type TEXT)");
    db.run('CREATE TABLE IF NOT EXISTS chathistory(fromuser TEXT,touser TEXT,message TEXT,attachment TEXT,attachmentname TEXT,time DATETIME,state BOOLEAN,type TEXT)');
})

app.use(bodyParser.json({
    urlencoded:false
}))

// only use this for dev purposes
app.use(cors());
app.use(express.static('./'));

app.use('/getuser',function(req,res){
    db.serialize(function(){
        let users = [];
        db.all('Select name from users',function(err,row){
          if(err)
          {
            console.log(err);
          }
          
          res.send(row);    
        })        
    })
})

app.post('/upload',upload.single('attachfile'),function(req,res,next){
  if(req.file)
  {
    res.json(req.file);
  }
})

async function addchathistory(data)
{
  if(!data.attachment)
  {
    data.attachment = "";
    data.attachmentname = "";
  }

  if(data.type != 'group')
  {
    data.type = '';
  }

  return new Promise((resolve,reject)=>{
    db.serialize(function(){
      db.exec('insert into chathistory(fromuser,touser,message,attachment,attachmentname,time,state,type) Values("' + data.from + '","' + data.to + '","' + data.message + '","' + data.attachment + '","' + data.attachmentname + '",date("now"),false,"' + data.type + '")',function(err,row){
        if(!err)
        {
          resolve({success:true})
        }
        else{
          console.log(err);
          reject(err);
        }
      })
    })
  })
}

async function getchathistory(from,to,type)
{
   return new Promise((resolve,reject)=>{
    db.serialize(function(){
      let query = 'Select * from chathistory where (fromuser = "' + from + '" and touser = "' + to + '") or (fromuser = "' + to + '" and touser = "' + from + '")';
      console.log(type);
      if(type == 'group')
      {
        query = 'Select * from chathistory where touser = "' + to + '" and type = "'+ type + '"';
      }

      console.log(query);
      db.all(query,function(err,row){
        if(!err)
        {
          console.log(row);
          let list = [];
          for(let item in row)
          {
            list.push({from:row[item].fromuser,to:row[item].touser,message:row[item].message,attachment:row[item].attachment,attachmentname:row[item].attachmentname,type:row[item].type,time:row[item].time,state:row[item].state});
          }

          setenable(to,from);
          resolve(list);
        }
        else
        {
          console.log(err);
          reject(err);
        }
      })
    })
  })
}

async function addgroup(name,users,createdby)
{
  return new Promise((resolve,reject)=>{
    db.serialize(function(){
      db.all('Select * from usergroup where name = "' + name + '"',function(err,row){
        if(err)
        {
          console.log(err);
        }

        if(row.length > 0)
        {
          resolve({false:true})
        }
        else
        {
          db.run('insert into usergroup(name,users,created) values("' + name + '","' + users.join(',') + '","' + createdby + '")',async(e,group)=>{
            let data = await getuserandgroup();
            resolve({success:true,data:data})
          })
        }
      })
    })
  })
}

async function updategroup(updatename,data)
{
  return new Promise((resolve,reject)=>{
    console.log(updatename == data.name);
    console.log(data.name);
    db.serialize(function(){
      if(updatename != data.name)
      {
        db.all('Select * from usergroup where name = "' + data.name + '"',function(err,row){
          if(row.length == 0)
          {
            data.users = data.users.join(',');
            db.run('Update usergroup set name = "' + data.name + '",users = "' + data.users + '",created = "' + data.createdby + '" where name = "' + updatename + '"',(err,row)=>{
              resolve({success:true,data:{name:data.name,users:data.users,created:data.createdby}});
            })
          }
          else
          {
            console.log(row);
            resolve({success:false})
          }
        })
      }
      else
      {
        data.users = data.users.join(',');
        db.run('Update usergroup set name = "' + data.name + '",users = "' + data.users + '",created = "' + data.createdby + '" where name = "' + updatename + '"',(err,row)=>{
          resolve({success:true,data:{name:data.name,users:data.users,created:data.createdby}});
        })
      }
    })
  })
}

function getusers()
{
  return new Promise((resolve,reject)=>{
    db.serialize(function(){
      db.all('Select * from users',function(err,row){
        if(!err)
        {
          resolve(row);
        }
        else
        {
          reject(err)
        }
      })
    })
  })
}

function getgroup()
{
  return new Promise((resolve,reject)=>{
    db.serialize(function(){
      db.all('Select * from usergroup',function(err,row){
        if(err)
        {
          reject(err)
        }
        else
        {
        
          for(let item in row)
          {
            row[item].type = 'group';
          }
          resolve(row)
        }
      })
    })
  })
}

async function getuserandgroup()
{
  let users = await getusers();
  let group = await getgroup();

  return users.concat(group);
}

function addusers(name){
  return new Promise((resolve,reject)=>{
    db.serialize(function(){
      var query = 'Select name from users where name = "' + name + '"';
     
      db.all(query,async(err,row)=>{
        if(err)
        {
          console.log(err);
        }
        if(row.length == 0)
        {
          db.exec('insert into users(name) Values("' + name + '")',async(erruser,rowuser)=>{
            let user_group = await getuserandgroup();
            resolve(user_group);
          })
        }
        else
        {
          let user_group = await getuserandgroup();
          resolve(user_group);
        }
      })
      
    })
  })
}

function setenable(from,to){
  console.log('from',from);
  console.log('to',to);
  db.serialize(function(){
    db.run('Update chathistory set state = true where fromuser = "' + from + '" and touser = "' + to + '"',function(err,row){
      if(err)
      {
        console.log(err);
      }
    });
  })    
}

function gethistory(to) {
  return new Promise((resolve,reject)=>{
    db.serialize(function(){
      db.all('Select fromuser,Count(*) as count from chathistory where touser = "' + to + '" and state != true and type != "group" group by fromuser',function(err,row){
        console.log(row);
        resolve(row);
      })
     
    })
  })
}

let pot = 0;
let names = [];
let serverNames = [];
io.on('connection', socket => {
  
  // below we listen if our pot is updated
  // then emit an event to all connected sockets about the update
  socket.on('joinchat',async(state)=>{
    let userslist = await addusers(state);
    let user = await getusers();
    let datahistory = await gethistory(state);
    console.log(userslist);
    socket.emit('joinchat',{me:state,userslist:userslist,user:user,datahistory:datahistory});
    io.sockets.emit('joinchat',{userslist:userslist,user:user})
  })

  socket.on('creategroup',async(state)=>{
    let data = await addgroup(state.name,state.users,state.createdby);
    socket.emit('creategroup',{success:data.success});
    if(data.data)
    {
      io.sockets.emit("creategroup",{data:data.data})
    }
  })

  socket.on('updategroup',async(state)=>{
    let data = await updategroup(state.updatename,state.data);
    if(data.success)
    {
      io.sockets.emit('updategroup',{success:true,updatename:state.updatename,data:data.data})
    }
    else
    {
      socket.emit("updategroup",{success:false});
    }
    
  })

  socket.on('receivedmessage',async(state)=>{
    setenable(state.from,state.to);
  })
  socket.on('sendmessage',async(data)=>{
    let messageentry = data;
    await addchathistory(data);
    let datahistory = await gethistory(data.to);
    console.log(datahistory);
    //setenable(data.to,data.from);
    console.log(messageentry)
    io.sockets.emit('sendmessage',{message:messageentry,datahistory:datahistory});
  })

 
  socket.on('selectuser',async(data)=>{
    var chathistory = await getchathistory(data.from,data.to,data.type);
    let datahistory = await gethistory(data.from);
    console.log(chathistory);
    socket.emit('selectuser',{message:chathistory,datahistory:datahistory});
  })


  socket.on('UPDATE_POT', state => {
    pot = state.pot;
    socket.broadcast.emit('UPDATED_POT', state);
  });

  // get the current pot's value and emit it to clients
  socket.on('GET_CURRENT_POT', () => socket.emit('CURRENT_POT', pot));

  // add the newest client to the list of active clients
  // then broadcast that to all connected clienhts 
  socket.on('SEND_NAME_TO_SERVER', name => {
    serverNames = [...serverNames, { socketId: socket.id, name }];
    names = [...names, name];
    socket.broadcast.emit('SEND_NAMES_TO_CLIENTS', names);
    socket.emit('SEND_NAMES_TO_CLIENTS', names);
  });

  // broadcast to everyone if somebody pitched in
  socket.on('SOMEONE_PITCHED_IN', name => {
    socket.broadcast.emit('GUESS_WHO_PITCHED_IN', name);
  });

  // broadcast to everyone if somebody got one
  socket.on('SOMEONE_GOT_ONE', name => {
    socket.broadcast.emit('GUESS_WHO_GOT_ONE', name);
  });


  // this is to make sure that when a client disconnects
  // the client's name will be removed from our server's list of names
  // then broadcast that to everybody connected so their list will be updated
  socket.on('disconnect', () => {
    serverNames = serverNames.filter(data => data.socketId !== socket.id);
    names = serverNames.map(data => data.name);
    socket.broadcast.emit('SEND_NAMES_TO_CLIENTS', names);
    socket.emit('SEND_NAMES_TO_CLIENTS', names);
  });
});