// /src/App.js

import React, { Component } from 'react';

import { connect } from 'react-redux';
import { getAName } from './usernames';
import ChatMain from './ChatMain';

class App extends Component {
  componentDidMount() {
    // const { dispatch } = this.props;
    // const name = getAName();
    // when our app mounts, it should always be updated of the pot's
    // current value
    // getCurrentPot(dispatch);
    // put this socket's username inside the server
    // dispatch({ type: 'ASSIGNED_USERNAME', name });
    // sendNameToServer(name);
  }

  // snackbar handler
  closeSnackbar = () => this.props.dispatch({ type: 'ANOTHER_ONE_PITCHED_IN' });

  // event handler when the get one button is clicked
  // sends the event to the server so every one
  // connected will be updated
  // getOne = () => {
  //   const { dispatch, name } = this.props;
  //   dispatch({ type: 'GET_ONE' });
  //   sendGetOneToServer(name);
  // };

  // // event handler when the pitch in button is clicked
  // // sends the event to the server so every one
  // // connected will be updated
  // pitchIn = () => {
  //   const { dispatch, name } = this.props;
  //   dispatch({ type: 'PITCH_IN' });
  //   sendPitchInToServer(name);
  // };

  render() {
    const { pot, name, names, snackbarIsOpen, mode, whoDidIt } = this.props;
    return (
      <div className="container">
        <ChatMain />
      </div>
    );
  }
}

// const mapStateToProps = state => ({
//   pot: state.pot,
//   name: state.name,
//   names: state.names,
//   snackbarIsOpen: state.snackbarIsOpen,
//   mode: state.mode,
//   whoDidIt: state.whoDidIt
// });

export default App;