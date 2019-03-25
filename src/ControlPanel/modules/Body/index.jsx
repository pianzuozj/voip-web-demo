import React, { Component } from 'react';
import styles from './index.module.less';
import Account from './Account';
import PhoneNumbers from './PhoneNumbers';
import { SessionConsumer } from '../../../SessionContext'

class Body extends Component {
  render() {
    return (
      <SessionConsumer>
        {({ login, logout, serviceState, callState, startCall, serviceError, retry, mediaEnabled }={}) => (
        <div className={styles.demoBody}>
          <Account serviceState={serviceState} login={login} logout={logout} serviceError={serviceError} retry={retry} mediaEnabled={mediaEnabled}/>
          <PhoneNumbers serviceState={serviceState} callState={callState} startCall={startCall} />
        </div>)}
      </SessionConsumer>
    )
  }
}

export default Body;
