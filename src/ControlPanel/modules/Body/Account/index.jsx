import React, { Component } from "react";
import styles from "./index.module.less";
import { ServiceState } from "../../../../constants";
import Button from "../../../../components/Button";
import Input from "../../../../components/Input";

const aksk = (window.localStorage.ak || "").split("|");
class Account extends Component {
  state = {
    accessKeyId: aksk[0],
    accessKeySecret: aksk[1],
    userId: aksk[2]
  };

  render() {
    const { accessKeyId, accessKeySecret, userId } = this.state;

    const { serviceState, serviceError, retry, mediaEnabled } = this.props;

    const needRetry = serviceState !== ServiceState.AVAILABLE && retry;

    if (serviceState === ServiceState.AVAILABLE || needRetry) {
      return (
        <div className={styles.demoAccount}>
          <p className={styles.userid}>账号：{this.state.userId}</p>
          {needRetry && (
            <Button
              style={{ width: 100, marginRight: 16 }}
              onClick={this.login}
            >
              重试
            </Button>
          )}
          <Button style={{ width: 100 }} onClick={this.logout}>
            登出
          </Button>
        </div>
      );
    }

    const connecting = serviceState === ServiceState.CONNECTING;

    const formDisabled = connecting || !mediaEnabled;

    return (
      <div className={styles.demoAccount}>
        <form autoComplete="off">
          <ul>
            <li>
              <label>AK:</label>
              <Input
                autoComplete="off"
                disabled={formDisabled}
                secret
                placeholder="请输入AK"
                value={accessKeyId}
                onChange={this.setValueDelegate("accessKeyId")}
              />
            </li>
            <li>
              <label>SK:</label>
              <Input
                autoComplete="off"
                disabled={formDisabled}
                secret
                placeholder="请输入SK"
                value={accessKeySecret}
                onChange={this.setValueDelegate("accessKeySecret")}
              />
            </li>
            <li>
              <label>账号:</label>
              <Input
                autoComplete="off"
                disabled={formDisabled}
                placeholder="请输入账号"
                value={userId}
                onChange={this.setValueDelegate("userId")}
              />
            </li>
            <li>
              <label />
              <Button
                loading={connecting}
                style={{ width: 100 }}
                type="primary"
                onClick={this.login}
                disabled={formDisabled}
              >
                登录
              </Button>
            </li>
          </ul>
          <p className="error-message">
            {serviceError &&
              `${serviceError.code || "UNKNOWN"} ${serviceError.message}`}
          </p>
        </form>
      </div>
    );
  }

  setValueDelegate = target => e => {
    this.setState({ [target]: e.target.value });
  };

  login = () => {
    const { accessKeyId, accessKeySecret, userId } = this.state;
    this.props.login(accessKeyId, accessKeySecret, userId);
  };

  logout = () => {
    this.props.logout();
  };
}

export default Account;
