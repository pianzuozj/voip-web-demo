import React, { Component } from "react";
import classNames from "classnames";
import { v4 as uuid } from "uuid";

// 引入VoIP Web SDK
import { AlicomRTC, Errors } from 'aliyun-voip-web-sdk'

import ControlPanel from "./ControlPanel";
import StatusBar from "./StatusBar";
import getRtcToken from "./getRtcToken";
import {
  CallState,
  isWebRTCSupported,
  NetworkQuality,
  ServiceState,
  NetworkQualityMapping,
  AnswerCallState,
  DEVICE_TYPE
} from "./constants";
import { SessionProvider } from "./SessionContext";
import Toast from "./components/Toast";
import DebugPanel from "./components/DebugPanel";
import "./App.less";

// 日志开关，SDK交互日志将会被存储进localStorage中以便排查问题
window.localStorage.__alicom_logs = "on";

// 新个客户端都需要生成新的deviceId
const deviceId = uuid().replace(/-/g, "");

// 呼叫音
const ringingTone = (() => {
  const r = window.document.createElement("audio");
  r.autoplay = false;
  r.defaultMuted = false;
  r.loop = true;
  return {
    /**
     * 需按融合通信呼叫回调获取被叫方状态，播放不同的铃音
     * @param sound
     */
    play: sound => {
      Toast.success("需按融合通信呼叫回调获取被叫方状态，播放不同的铃音");
      if (sound) {
        r.src = sound;
        r.play();
      }
    },
    /**
     * 停止呼叫音
     */
    stop: () => {
      r.pause();
      r.currentTime = 0;
    }
  };
})();

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
    peerCalling: false, // 当前是否有呼入请求
    answerCallState: AnswerCallState.IDLE, // 回复呼入的状态
    answerCallRecordEnabled: false, // 接听呼入时，是否允许录音
    networkQuality: NetworkQuality.HIGH, // 网络质量，默认高
    monitorStats: null, // 监控信息
    mute: false, // 是否禁音
    retry: false, // 是否显示重试
    mediaEnabled: false, // 设备是否可用

    participantNumber: "", // 被叫或主叫号码
    participantName: "", // 被叫或主叫名称(仅作展示)
    participantAvatar: "", // 被叫或主叫头像(仅作展示)

    callerNumber: "", // 主叫号码
    callerName: "", // 主叫名称(仅作演示)
    callerAvatar: "", // 主叫头像(仅作演示)

    missedList: [] // 漏接的呼入列表
  };

  rtc; // AlicomVoIP.AlicomRTC 实例
  incomingCall; // 接收到的呼入Call实例
  currentCall; // 当前欲进行通话的Call实例

  // region AlicomVoIP.TokenUpdater 接口实现
  /**
   * 实现{@link AlicomVoIP.TokenManager.ITokenUpdater}，处理上传Token
   * @param tokenHandler
   */
  updateToken(tokenHandler) {
    console.log("demo: updateToken");
    // 获取token
    this.fetchToken()
      .then(token => {
        tokenHandler.setToken(token);
      })
      .catch(() => {
        console.log("upload token error");
        this.setState({
          serviceState: ServiceState.IDLE
        });

        if (this.rtc) {
          setTimeout(() => {
            /*
              注意：当使用错误AK登录时，会收到两次Toast错误提示，这里为了使Toast显见，使用setTimeout延时，原因如下：
              1. 点击登录，初始化rtc实例
              2. rtc准备就绪，通知setToken
              3. 客户端setToken失败，导致第一次Toast提示AK信息错误
              4. rtc实例销毁，导致第二次Toast提示rtc实例已销毁local destroy(Errors.ERROR_LOCAL_DESTROY)

              Demo作为技术指引透露基础技术细节，开发者可不对Errors.ERROR_LOCAL_DESTROY作处理
             */
            this.rtc.destroy();
            this.rtc = null;
          }, 1000);
        }
      });
  }

  // endregion

  // region AlicomVoIP.ServiceListener 接口实现

  /**
   * 实现{@link AlicomVoIP.ServiceListener.onServiceAvailable}，设置服务可用状态
   */
  onServiceAvailable() {
    console.warn("onServiceAvailable");
    this.setState({
      serviceState: ServiceState.AVAILABLE,
      recentLoginSuccess: true,
      retry: false
    });
  }

  /**
   * 实现{@link AlicomVoIP.ServiceListener.onServiceUnavailable}，设置服务不可用状态
   */
  onServiceUnavailable(errCode, errMsg) {
    console.warn("onServiceUnavailable", errCode, errMsg);
    if (errCode) {
      Toast.error(`[${errCode}] ${errMsg}`);
    }
    this.setState({
      serviceState: ServiceState.UNAVAILABLE,
      // 错误码请参阅~/aliyun-voip-sdk/errors
      retry:
        this.state.recentLoginSuccess &&
        Boolean(errCode) &&
        errCode !== Errors.ERROR_LOCAL_DESTROY,
      token: null
    });
  }

  /**
   * 收到点对点音频来电
   * @param call 表示这通来电的call实例
   */
  onReceivingAudioCall = call => {
    console.warn("onReceivingAudioCall", call);

    //  已有呼入的情况下拒绝掉新呼入
    if (this.incomingCall) {
      call.stop();
      this.addMissedCall(call, "BUSY");
      return;
    }

    // 可根据实际需求播放振铃音
    Toast.success("可根据实际需求在此播放振铃音");

    // 设置CallListener，App实例已实现了CallListener接口，可以直接作为参数
    call.setCallListener(this);

    this.incomingCall = call;

    // todo: 如果已经有正在进行的通话，则不设置participant信息

    const peer = call.getPeer(); // 获取主叫方信息
    this.setState({
      peerCalling: true,
      callerNumber: peer.isPstn ? peer.phoneNumber : peer.rtcId,
      callerName: "杭州胜利五金厂",
      callerAvatar: "//iconfont.alicdn.com/t/1514189348569.jpg@200h_200w.jpg"
    });
  };

  clearMissedCall = () => {
    this.setState({
      missedList: []
    });
  };

  addMissedCall = (call, state) => {
    const peer = call.getPeer();
    this.setState({
      missedList: [
        ...this.state.missedList,
        {
          time: new Date().toUTCString().replace(/^.+\s(\d{2}:\d{2}).+$/, "$1"),
          number: peer.isPstn ? peer.phoneNumber : peer.rtcId,
          state: state
        }
      ]
    });
  };

  /**
   * 实现{@link AlicomVoIP.ServiceListener.onServiceUnavailable}，设置服务未初始化空闲状态
   */
  onServiceIdle(errCode, errMsg) {
    console.warn("onServiceIdle", errCode, errMsg);
    if (errCode) {
      Toast.error(`[${errCode}] ${errMsg}`);
    }
    this.setState({
      serviceState: ServiceState.IDLE
    });
  }

  // endregion

  // region AlicomVoIP.CallListener 接口实现

  /**
   * 实现{@link AlicomVoIP.CallListener.onCalleeRinging}，被叫方振铃时触发
   * @param talk
   */
  onCalleeRinging(talk) {
    console.warn("onCalleeRinging");
    // 处理主叫或通话中
    if (talk === this.currentCall) {
      this.setState({
        callState: CallState.RINGING
      });
    }
  }

  /**
   * 实现{@link AlicomVoIP.CallListener.onCalleeConnecting}，正在连接时触发
   * @param talk
   */
  onCalleeConnecting(talk) {
    console.warn("onCalleeConnecting");
    // 处理主叫或通话中
    if (talk === this.currentCall) {
      this.setState({
        callState: CallState.CONNECTING,
        mute: false
      });

      // VoIP呼叫
      if (!talk.getPeer().isPstn) {
        // 放呼叫音
        ringingTone.play();
      }
    }
  }

  /**
   * 实现{@link AlicomVoIP.CallListener.onActive}，正在通话时触发
   * @param talk
   */
  onActive(talk) {
    console.warn("onActive");
    ringingTone.stop();
    // 处理主叫或通话中
    if (talk === this.currentCall) {
      this.setState({
        callState: CallState.ACTIVE
      });
    }
  }

  /**
   * 实现{@link AlicomVoIP.CallListener.onConnected}，通话成功连接到媒体服务器
   * @param talk
   */
  onConnected(talk) {
    console.warn("onConnected");
    // 处理主叫或通话中
    if (talk === this.currentCall) {
    }
  }

  /**
   * 实现{@link AlicomVoIP.CallListener.onStopping}，通话正在断开
   * @param errCode
   * @param errMsg
   * @param talk
   */
  onStopping(errCode, errMsg, talk) {
    console.warn("onStopping");
    ringingTone.stop();
    // 处理主叫或通话中
    if (talk === this.currentCall) {
      // 可在收到Stopping反馈时，禁止音频输出
      talk.muteLocalAudio();
    }
    if (errCode) {
      // 错误码及对应内容请查阅：~/aliyun-voip-web-sdk/README.md
      Toast.error({ text: `[${errCode}] ${errMsg}` });
    }
  }

  /**
   * 实现{@link AlicomVoIP.CallListener.onStopped}，通话已断开
   * @param errCode
   * @param errMsg
   * @param talk
   */
  onStopped(errCode, errMsg, talk) {
    console.warn("onStopped", errCode, errMsg, talk);
    ringingTone.stop();
    // 处理主叫或通话中
    if (talk === this.currentCall) {
      this.currentCall = null;

      if (
        this.state.peerCalling &&
        this.state.answerCallState !== AnswerCallState.IDLE
      ) {
        // 来电状态，挂掉之前的通话，不会触发改变
        this.doAnswerReceivingCall();
      } else {
        this.setState({
          callState: CallState.IDLE
        });
      }
    } else if (talk === this.incomingCall) {
      // 正在通话中，有呼入的第一通来电；或未在通话中，有呼入的第一通来电
      if (
        errCode === Errors.ERROR_CALLEE_ALERTING_TIMEOUT ||
        errCode === Errors.ERROR_REMOTE_CANCEL
      ) {
        this.addMissedCall(talk, "TIMEOUT");
      }

      this.incomingCall = null;
      this.setState({
        peerCalling: false
      });
    }

    if (errCode) {
      // 错误码及对应内容请查阅：~/aliyun-voip-web-sdk/README.md
      Toast.error({ text: `[${errCode}] ${errMsg}` });
    }
  }

  /**
   * 实现{@link AlicomVoIP.CallListener.onStopped}，对端传来DTMF信息，每次回调只传入一个字符，如果是一连串输入的话则会多次回调，需要接入方自行根据时间戳处理
   * @param dtmf 对端传入的DTMF信息
   * @param timestamp 时间戳
   * @param talk 通话对象
   */
  onDtmfData(dtmf, timestamp, talk) {
    // 处理主叫或通话中
    if (talk === this.currentCall) {
      console.warn("onDtmfData:", dtmf, timestamp);
      Toast.show({ text: `DTMF: ${dtmf}`, timeout: 1000 });
    }
  }

  /**
   * 实现{@link AlicomVoIP.CallListener.onNetworkQuality}，通话中网络质量消息
   * @param quality 质量
   * @param talk 通话对象
   */
  onNetworkQuality(quality, talk) {
    // 处理主叫或通话中
    if (talk === this.currentCall) {
      console.warn("onNetworkQuality");
      this.setState({
        networkQuality: quality
      });
    }
  }

  /**
   * 实现{@link AlicomVoIP.CallListener.onMediaStatistics}，通话中的监控数据回调
   * @param monitorStats 监控数据
   * @param talk 通话对象
   */
  onMediaStatistics(monitorStats, talk) {
    // 处理主叫或通话中
    if (talk === this.currentCall) {
      console.warn("onMediaStatistics");
      this.setState({ monitorStats });
    }
  }

  // endregion

  // region React 生命周期相关
  componentDidMount() {
    // 拦截刷新事件，显示通知
    window.onbeforeunload = e => {
      if (this.state.callState !== CallState.IDLE) {
        // 此文案受浏览器行为限制，可能不起作用
        // 请参见：https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeunload_event
        const dialogText = "当前正在通话，刷新后将中断通话，是否继续？";
        e.returnValue = dialogText;
        return dialogText;
      }
    };

    // 在页面初始化时先判断是否浏览器是否支持WebRTC
    if (isWebRTCSupported) {
      // 再判断用户是否授权设备权限
      this.tryGetUserMedia()
        .then(() => {
          this.setState({ mediaEnabled: true });
        })
        .catch(e => {
          this.setState({ mediaEnabled: false });
          Toast.error({
            text: "获取设备权限失败，请允许获取设备权限后继续",
            timeout: 5000
          });
        });
    } else {
      this.setState({ mediaEnabled: false });
      Toast.error({
        text: "此浏览器不支持VoIP Web SDK，请尝试使用现代浏览器",
        timeout: 5000
      });
    }
  }

  /**
   * 获取子组件所需上下文
   */
  getContext() {
    const { loginInfo, token, ...states } = this.state;

    const {
      login,
      logout,
      setMute,
      startCall,
      stopCall,
      answerCall,
      rejectCall,
      ignoreCall
    } = this;

    return {
      login,
      logout,
      setMute,
      startCall,
      stopCall,
      answerCall,
      rejectCall,
      ignoreCall,
      ...states
    };
  }

  /**
   * 仅用于调试时，查看参数，便于理解
   */
  renderDebugPanel() {
    const {
      mediaEnabled,
      serviceState,
      callState,
      peerCalling,
      mute,
      networkQuality,
      monitorStats,
      token
    } = this.state;
    const calling = callState !== CallState.IDLE;
    const call = this.currentCall;

    let callInfo;
    if (call && call.getDebugInfo) {
      callInfo = call.getDebugInfo();
    }

    return (
      <DebugPanel
        style={calling ? { zIndex: 10 } : {}}
        value={{
          "设备ID deviceId": deviceId,
          "媒体可用 mediaEnabled": mediaEnabled,
          "服务状态 serviceState": serviceState,
          "呼叫状态 callState": callState,
          "呼入状态 peerCalling": peerCalling,
          "禁音状态 mute": mute,
          "网络质量 networkQuality": NetworkQualityMapping[networkQuality],
          "监控状态 monitorStats": monitorStats,
          "当前呼叫数据 callInfo": callInfo,
          "令牌 token": token
        }}
      />
    );
  }

  /**
   * 渲染
   */
  render() {
    const context = this.getContext();
    const calling = context.callState !== CallState.IDLE;

    return (
      <div className={classNames("app", { mask: calling })}>
        <SessionProvider value={context}>
          <ControlPanel />
          <StatusBar {...context} />
        </SessionProvider>
        {this.renderDebugPanel()}
      </div>
    );
  }

  // endregion

  // region 交互事件相关
  /**
   * 操作：停止通话
   * @see onStopping
   * @see onStopped
   */
  stopCall = () => {
    console.warn("stopCall");
    // 对端正在呼叫本端，拒绝接听
    if (this.currentCall) {
      this.currentCall.stop();
    }
  };

  /**
   * 操作：开始通话
   * @param deviceType 被叫设备类型
   * @param phoneNumber 被叫号码
   * @param showNumber 主叫号显
   * @param rtcId 被叫rtcId
   * @param participantName 被叫方显示姓名（非业务参数，仅作为体验提升）
   * @param participantAvatar 被叫方显示头像（非业务参数，仅作为体验提升）
   * @param enableRecord 启用服务端录音
   */
  startCall = ({
    deviceType,
    phoneNumber,
    showNumber,
    participantRtcId,
    participantName,
    participantAvatar,
    enableRecord
  } = {}) => {
    console.warn("startCall");
    // 号码前置校验：建议自行提供前置校验以获得最佳体验，SDK中也会以错误码的形式在CallListener.onStopped反馈

    let call;
    let participantNumber;
    if (deviceType === DEVICE_TYPE.PSTN) {
      if (!phoneNumber) {
        Toast.error("请输入被叫号码");
        return;
      }

      if (!showNumber) {
        Toast.error("请输入主叫号码");
        return;
      }

      if (showNumber === phoneNumber) {
        Toast.error("被叫号码不能与主叫号码相同");
        return;
      }
      participantNumber = phoneNumber;
      // 创建新VoIP2PstnCall的Call新实例
      call = this.rtc.createVoIP2PstnCall(showNumber, phoneNumber, "");
    } else if (deviceType === DEVICE_TYPE.VOIP) {
      if (!participantRtcId) {
        Toast.error("请输入被叫账号");
        return;
      }

      if (participantRtcId === this.state.loginInfo.userId) {
        Toast.error("被叫账号不能与主叫账号相同");
        return;
      }

      participantNumber = participantRtcId;
      // 创建新VoIP2VoIPCall的Call新实例
      call = this.rtc.createVoIP2VoIPCall(participantRtcId, "");
    } else {
      throw new Error("不支持的被叫设备类型");
    }

    // 设置CallListener，App实例已实现了CallListener接口，可以直接作为参数
    call.setCallListener(this);

    // 是否允许服务端录音，默认不录音
    if (enableRecord) {
      call.setServerRecordEnabled(true);
    }
    // 开始呼叫
    call.start();

    this.currentCall = call;

    this.setState({
      participantNumber,
      participantName,
      participantAvatar
    });
  };

  /**
   * 处理接听呼入的交互
   * @see doAnswerReceivingCall
   * @see stopCall
   * @see onStopped
   * @param enableRecord 启用录音
   */
  answerCall = ({ enableRecord } = {}) => {
    console.warn("answerCall");
    // 仅允许有呼入时接听呼入来电
    if (this.state.peerCalling) {
      this.setState(
        {
          answerCallRecordEnabled: enableRecord,
          answerCallState: AnswerCallState.ALLOW // 设置接听状态ALLOW，允许接听
        },
        () => {
          if (this.currentCall) {
            // 如果已有通话，则停止当前通话，当当前通话停止后，会根据peerCalling及answerCallState来判断是否接听呼入来电
            this.stopCall();
          } else {
            this.doAnswerReceivingCall(); // 如果没有已有的通话，直接接听呼入来电
          }
        }
      );
    }
  };

  /**
   * 回复接听呼入来电
   */
  doAnswerReceivingCall() {
    console.warn("doAnswerReceivingCall");
    this.setState(
      {
        peerCalling: false, // 设置呼入来电标记为false，处理接听
        callState: CallState.CONNECTING, // 设置呼叫状态为连接中
        answerCallState: AnswerCallState.IDLE
      },
      () => {
        const call = this.incomingCall; // 取得呼入call实例

        // 设置CallListener，App实例已实现了CallListener接口，可以直接作为参数
        call.setCallListener(this);

        // 是否允许服务端录音，默认不录音
        if (this.state.answerCallRecordEnabled) {
          call.setServerRecordEnabled(true);
        }

        call.start(); // 开始连接并通话

        this.currentCall = call;

        this.incomingCall = null; // 呼入call转为通话中的call

        const { callerNumber, callerName, callerAvatar } = this.state;

        this.setState({
          participantNumber: callerNumber,
          participantName: callerName,
          participantAvatar: callerAvatar
        });
      }
    );
  }

  /**
   * 拒绝接听呼入来电
   */
  rejectCall = () => {
    console.warn("rejectCall");
    this.setState(
      {
        peerCalling: false,
        answerCallState: AnswerCallState.IDLE
      },
      () => {
        const call = this.incomingCall;
        call.stop();
      }
    );
  };

  /**
   * 尝试获取设备权限，推荐在页面初始化时就判断
   * @returns {Promise<MediaStream>}
   */
  tryGetUserMedia = () => {
    return navigator.mediaDevices.getUserMedia({
      audio: true, // VoIP2Pstn，只需要使用audio
      video: false
    });
  };

  /**
   * 操作：设置客户端禁音
   * @param mute {boolean} 是否禁音
   */
  setMute = mute => {
    if (mute) {
      this.currentCall.muteLocalAudio();
    } else {
      this.currentCall.unmuteLocalAudio();
    }
    this.setState({ mute });
  };
  // endregion

  // region 登入登出及令牌相关
  /**
   * 操作：使用ak信息登录，请注意：这里仅作为演示，实际业务中，AK/SK换取Token的过程应当由服务端完成
   * @param accessKeyId
   * @param accessKeySecret
   * @param userId
   */
  login = (accessKeyId, accessKeySecret, userId) => {
    if (!accessKeyId || !accessKeySecret || !userId) {
      Toast.error("请正确输入登录信息");
      return;
    }

    this.setState(
      {
        loginInfo: {
          accessKeyId,
          accessKeySecret,
          userId
        },
        retry: false
      },
      () => {
        // 防止意外，已有AlicomRTC实例先要销毁掉
        if (this.rtc) {
          this.rtc.destroy();
          this.rtc = null;
        }

        // 创建新的AlicomRTC实例
        const rtc = new AlicomRTC();

        // 设置ServiceListener，这里App组件已实现了ServiceListener，使用this指代
        rtc.setServiceListener(this);

        // 设置默认呼叫超时时间45秒，也可以设置自定义超时时间，每一次呼叫都会使用这个超时时间
        // rtc.setDefaultCallTimeout(30);

        // 使用rtcId（userId）初始化
        rtc.initWithRtcId(userId, this);

        this.rtc = rtc;
        this.setState({
          serviceState: ServiceState.CONNECTING
        });
      }
    );
  };

  /**
   * 操作：登出
   */
  logout = () => {
    // 防止意外，已有AlicomRTC实例先要销毁掉
    if (this.rtc) {
      this.rtc.destroy();
      this.rtc = null;
    }
    if (this.state.retry) {
      this.setState({
        retry: false,
        serviceState: ServiceState.IDLE
      });
    } else {
      this.clearMissedCall();
    }
  };

  /**
   * 获取Token，请注意：这里仅作为演示，实际业务中，AK/SK换取Token的过程应当由服务端完成
   * @returns {Promise<*>}
   */
  async fetchToken() {
    const { accessKeyId, accessKeySecret, userId } = this.state.loginInfo || {};

    return new Promise((resolve, reject) => {
      getRtcToken(accessKeyId, accessKeySecret, userId, deviceId)
        .then(token => {
          this.setState(
            {
              token
            },
            () => {
              resolve(token);
            }
          );
        })
        .catch(e => {
          Toast.error(`[${e.code || "UNKNOWN"}]${e.message}`);
          this.setState(
            {
              token: false
            },
            () => {
              reject(e);
            }
          );
        });
    });
  }
  // endregion
}

export default App;
