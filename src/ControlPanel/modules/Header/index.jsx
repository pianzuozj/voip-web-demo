import React, { Component } from "react";
import classNames from "classnames";
import { SessionConsumer } from "../../../SessionContext";
import styles from "./index.module.less";
import { ServiceState } from "../../../constants";

const serviceStateIndicatorMappings = {
  [ServiceState.IDLE]: {
    suffix: "idle",
    text: "未连接"
  },
  [ServiceState.CONNECTING]: {
    suffix: "connecting",
    text: "连接中"
  },
  [ServiceState.AVAILABLE]: {
    suffix: "available",
    text: "已连接"
  },
  [ServiceState.UNAVAILABLE]: {
    suffix: "unavailable",
    text: "离线"
  }
};

class Header extends Component {
  render() {
    const { serviceState } = this.props;
    const indicator = serviceStateIndicatorMappings[serviceState];

    return (
      <header className={styles.demoHeader}>
        <h1>融合通信 Web Demo</h1>
        <div className={styles.state}>
          <div
            className={classNames(
              styles.stateLight,
              styles[`stateLight-${indicator.suffix}`]
            )}
          />
          <div className={styles.stateText}>{indicator.text}</div>
        </div>
      </header>
    );
  }
}

export default () => (
  <SessionConsumer>
    {({ serviceState }) => <Header {...{ serviceState }} />}
  </SessionConsumer>
);
