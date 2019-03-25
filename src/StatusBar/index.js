import React, { Component } from 'react';
import classNames from 'classnames';
import styles from './index.module.less';
import Timer from 'react-compound-timer'
import {CallState, NetworkQuality} from '../constants'
import Button from '../components/Button'
import Icon from '../components/Icon'
import Toast from '../components/Toast'

const CallStateIndicatorMapping = {
  [CallState.IDLE]: {
    className: styles.callState_idle,
    icon: '',
    text: '已断开',
  },
  [CallState.ACTIVE]: {
    className: styles.callState_active,
    icon: 'call-active',
    text: '通话中',
  },
  [CallState.CONNECTING]: {
    className: styles.callState_connecting,
    icon: 'call-connecting',
    text: '呼叫中',
  },
  [CallState.RINGING]: {
    className: styles.callState_ringing,
    icon: 'call-ringing',
    text: '振铃中',
  },
}

const networkQualityIndicatorMapping = {
  [NetworkQuality.LOW]: {
    className: styles.signalStateSymbol_low,
    text: '差',
  },
  [NetworkQuality.MEDIUM]: {
    className: styles.signalStateSymbol_medium,
    text: '中',
  },
  [NetworkQuality.HIGH]: {
    className: styles.signalStateSymbol_high,
    text: '优',
  },
}

class StatusBar extends Component {
  render() {
    const { callState, calleeNumber, networkQuality, calleeName, calleeAvatar, mute } = this.props
    const callStateIndicator = CallStateIndicatorMapping[callState]
    const networkIndicator = networkQualityIndicatorMapping[networkQuality]
    return (
      <div className={classNames(styles.statusBar, { [styles.statusBarHide]: callState === CallState.IDLE })}>
        <div className={styles.callee}>
          <img
            className={styles.calleeAvatar}
            alt={calleeName}
            src={calleeAvatar}
          />
          <div className={styles.calleeCardName}>
            <div className={styles.calleeTitle}>{calleeName}</div>
            <div className={styles.calleeNumber}>{calleeNumber}</div>
          </div>
        </div>
        <div className={classNames([
          styles.callState,
          callStateIndicator.className,
        ])}>
          <div className={styles.callStateText}>
            {callStateIndicator.text}...
          </div>
          <div className={styles.callStateSymbol} >
            <Icon type={callStateIndicator.icon}/>
          </div>
          <div className={styles.callTime}>
            {callState === CallState.ACTIVE ?
            <Timer
              initialTime={0}
              lastUnit="h"
              timeToUpdate={1000}
              formatValue={x => String(x).padStart(2,'0')}
            >
              <Timer.Hours />:
              <Timer.Minutes />:
              <Timer.Seconds />
            </Timer> : '00:00:00'}
          </div>
          <div className={styles.signalState}>
            <div className={classNames(styles.signalStateSymbol, networkIndicator.className)} />
            {networkIndicator.text}
          </div>
        </div>
        <div className={styles.actionArea}>
          <Button
            round
            type="ghost"
            icon="mic-off"
            onClick={this.toggleMute}
            selected={mute}
          >
            禁麦
          </Button>
          <Button
            round
            type="error"
            className={styles.hangUp}
            onClick={this.stopCall}
          >
            挂断
          </Button>
        </div>
      </div>
    );
  }

  stopCall = () => {
    this.props.stopCall()
  }

  toggleMute = () => {
    const { mute } = this.props
    this.props.setMute(!mute)
    Toast.success({ text: mute ? '麦克风已启用' : '麦克风已禁用', timeout: 1000 })
  }
}

export default StatusBar;
