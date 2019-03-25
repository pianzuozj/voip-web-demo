import React, { Component } from 'react'
import classNames from 'classnames'
import { v4 as uuid } from 'uuid'

// 引入VoIP Web SDK，使用typescript
import { AlicomRTC, Errors } from 'aliyun-voip-web-sdk'

import ControlPanel from './ControlPanel'
import StatusBar from './StatusBar'
import getRtcToken from './getRtcToken'
import { CallState, isWebRTCSupported, NetworkQuality, ServiceState, NetworkQualityMapping } from './constants'
import { SessionProvider } from './SessionContext'
import Toast from './components/Toast'
import DebugPanel from './components/DebugPanel'
import './App.less'


// 日志开关，SDK交互日志将会被存储进localStorage中以便排查问题
window.localStorage.__alicom_logs = "on"

// 新个客户端都需要生成新的deviceId
const deviceId = uuid().replace(/-/g,'')

/**
 * 应用组件，实现了以下接口，接口定义请参考
 * @see ~/aliyun-voip-web-sdk/types/index.d.ts
 * @implements AlicomVoIP.ServiceListener
 * @implements AlicomVoIP.TokenUpdater
 * @implements AlicomVoIP.CallListener
 */
class App extends Component {
  state = {
    loginInfo: {}, // 登录信息，记录下来供重新登录使用
    token: false, // 使用登录信息换取的令牌
    serviceState: ServiceState.IDLE, // 服务状态
    callState: ServiceState.IDLE, // 呼叫状态
    calleeNumber: '', // 被叫号码
    networkQuality: NetworkQuality.HIGH, // 网络质量，默认高
    monitorStats: null, // 监控信息
    mute: false, // 是否禁音
    retry: false, // 是否显示重试
    mediaEnabled: false, // 设备可用
  }

  /**
   * 实现{@link AlicomVoIP.TokenUpdater#updateToken}，处理上传Token
   * @param tokenHandler
   */
  updateToken(tokenHandler) {
    console.log('demo: setToken')
    // 获取token
    this.fetchToken()
      .then((token) => {
        tokenHandler.setToken(token)
      })
      .catch(() => {
        console.log('upload token error')
        this.setState({
          serviceState: ServiceState.IDLE
        })

        setTimeout(() => {
          /*
            注意：当使用错误AK登录时，会收到两次Toast错误提示，这里为了使Toast显见，使用setTimeout延时，原因如下：
            1. 点击登录，初始化rtc实例
            2. rtc准备就绪，通知setToken
            3. 客户端setToken失败，导致第一次Toast提示AK信息错误
            4. rtc实例销毁，导致第二次Toast提示rtc实例已销毁local destroy(Errors.ERROR_LOCAL_DESTROY)

            Demo作为技术指引透露基础技术细节，开发者可不对Errors.ERROR_LOCAL_DESTROY作处理
           */
          this.rtc.destroy()
          this.rtc = null
        }, 1000)
      })
  }

  componentDidMount() {
    // 拦截刷新事件，显示通知
    window.onbeforeunload = (e) => {
      if (this.state.callState !== CallState.IDLE) {
        // 此文案受浏览器行为限制，可能不起作用
        const dialogText = '当前正在通话，刷新后将中断通话，是否继续？';
        e.returnValue = dialogText;
        return dialogText;
      }
    }

    // 在页面初始化时先判断是否浏览器是否支持WebRTC
    if (isWebRTCSupported) {
      // 再判断用户是否授权设备权限
      this.tryGetUserMedia().then(()=>{
        this.setState({ mediaEnabled: true })
      }).catch(e => {
        this.setState({ mediaEnabled: false })
        Toast.error({ text: '获取设备权限失败，请允许获取设备权限后继续', timeout: 5000 })
      })
    } else {
      this.setState({ mediaEnabled: false })
      Toast.error({ text: '此浏览器不支持VoIP Web SDK，请尝试使用现代浏览器', timeout: 5000 })
    }
  }

  /**
   * 实现{@link AlicomVoIP.ServiceListener#onServiceAvailable}，设置服务可用状态
   */
  onServiceAvailable() {
    console.warn('onServiceAvailable')
    this.setState({
      serviceState: ServiceState.AVAILABLE,
      recentLoginSuccess: true,
      retry: false,
    })
  }

  /**
   * 实现{@link AlicomVoIP.ServiceListener#onServiceUnavailable}，设置服务不可用状态
   */
  onServiceUnavailable(errCode, errMsg) {
    console.warn('onServiceUnavailable', errCode, errMsg)
    if (errCode) {
      Toast.error(`[${errCode}] ${errMsg}`)
    }
    this.setState({
      serviceState: ServiceState.UNAVAILABLE,
      // 错误码请参阅~/aliyun-voip-sdk/errors
      retry: this.state.recentLoginSuccess && Boolean(errCode) && errCode !== Errors.ERROR_LOCAL_DESTROY,
      token: null,
    })
  }

  /**
   * 实现{@link AlicomVoIP.ServiceListener#onServiceUnavailable}，设置服务未初始化空闲状态
   */
  onServiceIdle(errCode, errMsg) {
    console.warn('onServiceIdle', errCode, errMsg)
    if (errCode) {
      Toast.error(`[${errCode}] ${errMsg}`)
    }
    this.setState({
      serviceState: ServiceState.IDLE,
    })
  }


  /**
   * 获取子组件所需上下文
   */
  getContext() {
    return {
      serviceState: this.state.serviceState,
      callState: this.state.callState,
      calleeNumber: this.state.calleeNumber,
      networkQuality: this.state.networkQuality,
      calleeAvatar: this.state.calleeAvatar,
      calleeName: this.state.calleeName,
      retry: this.state.retry,
      mute: this.state.mute,
      mediaEnabled: this.state.mediaEnabled,
      login: this.login,
      logout: this.logout,
      startCall: this.startCall,
      stopCall: this.stopCall,
      setMute: this.setMute,
    }
  }

  /**
   * 渲染
   */
  render() {
    const context = this.getContext()
    const calling = context.callState !== CallState.IDLE

    return (
      <div className={classNames('app', { 'mask': calling})}>
        <SessionProvider value={context}>
          <ControlPanel/>
          <StatusBar
            callState={context.callState}
            setMute={context.setMute}
            stopCall={context.stopCall}
            calleeNumber={context.calleeNumber}
            calleeName={context.calleeName}
            calleeAvatar={context.calleeAvatar}
            networkQuality={context.networkQuality}
            mute={context.mute}
          />
        </SessionProvider>
        {/* 仅用于调试时，查看参数，便于理解 */}
        <DebugPanel
          style={calling ? { zIndex: 10 } : {}}
          value={{
            '设备ID deviceId': deviceId,
            '媒体可用 mediaEnabled': this.state.mediaEnabled,
            '服务状态 serviceState': this.state.serviceState,
            '呼叫状态 callState': this.state.callState,
            '禁音状态 mute': this.state.mute,
            '网络质量 networkQuality': NetworkQualityMapping[this.state.networkQuality],
            '监控状态 monitorStats': this.state.monitorStats,
            '当前呼叫数据 callInfo': this.callObj && this.callObj.getDebugInfo && this.callObj.getDebugInfo(),
            '令牌 token': this.state.token,
          }}
        />
      </div>
    );
  }

  /**
   * 实现{@link AlicomVoIP.CallListener#onCalleeRinging}，被叫方振铃时触发
   * @param talk
   */
  onCalleeRinging(talk) {
    console.warn('onCalleeRinging')
    this.setState({
      callState: CallState.RINGING
    })
  }

  /**
   * 实现{@link AlicomVoIP.CallListener#onCalleeConnecting}，正在连接时触发
   * @param talk
   */
  onCalleeConnecting(talk) {
    console.warn('onCalleeConnecting')
    this.setState({
      callState: CallState.CONNECTING,
      mute: false,
    })
  }


  /**
   * 实现{@link AlicomVoIP.CallListener#onActive}，正在通话时触发
   * @param talk
   */
  onActive(talk) {
    console.warn('onActive')
    this.setState({
      callState: CallState.ACTIVE
    })
  }

  /**
   * 实现{@link AlicomVoIP.CallListener#onConnected}，通话成功连接到媒体服务器
   * @param talk
   */
  onConnected(talk) {
    console.warn('onConnected')
  }

  /**
   * 实现{@link AlicomVoIP.CallListener#onStopping}，通话正在断开
   * @param errCode
   * @param errMsg
   * @param talk
   */
  onStopping(errCode, errMsg, talk) {
    // 可在收到Stopping反馈时，禁止音频输出
    talk.muteLocalAudio()
    console.warn('onStopping')
    if (errCode) {
      // 错误码及对应内容请查阅：~/aliyun-voip-web-sdk/README.md
      Toast.error({text: `[${errCode}] ${errMsg}`})
    }
  }

  /**
   * 实现{@link AlicomVoIP.CallListener#onStopped}，通话已断开
   * @param errCode
   * @param errMsg
   * @param talk
   */
  onStopped(errCode, errMsg, talk) {
    console.warn('onStopped', errCode, errMsg)
    this.setState({
      callState: CallState.IDLE
    })

    if (errCode) {
      // 错误码及对应内容请查阅：~/aliyun-voip-web-sdk/README.md
      Toast.error({text: `[${errCode}] ${errMsg}`})
    }
  }

  /**
   * 实现{@link AlicomVoIP.CallListener#onStopped}，对端传来DTMF信息，每次回调只传入一个字符，如果是一连串输入的话则会多次回调，需要接入方自行根据时间戳处理
   * @param dtmf 对端传入的DTMF信息
   * @param timestamp 时间戳
   * @param talk 通话对象
   */
  onDtmfData(dtmf, timestamp, talk) {
    console.warn('onDtmfData:', dtmf, timestamp)
    Toast.show({ text: `DTMF: ${dtmf}`, timeout: 1000 })
  }

  /**
   * 实现{@link AlicomVoIP.CallListener#onNetworkQuality}，通话中网络质量消息
   * @param quality 质量
   * @param talk 通话对象
   */
  onNetworkQuality(quality, talk) {
    console.warn('onNetworkQuality')
    this.setState({
      networkQuality: quality,
    })
  }

  /**
   * 实现{@link AlicomVoIP.CallListener#onMediaStatistics}，通话中的监控数据回调
   * @param monitorStats 监控数据
   * @param talk 通话对象
   */
  onMediaStatistics(monitorStats, talk) {
    console.warn('onMediaStatistics')
    this.setState({ monitorStats })
  }

  /**
   * 操作：停止通话
   */
  stopCall = () => {
    this.callObj.stop()
  }

  /**
   * 操作：开始通话
   * @param calleeNumber 被叫号码
   * @param showNumber 主叫号显
   * @param calleeName 被叫方显示姓名（非业务参数，仅作为体验提升）
   * @param calleeAvatar 被叫方显示头像（非业务参数，仅作为体验提升）
   * @param enableRecord 启用服务端录音
   */
  startCall = ({ calleeNumber, showNumber, calleeName, calleeAvatar, enableRecord }) => {
    // 号码前置校验：建议自行提供前置校验以获得最佳体验，SDK中也会以错误码的形式在CallListener.onStopped反馈
    if (!calleeNumber) {
      Toast.error('请输入被叫号码')
      return
    }
    if (!showNumber) {
      Toast.error('请输入主叫号码')
      return
    }

    if (showNumber === calleeNumber) {
      Toast.error('主叫号码不能与主叫号码相同')
      return
    }

    // 创建新VoIP2PstnCall的Call新实例
    const call = this.rtc.createVoIP2PstnCall(showNumber, calleeNumber, '')

    // 设置CallListener，App实例已实现了CallListener接口，可以直接作为参数
    call.setCallListener(this)

    // 是否允许服务端录音，默认不录音
    if (enableRecord) {
      call.setServerRecordEnabled(true)
    }

    // 开始呼叫
    call.start()

    this.callObj = call

    this.setState({
      calleeNumber,
      calleeName,
      calleeAvatar,
    })
  }

  /**
   * 尝试获取设备权限，推荐在页面初始化时就判断
   * @returns {Promise<MediaStream>}
   */
  tryGetUserMedia = () => {
    return navigator.mediaDevices
      .getUserMedia({
        audio: true, // VoIP2Pstn，只需要使用audio
        video: false,
      })
  }

  /**
   * 操作：设置客户端禁音
   * @param mute {boolean} 是否禁音
   */
  setMute = (mute) => {
    if (mute) {
      this.callObj.muteLocalAudio()
    } else {
      this.callObj.unmuteLocalAudio()
    }
    this.setState({ mute })
  }

  /**
   * 操作：使用ak信息登录，请注意：这里仅作为演示，实际业务中，AK/SK换取Token的过程应当由服务端完成
   * @param accessKeyId
   * @param accessKeySecret
   * @param userId
   */
  login = (accessKeyId, accessKeySecret, userId) => {
    if(!accessKeyId || !accessKeySecret || !userId) {
      Toast.error('请正确输入登录信息')
      return
    }

    this.setState({
      loginInfo: {
        accessKeyId,
        accessKeySecret,
        userId
      },
      retry: false,
    }, ()=> {
      // 防止意外，已有AlicomRTC实例先要销毁掉
      if (this.rtc) {
        this.rtc.destroy()
        this.rtc = null
      }

      // 创建新的AlicomRTC实例
      const rtc = new AlicomRTC()

      // 设置ServiceListener，这里App组件已实现了ServiceListener，使用this指代
      rtc.setServiceListener(this)

      // 设置默认呼叫超时时间30秒，之后的每一次呼叫都会使用这个超时时间
      rtc.setDefaultCallTimeout(30)

      // 使用rtcId（userId）初始化
      rtc.initWithRtcId(userId, this)

      this.rtc = rtc
      this.setState({
        serviceState: ServiceState.CONNECTING
      })
    })
  }

  /**
   * 操作：登出
   */
  logout = () => {
    // 防止意外，已有AlicomRTC实例先要销毁掉
    if (this.rtc) {
      this.rtc.destroy()
      this.rtc = null
    }
    if (this.state.retry) {
      this.setState({
        retry: false,
        serviceState: ServiceState.IDLE,
      })
    }
  }

  /**
   * 获取Token，请注意：这里仅作为演示，实际业务中，AK/SK换取Token的过程应当由服务端完成
   * @returns {Promise<*>}
   */
  async fetchToken() {
    const {
      accessKeyId,
      accessKeySecret,
      userId,
    } = this.state.loginInfo || {}

    return new Promise((resolve, reject) => {
      getRtcToken(accessKeyId, accessKeySecret, userId, deviceId)
        .then((token) => {
          this.setState({
            token,
          }, () => {
            resolve(token)
          })
        }).catch(e => {
          Toast.error(`[${e.code || 'UNKNOWN'}]${e.message}`)
          this.setState({
            token: false,
          }, () => {
            reject(e)
          })
        })
    })
  }
}

export default App;
