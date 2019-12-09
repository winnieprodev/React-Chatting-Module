import React, { Component } from 'react';
import {Row,Col, Popover, Button, Dropdown, Input, Label,InputGroup, InputGroupText, InputGroupAddon, FormGroup, Modal, ModalHeader, ModalBody, ModalFooter} from 'reactstrap';
import './styles.css';
import 'bootstrap/scss/bootstrap.scss';
import attachedicon from './attachment.png';
import axios from 'axios';
import { Scrollbars } from 'react-custom-scrollbars';
import {Typeahead} from 'react-bootstrap-typeahead';
import io from 'socket.io-client';
// import 'font-awesome/css/font-awesome.css';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faPaperclip, faTimes} from '@fortawesome/free-solid-svg-icons';
import {connect} from 'react-redux';
import $ from 'jquery';
import Moment from 'moment';
import {Smile} from 'react-feather';
import {Picker} from 'emoji-mart';

import 'emoji-mart/css/emoji-mart.css';

const socket = io('http://localhost:8000');

class ChatMain extends React.Component {
    input = {};
    selected = [];
    constructor(props){
        super(props);
        this.state = {
            modal: false,
            send:[],
            data:'',
            users:[],
            me:'',
            userslist:[],
            userlist:[],
            selecteduser:"",
            messages:[],
            attachmentfile:false,
            selectableuser:[],
            grouplist:[],
            updategroup:false,
            updategroupname:"",
            emojiselect:false,
            count:{}
        };

        this.toggle = this.toggle.bind(this);
    }

    toggle() {
        this.groupname = "";
        this.setState(prevState => ({
          modal: !prevState.modal,
          grouplist:[],
          updategroup:false
        }));
    }

    addemoji = (emoji) => {
        let data = this.state.data;
        data+= emoji.native;
        this.setState({
            data:data,
            emojiselect:false
        })
    }

    setgrouplist = (user)=>{

        if(this.state.me)
        {
            if(user.length == 0)
            {
                return;
            }

            let userlist = this.state.grouplist;
            
            if(!userlist.indexOf(user[0].name) > -1)
            {
                userlist.push(user[0].name);
            }

            this.setState({
                grouplist:userlist
            })
        }
    }

    addgroup = () => {
        let data = {};
        data.name = this.groupname;
        data.users = this.state.grouplist;

        if(data.users.indexOf(this.state.me) == -1)
        {
            data.users.push(this.state.me);
        }

        data.createdby = this.state.me;
        if(!this.state.updategroup)
        {
            socket.emit('creategroup',data);
        }
        else
        {
            socket.emit('updategroup',{updatename:this.state.updategroupname,data:data});
        }
    }

    handleKey = (e) => {        
        if(e.keyCode == 13)
        {
            this.sendmessage();
            let self = this;
            window.setTimeout(()=>{
                self.setState({
                    data:""
                })
            })
        }
       
    }

    componentDidMount()
    {
        let self = this;
        socket.on('connected',()=>{
            console.log('connected');
        })

        socket.on('joinchat',state=>{
            console.log(state);
            let datahistory = state.datahistory;
            let userslist = state.user;
            let usersarray = [];
            for(let item in userslist)
            {
                userslist[item].label = userslist[item].name;
                if(!self.state.me || userslist[item].name != self.state.me)
                {
                    usersarray.push(userslist[item]);
                }
            }

            let userandgroup = [];
            let groupusers = state.userslist;
            
            for(let item in groupusers)
            {
                if(groupusers[item].type == 'group')
                {
                    groupusers[item].label = groupusers[item].name + ' (GROUP)';
                }
                else
                {
                    groupusers[item].label = groupusers[item].name;
                }

                if(!self.state.me || (groupusers[item].type == 'group' && groupusers[item].users.split(',').indexOf(self.state.me) > -1) | (groupusers[item].type != 'group' && groupusers[item].name != self.state.me))
                {
                    userandgroup.push(groupusers[item]);
                }
            }

            let datahistory_user = {};
            for(let item in datahistory)
            {
                datahistory_user[datahistory[item].fromuser] = datahistory[item].count;
            }

            if(!this.state.me)
            {
                self.setState({
                    me:state.me,
                    users:usersarray,
                    selectableuser:userandgroup,
                    count:datahistory_user
                })
            }
            else
            {
                self.setState({
                    users:usersarray,
                    selectableuser:userandgroup
                })
            }  
        })

        socket.on('sendmessage',state => {
            let datahistory = state.datahistory;
            let messageentity = state.message;

            if((messageentity.from == self.state.me && messageentity.to == self.state.selecteduser.name) || (messageentity.to == self.state.me && messageentity.from == self.state.selecteduser.name) || (messageentity.type == 'group' && self.state.selecteduser.type == 'group'))
            {
                if(self.state.me == messageentity.from)
                {
                    socket.emit('receivedmessage',{from:messageentity.from,to:messageentity.to});
                }
                
                let message = self.state.messages;
                messageentity.time = Moment(new Date()).format('YYYY-MM-DD hh:mm');
                console.log('messageentry',messageentity);
                message.push(JSON.parse(JSON.stringify(messageentity)));
                
                console.log(message);
                self.setState({
                    messages:message,
                    emojiselect:false
                })
            }
            if(messageentity.to = self.state.me)
            {
                let datahistoryuser = {};
                for(let item in datahistory)
                {
                    datahistoryuser[datahistory[item].fromuser] = datahistory[item].count;
                }
                self.setState({
                    count:datahistoryuser
                })
            }

        })

        socket.on('selectuser',state=>{
            console.log('user',state);
            let datahistory = state.datahistory;

            let datauser = {};

            for(let item in datahistory)
            {
                datauser[datahistory[item].fromuser] = datahistory[item].count;
            }

            self.setState({
                messages:state.message,
                emojiselect:false,
                count:datauser
            })
        })

        axios.get('http://localhost:8000/getuser').then(result=>{
            let users = [];
            result  = result.data;
            for(let item in result)
            {
                result[item].label = result[item].name;
            }
            self.setState({
                users:result
            })
        })

        socket.on('creategroup',state=>{
            if(state.success)
            {
                self.toggle();                
            }

            if(state.data)
            {
                let groupusers = state.data;
                let userandgroup  = [];

                for(let item in groupusers)
                {
                    if(groupusers[item].type == 'group')
                    {
                        groupusers[item].label = groupusers[item].name + ' (GROUP)';
                    }
                    else
                    {
                        groupusers[item].label = groupusers[item].name;
                    }
    
                    if(!self.state.me || (groupusers[item].type == 'group' && groupusers[item].users.split(',').indexOf(self.state.me) > -1) | (groupusers[item].type != 'group' && groupusers[item].name != self.state.me))
                    {
                        userandgroup.push(groupusers[item]);
                    }
                }
                self.setState({
                    selectableuser:state.data
                })
            }
        })

        socket.on('updategroup',state=>{
            console.log('updategroup',state);
            if(state.success)
            {
                if(state.data.created == self.state.me)
                {
                    self.toggle();
                }

                let users = self.state.selectableuser;
                for(let item in users)
                {
                  if(users[item].type == 'group' && users[item].name == state.updatename)
                  {
                      users[item] = state.data;
                      users[item].type = 'group';
                      users[item].label = users[item].name + ' (GROUP)';
                      if(users[item].users.split(',').indexOf(self.state.me) == -1)
                      {
                        users.splice(item,1);
                        break;
                      }
                  }  
                }

                let userlist = self.state.userslist;
                for(let item in userlist)
                {
                  if(userlist[item].type == 'group' && userlist[item].name == state.updatename)
                  {
                    userlist[item] = state.data;
                    userlist[item].type = 'group';
                    userlist[item].label = userlist[item].name + ' (GROUP)';
                    if(userlist[item].users.split(',').indexOf(self.state.me) == -1)
                    {
                        userlist.splice(item,1);
                        break;
                    }
                  }  
                }

                let selecteduser = self.state.selecteduser;
                console.log('selecteduser',selecteduser);
                if(selecteduser.type == 'group' && selecteduser.name == state.updatename)
                {
                    selecteduser = state.data;
                    selecteduser.label = state.data.name + ' (GROUP)';

                    if(selecteduser.users.split(',').indexOf(self.state.me) == -1)
                    {
                        selecteduser = false;
                    }
                }
                this.setState({
                    selectableuser:users,
                    selecteduser:selecteduser,
                    userslist:userlist
                })
            }
        })
        const {dispatch} = this.props;
    }

    
    send = () => {
        socket.emit('sendmessage',{from:this.state.me,to:this.state.selecteduser.name,message:this.state.data,type:this.state.selecteduser.type})
        
    }

    handleChange = (name,value) => {
        this.input[name] = value;
    }

    joinchat = () => {
        if(this.input.name)
        {
            socket.emit('joinchat',this.input.name);
        }   
    }

    checkuser = (selected) => {
        for(let item in this.state.userslist)
        {
            if(this.state.userslist[item].name == selected.name && this.state.userslist[item].type == selected.type)
            {
                return true;
            }
        }

        return false;
    }

    setuserlist = (selected) => {
        console.log('selected',selected);
        this.selected  = [];
        var namelist = this.state.userslist;
        if(selected.length == 0)
        {
            return;
        }

       if(!this.checkuser(selected[0]))
       {
            namelist.push(selected[0]);
       }

       if(selected[0].type == 'group')
       {
            if(selected[0].created == this.state.me)
            {
                this.groupname = selected[0].name;
                let grouplist = selected[0].users.split(',');
                
                this.setState({
                    updategroup:true,
                    modal:true,
                    grouplist:grouplist,
                    updategroupname:selected[0].name,
                    emojiselect:false
                })
            }
       }

        this.setState({
            selected:selected[0],
            userslist:namelist,
            emojiselect:false
        })
    }
    
    selectuser = (user) => {
        socket.emit('selectuser',{from:this.state.me,to:user.name,type:user.type});
        this.setState({
            selecteduser:user,
            attachmentfile:false,
            emojiselect:false
        });
    }

    selectemoji = () =>{
        this.setState({emojiselect:!this.state.emojiselect})
    }

    sendmessage = () => {
        if(this.state.selecteduser && this.state.me)
        {
            if(this.state.attachmentfile)
            {
                let self = this;
                var formdata = new FormData();
                formdata.append('attachfile',this.state.attachmentfile);
                axios.post('http://localhost:8000/upload',formdata,{headers:{'content-type':'multipart/form-data'}}).then(res=>{
                    if(res.data)
                    {
                        var attachmentfile = 'http://localhost:8000/' + res.data.path;
                        var attachmentname = res.data.originalname;

                        socket.emit('sendmessage',{from:self.state.me,to:self.state.selecteduser.name,message:self.state.data,attachment:attachmentfile,attachmentname:attachmentname,type:self.state.selecteduser.type})
                        self.setState({
                            data:"",
                            attachmentfile:false,
                            emojiselect:false
                        })
                    }
                })
            }
            else
            {
                socket.emit('sendmessage',{from:this.state.me,to:this.state.selecteduser.name,message:this.state.data,type:this.state.selecteduser.type})
                this.setState({data:"",emojiselect:false})
            }
            
        }
        
    }

    deletelist = (index) => {
        let namelist = this.state.userslist;
        namelist.splice(index,1);
        this.setState({
            userslist:namelist,
            emojiselect:false
        })
    }

    handleChangeMessage = (message) => {
        this.setState({
            data:message
        })
    }

    clickattachment = () => {
        if(this.state.selecteduser)
        {
            $('#exampleFile').click();
        }
    }

    changeattach = (e) => {
        console.log("attachmentfile",e.target.files[0]);
        this.setState({
            attachmentfile:e.target.files[0],
            emojiselect:false
        })
    }
    
    deleteuserfromgroup = (index) => {
        let userlist = this.state.grouplist;
        userlist.splice(index,1);

        this.setState({
            grouplist:userlist
        })
    }

    render(){
        let self = this;
        return(
            <div className = "mainFrame">
                
                {
                    !this.state.me && (
                        <Col lg={12}>
                            <Row>
                                <Col lg={8} sm={8} md={8} xs={12}>
                                    <Typeahead 
                                        options={this.state.users}
                                        labelKey="label"
                                        placeholder="Type In Name"
                                        id="name"
                                        onInputChange={(value)=>this.handleChange('name',value)}
                                        onChange={(selected)=>{selected.length > 0 && this.handleChange('name',selected[0].name)}}
                                    ></Typeahead>
                                </Col>
                                <Col lg={4} sm={4} md={4} xs={12}>
                                    <Button color="primary" onClick={this.joinchat}>Join chat</Button>
                                </Col>
                            </Row>
                        </Col>
                    )
                }
                {
                    this.state.me && (                 
                    <Col>
                        <Row>
                            <Col>
                                <Row className= "chatHeader">
                                    <Label className = "chatBoxTitle">Chat ({this.state.me})</Label>
                                </Row>
                                <Row className = "searchBox">
                                    <Col>
                                        <InputGroup>
                                            <Typeahead placeholder="Search User and Groups..." options={this.state.selectableuser} labelKey="label" id="name" onChange={(selected)=>this.setuserlist(selected)} defaultSelected={this.selected}/>
                                            <InputGroupAddon addonType="append">
                                            <InputGroupText>Search</InputGroupText>
                                            </InputGroupAddon>
                                        </InputGroup>
                                    </Col>
                                </Row>
                                <Row className = "createButtonContainer">
                                    <Button className = "createButton" onClick={this.toggle}>Create Group</Button>
                                </Row>
                                <Row className = "chatListContainer">
                                    <ul className = "chatList">
                                    {
                                        this.state.userslist.map((row,index)=>{
                                            if(!this.state.selecteduser || (row.name != this.state.selecteduser.name || row.type != this.state.selecteduser.type))
                                            {
                                                return (
                                                    <li key={index} className = "chatListItem">
                                                        <span className = "chatListItemTitle" onClick={()=>this.selectuser(row)}>
                                                            {row.label} {
                                                                this.state.count[row.name] && (<span className="count">{this.state.count[row.name]}</span>)}
                                                        </span>
                                                        <Button color="danger" className= "deleteMemberButton" onClick={()=>this.deletelist(index)}>X</Button>
                                                    </li>        
                                                )
                                            }
                                        })
                                    }
                                    {
                                        this.state.selecteduser && (
                                            <li className = "chatListItem">
                                                <span className = "chatListItemTitle">{this.state.selecteduser.label}</span>
                                            </li>  
                                        )
                                    }
                                    </ul>
                                    {/* <ul className = "chatList">
                                        <li className = "chatListItem">
                                            <span className = "chatListItemTitle">Group Chat A</span>
                                            <Button color="danger" className= "deleteMemberButton">X</Button>
                                        </li>
                                        <li className = "chatListItem">
                                            <span className = "chatListItemTitle">User 1</span>
                                            <Button color="danger" className= "deleteMemberButton">X</Button>
                                        </li>
                                        <li className = "chatListItem">
                                            <span className = "chatListItemTitle">User 2</span>
                                            <Button color="danger" className= "deleteMemberButton">X</Button>
                                        </li>
                                    </ul> */}
                                </Row>
                                <div>
                                    <Scrollbars ref = "scroll" style={{ width: '100%', height: 440 }} autoHide autoHideTimeout={1000} autoHideDuration={200} thumbMinSize={30}>
                                        {
                                            this.state.messages.map((row,index)=>{
                                                return (
                                                    <Row>
                                                        {
                                                            (row.to == self.state.me || (row.type == 'group' && row.from != self.state.me)) && (
                                                                <div style={{paddingLeft:15}}>{row.from}</div>
                                                            )
                                                        }
                                                        <Col lg={12}>
                                                            <Row className = {((row.to == self.state.me && row.from == self.state.selecteduser.name) || (row.type == 'group' && this.state.selecteduser.users && this.state.selecteduser.users.split(',').indexOf(row.from) > -1 && this.state.me != row.from))?"receivedMessageContainer":"sentMessageContainer"}>
                                                                <span className={((row.to == self.state.me && row.from == self.state.selecteduser) || (row.type == 'group' && row.from != this.state.me && this.state.selecteduser))?"receivedMessage":"sentMessage"}>
                                                                    {
                                                                        row.message
                                                                    }
                                                                </span>
                                                                {
                                                                    row.attachment && (
                                                                        <Col lg={12}>
                                                                            <Row>
                                                                                <Col>
                                                                                    <p className = "sentFileName">
                                                                                    {row.attachmentname}
                                                                                    </p>
                                                                                </Col>
                                                                                <Col>
                                                                                    <a href={row.attachment} target="blank">
                                                                                        <img src={attachedicon}></img>
                                                                                    </a>
                                                                                </Col>
                                                                            </Row>
                                                                        </Col>
                                                                    )
                                                                }
                                                                
                                                            </Row>
                                                            <Row style={{paddingLeft:15,textAlign:'right',width:'100%'}}>
                                                                <div style={{marginLeft:((row.to == self.state.me && row.from == self.state.selecteduser.name) || (row.type == 'group' && this.state.selecteduser.users && this.state.selecteduser.users.split(',').indexOf(row.from) > -1 && this.state.me != row.from))?0:'auto'}}>{row.time}</div>
                                                            </Row>   
                                                        </Col>
                                                    </Row>
                                                             
                                                )
                                            })
                                        }
                                        {/* <Row className = "receivedMessageContainer">
                                            <span className = "receivedMessage">
                                            Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis
                                            nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
                                            </span>
                                        </Row>
                                        <Row className = "sentMessageContainer">
                                            <span className = "sentMessage">
                                            Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, 
                                            sunt in culpa qui officia deserunt mollit anim id est laborum.
                                            </span>
                                        </Row>
                                        <Row className = "sentFileContainer">
                                            <Col>
                                                <p className = "sentFileName">
                                                Attachment.pdf
                                                </p>
                                            </Col>
                                            <Col>
                                                <img src={attachedicon}></img>
                                            </Col>
                                        </Row>
                                        {
                                            this.state.send.map((row,index)=>{
                                                return (
                                                    <Row className = "sentMessageContainer">
                                                        <span className = "sentMessage">
                                                        {row}
                                                        </span>
                                                    </Row>
                                                )
                                            })
                                        }
                                     */}
                                    </Scrollbars>
                                </div>
                                {
                                    self.state.emojiselect && (
                                        <Picker set="emojione" onSelect={this.addemoji}></Picker>
                                    )
                                }
                                <Row className = "sendMessageFieldContainer">
                                    
                                    
                                    <Col lg = {8} md = {8} sm = {8}>
                                        <FormGroup row>
                                            {
                                                this.state.attachmentfile && (
                                                    <Col lg={12} className="attachmentfile">
                                                        {this.state.attachmentfile.name}
                                                        <FontAwesomeIcon icon={faTimes} style={{float:'right'}} className="attachmentdelete" onClick={()=>this.setState({attachmentfile:false})}></FontAwesomeIcon>
                                                    </Col>
                                                )
                                            }
                                            <Col lg={12}>
                                                <InputGroup>
                                                    <InputGroupAddon addonType="append" onClick={this.selectemoji}>
                                                        <InputGroupText><Smile/></InputGroupText>
                                                    </InputGroupAddon>
                                                    <Input type="textarea" onKeyDown={(e)=>this.handleKey(e)} name="text" className= "sendMessageField" onChange={(e)=>this.handleChangeMessage(e.target.value)} value={this.state.data}/>
                                                </InputGroup>
                                                
                                            </Col>
                                            
                                        </FormGroup>
                                    </Col>
                                    <Col lg = {4} md = {4} sm = {4} style={{paddingRight:0}}>
                                        <Row className = "sendButtonContainer" style={{paddingLeft:0,alignItems:'center'}}>
                                            <Col>
                                                <Button color="success" style={{padding:2,width:20,marginRight:5}} onClick={this.clickattachment}>
                                                    <FontAwesomeIcon icon={faPaperclip}>
                                                    </FontAwesomeIcon>
                                                    <Input ref="examplefile" type="file" name="file" id="exampleFile" style={{opacity:0,height:0}} onChange={(e)=>this.changeattach(e)}/>
                                                </Button>
                                                <Button className = "sendButton" onClick={this.sendmessage}>SEND</Button>
                                            </Col>
                                            
                                        </Row>
                                        {/* <Row className = "attachButtonContainer">
                                            <Input type="file" name="file" id="exampleFile" />
                                        </Row> */}
                                    </Col>
                                </Row>
                            
                            </Col>
                        </Row>
                    </Col>
                    )
                }

                {/* Create New Group Modal Start */}

                <Modal isOpen={this.state.modal} toggle={this.toggle} className={this.props.className}>
                    <ModalHeader toggle={this.toggle}>New Group</ModalHeader>
                    <ModalBody>
                        <Row className = "searchBox">
                            <Col lg={12}>
                                <InputGroup>
                                    <InputGroupAddon addonType="prepend">Name</InputGroupAddon>
                                    <Input placeholder="username" onChange={(e)=>this.groupname = e.target.value} defaultValue={this.groupname}/>
                                </InputGroup>
                            </Col>
                            
                            <Col lg={12} style={{marginTop:10}}>
                                <InputGroup>
                                    <Typeahead placeholder="Search Users ..." options={this.state.users} labelKey="label" id="name" onChange={(selected)=>this.setgrouplist(selected)}/>   
                                    <InputGroupAddon addonType="append">
                                    <InputGroupText>Search</InputGroupText>
                                    </InputGroupAddon>
                                </InputGroup>
                            </Col>

                            <div className = "createGroupContainer" style={{marginTop:10}}>
                                <Col>
                                    <Row>
                                        <Col>
                                            <Row className= "chatHeader">
                                                <Label className = "chatBoxTitle">Memeber List</Label>
                                            </Row>
                                            <Row className = "createGroupChatListContainer">
                                                <ul className = "chatList">
                                                    {
                                                        this.state.grouplist.map((row,index)=>{
                                                            return (
                                                                <li className = "chatListItem">
                                                                    <span className = "chatListItemTitle">{row}</span>
                                                                    <Button color="danger" className= "deleteMemberButton" onClick={()=>this.deleteuserfromgroup(index)}>X</Button>
                                                                </li>            
                                                            )
                                                        })
                                                    }
                                                </ul>
                                            </Row>
                                        </Col>
                                    </Row>
                                </Col>
                            </div>
                        </Row>
                    </ModalBody>
                    <ModalFooter>
                        <Button color="secondary" onClick={this.toggle} className="cancelbtn">Cancel</Button>
                        <Button color="primary" onClick={this.addgroup}>OK</Button>
                    </ModalFooter>
                </Modal>

                {/* Create New Group Modal End */}
            </div>
            
        )
    }
}

const mapDispatchProps = dispatch => ({
  me:()=>dispatch({type:'SelectMe'}),
  userslist:()=>dispatch({type:'userslist'})
});

export default ChatMain;