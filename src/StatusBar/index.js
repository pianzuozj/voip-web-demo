import React, { Component, Fragment } from "react";
import classNames from "classnames";
import styles from "./index.module.less";
import Timer from "react-compound-timer";
import { CallState, NetworkQuality } from "../constants";
import Button from "../components/Button";
import Icon from "../components/Icon";
import Toast from "../components/Toast";

const CallStateIndicatorMapping = {
  [CallState.IDLE]: {
    className: styles.callState_idle,
    icon: "",
    text: "已断开"
  },
  [CallState.ACTIVE]: {
    className: styles.callState_active,
    icon: "call-active",
    text: "通话中"
  },
  [CallState.CONNECTING]: {
    className: styles.callState_connecting,
    icon: "call-connecting",
    text: "呼叫中"
  },
  [CallState.RINGING]: {
    className: styles.callState_ringing,
    icon: "call-ringing",
    text: "振铃中"
  },
  [CallState.RECEIVING_AUDIO_CALL]: {
    className: styles.callState_oncall,
    icon: "call-ringing",
    text: "呼入中"
  }
};

const networkQualityIndicatorMapping = {
  [NetworkQuality.LOW]: {
    className: styles.signalStateSymbol_low,
    text: "差"
  },
  [NetworkQuality.MEDIUM]: {
    className: styles.signalStateSymbol_medium,
    text: "中"
  },
  [NetworkQuality.HIGH]: {
    className: styles.signalStateSymbol_high,
    text: "优"
  }
};

class StatusBar extends Component {
  state = {
    lastPeerCalling: false,
    lastCallFromPeer: false
  };

  static getDerivedStateFromProps(nextProps, prevState) {
    return {
      lastPeerCalling: nextProps.peerCalling,
      lastCallFromPeer:
        !nextProps.peerCalling &&
        nextProps.callState === CallState.IDLE &&
        prevState.lastPeerCalling
    };
  }

  render() {
    const {
      callState,
      peerCalling,
      participantNumber,
      participantName,
      participantAvatar,
      callerNumber,
      callerName,
      callerAvatar,
      networkQuality,
      mute
    } = this.props;
    const { lastCallFromPeer } = this.state;
    let callStateIndicator = CallStateIndicatorMapping[callState];

    let displayNumber = participantNumber;
    let displayName = participantName;
    let displayAvatar = participantAvatar;
    const callIdle = callState === CallState.IDLE;

    const busyCalling = peerCalling && !callIdle;
    const freeCalling = peerCalling && callIdle;

    if (freeCalling) {
      // 有呼入进来，没有正在通话
      callStateIndicator =
        CallStateIndicatorMapping[CallState.RECEIVING_AUDIO_CALL];
    }

    if (freeCalling || lastCallFromPeer) {
      displayNumber = callerNumber;
      displayName = callerName;
      displayAvatar = callerAvatar;
    }

    const showIncomingCallPanel =
      (peerCalling || lastCallFromPeer) && !busyCalling;

    const networkIndicator = networkQualityIndicatorMapping[networkQuality];
    return (
      <div
        className={classNames(styles.statusBar, {
          [styles.statusBarHide]: callState === CallState.IDLE && !peerCalling,
          [styles.onAudioCall]: showIncomingCallPanel
        })}
      >
        <div className={styles.participant}>
          <img
            className={styles.participantAvatar}
            alt={displayNumber}
            src={displayAvatar}
          />
          <div className={styles.participantCard}>
            <div className={styles.participantName}>{displayNumber}</div>
            <div className={styles.participantNumber}>{displayName}</div>
          </div>
        </div>
        <div
          className={classNames([
            styles.callState,
            callStateIndicator.className
          ])}
        >
          <div className={styles.callStateText}>
            {callStateIndicator.text}...
          </div>
          <div className={styles.callStateSymbol}>
            <Icon type={callStateIndicator.icon} />
          </div>
          <div className={styles.callTime}>
            {callState === CallState.ACTIVE ? (
              <Timer
                initialTime={0}
                lastUnit="h"
                timeToUpdate={1000}
                formatValue={x => String(x).padStart(2, "0")}
              >
                <Timer.Hours />:
                <Timer.Minutes />:
                <Timer.Seconds />
              </Timer>
            ) : (
              "00:00:00"
            )}
          </div>
          <div className={styles.signalState}>
            <div
              className={classNames(
                styles.signalStateSymbol,
                networkIndicator.className
              )}
            />
            {networkIndicator.text}
          </div>
        </div>
        <div className={styles.actionArea}>
          {showIncomingCallPanel && (
            <Fragment>
              <Button
                round
                type="success"
                onClick={this.answerCall}
                disabled={!peerCalling}
              >
                接听
              </Button>
              <Button
                round
                type="error"
                onClick={this.rejectCall}
                disabled={!peerCalling}
              >
                挂断
              </Button>
            </Fragment>
          )}

          {!showIncomingCallPanel && (
            <Fragment>
              <Button
                round
                type="ghost"
                icon="mic-off"
                onClick={this.toggleMute}
                selected={mute}
                disabled={callState === CallState.IDLE}
              >
                禁麦
              </Button>
              <Button
                round
                type="error"
                onClick={this.stopCall}
                disabled={callState === CallState.IDLE}
              >
                挂断
              </Button>
            </Fragment>
          )}
        </div>

        {busyCalling && (
          <div className={styles.incomingCallNotify}>
            <div className={styles.answerCall} onClick={this.answerCall}>
              <span role="img" aria-label="telephone">
                📞
              </span>
              {callerNumber}
            </div>
            <div className={styles.rejectCall} onClick={this.rejectCall}>
              &times;
            </div>
          </div>
        )}
      </div>
    );
  }

  rejectCall = () => {
    this.props.rejectCall();
  };

  ignoreCall = () => {
    this.props.ignoreCall();
  };

  answerCall = () => {
    this.props.answerCall();
  };

  stopCall = () => {
    this.props.stopCall();
  };

  toggleMute = () => {
    const { mute } = this.props;
    this.props.setMute(!mute);
    Toast.success({
      text: mute ? "麦克风已启用" : "麦克风已禁用",
      timeout: 1000
    });
  };
}

export default StatusBar;
