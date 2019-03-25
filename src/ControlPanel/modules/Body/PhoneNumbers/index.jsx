import React, { Component } from 'react';
import styles from './index.module.less';
import {ServiceState} from '../../../../constants'
import Button from '../../../../components/Button'
import Input from '../../../../components/Input'

const callee = (window.localStorage.callee || '').split('|')
class PhoneNumbers extends Component {
  state = {
    calleeNumber: callee[0],
    showNumber: callee[1],
    enableRecord: false,
  }
  render() {
    const {
      calleeNumber,
      showNumber,
      enableRecord,
    } = this.state
    const { serviceState } = this.props
    const disabled = serviceState !== ServiceState.AVAILABLE
    return (
      <div className={styles.demoPhoneNumber}>
        <form>
          <ul>
            <li>
              <label>主叫号码:</label>
              <Input
                placeholder="请输入主叫号码"
                disabled={disabled}
                value={showNumber}
                onChange={this.setValueDelegate('showNumber')}
              />
            </li>
            <li>
              <label>被叫号码:</label>
              <Input
                placeholder="请输入被叫号码"
                value={calleeNumber}
                disabled={disabled}
                onChange={this.setValueDelegate('calleeNumber')}
              />
            </li>
            <li>
              <label />
              <input
                type="checkbox"
                id="enableRecord"
                checked={enableRecord}
                disabled={disabled}
                onChange={(e) => {
                  this.setState({enableRecord: e.target.checked})
                }}
              />
              <label htmlFor="enableRecord" className={styles.enableRecordLabel}>
                启用录音
              </label>
            </li>
            <li>
              <label />
              <Button
                style={{width: 100}}
                type="primary"
                disabled={disabled}
                onClick={this.startCall}
              >
                呼叫
              </Button>
            </li>
          </ul>
        </form>
      </div>
    )
  }

  setValueDelegate = (target) => (e) => {
    this.setState({ [target]: e.target.value })
  }

  startCall = () => {
    const {
      calleeNumber,
      showNumber,
      enableRecord,
    } = this.state

    // todo: 设置被叫显示名称及头像
    this.props.startCall({
      calleeNumber,
      showNumber,
      calleeName: '杭州胜利五金厂',
      calleeAvatar: '//iconfont.alicdn.com/t/1514189348569.jpg@200h_200w.jpg',
      enableRecord,
    })
  }
}

export default PhoneNumbers
