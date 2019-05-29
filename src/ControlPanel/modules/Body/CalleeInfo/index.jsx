import React, { Component } from "react";
import styles from "./index.module.less";
import { DEVICE_TYPE, ServiceState } from "../../../../constants";
import Button from "../../../../components/Button";
import Input from "../../../../components/Input";

const callee = (window.localStorage.callee || "").split("|");
class PhoneNumbers extends Component {
  state = {
    phoneNumber: callee[0],
    showNumber: callee[1],
    participantRtcId: callee[2] || "",
    enableRecord: false,
    deviceType: DEVICE_TYPE.VOIP
  };

  switchCallType = e => {
    const deviceType = e.target.value;
    this.setState({
      deviceType,
      ...(deviceType === DEVICE_TYPE.VOIP ? { enableRecord: false } : {})
    });
  };

  render() {
    const {
      phoneNumber,
      showNumber,
      participantRtcId,
      enableRecord,
      deviceType
    } = this.state;
    const { serviceState } = this.props;
    const disabled = serviceState !== ServiceState.AVAILABLE;
    const voipDevice = deviceType === DEVICE_TYPE.VOIP;
    return (
      <div className={styles.demoPhoneNumber}>
        <form>
          <dl>
            <dt>
              <span>呼叫PSTN</span>
            </dt>
            <dd>
              <input
                className={styles.selectCallType}
                type="radio"
                id="callTypePSTN"
                name="deviceType"
                value={DEVICE_TYPE.PSTN}
                disabled={disabled}
                onChange={this.switchCallType}
                checked={deviceType === DEVICE_TYPE.PSTN}
              />
              <label htmlFor="callTypePSTN">主叫号码:</label>
              <Input
                placeholder="请输入主叫号码"
                disabled={disabled}
                value={showNumber}
                onChange={this.setValueDelegate("showNumber")}
              />
            </dd>
            <dd>
              <label htmlFor="callTypePSTN" className={styles.calleeNumber}>
                被叫号码:
              </label>
              <Input
                placeholder="请输入被叫号码"
                value={phoneNumber}
                disabled={disabled}
                onChange={this.setValueDelegate("phoneNumber")}
              />
            </dd>
            <dt>
              <span>呼叫VoIP</span>
            </dt>
            <dd>
              <input
                className={styles.selectCallType}
                type="radio"
                id="callTypeVOIP"
                name="deviceType"
                value={DEVICE_TYPE.VOIP}
                disabled={disabled}
                onChange={this.switchCallType}
                checked={deviceType === DEVICE_TYPE.VOIP}
              />
              <label htmlFor="callTypeVOIP">被叫账号:</label>
              <Input
                placeholder="请输入被叫RtcId"
                value={participantRtcId}
                disabled={disabled}
                onChange={this.setValueDelegate("participantRtcId")}
              />
            </dd>
            <dd
              className={
                voipDevice ? styles.notSupportRecord : styles.supportRecord
              }
            >
              <label />
              <input
                type="checkbox"
                id="enableRecord"
                checked={enableRecord}
                disabled={disabled || voipDevice}
                onChange={e => {
                  this.setState({ enableRecord: e.target.checked });
                }}
              />
              <label
                htmlFor="enableRecord"
                className={styles.enableRecordLabel}
              >
                启用录音
              </label>
            </dd>
            <li>
              <label />
              <Button
                style={{ width: 100 }}
                type="primary"
                disabled={disabled}
                onChange={this.switchCallType}
                onClick={this.startCall}
              >
                呼叫
              </Button>
            </li>
          </dl>
        </form>
      </div>
    );
  }

  setValueDelegate = target => e => {
    this.setState({ [target]: e.target.value });
  };

  startCall = () => {
    const {
      phoneNumber,
      showNumber,
      participantRtcId,
      enableRecord,
      deviceType
    } = this.state;

    // todo: 设置被叫显示名称及头像
    this.props.startCall({
      deviceType,
      ...(deviceType === DEVICE_TYPE.PSTN
        ? {
            phoneNumber: phoneNumber,
            showNumber
          }
        : {
            participantRtcId
          }),
      participantName: "杭州胜利五金厂",
      participantAvatar:
        "//iconfont.alicdn.com/t/1514189348569.jpg@200h_200w.jpg",
      enableRecord
    });
  };
}

export default PhoneNumbers;
